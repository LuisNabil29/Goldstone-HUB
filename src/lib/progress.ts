import { prisma } from "@/lib/prisma";
import { getPrimaryLearningPath } from "@/lib/content";

export type NextAction =
  | {
      type: "lesson";
      lessonId: string;
      lessonTitle: string;
      moduleTitle: string;
      courseTitle: string;
      href: string;
    }
  | {
      type: "activity";
      activityId: string;
      activityTitle: string;
      lessonId: string;
      lessonTitle: string;
      href: string;
    }
  | { type: "none" };

export async function getStudentDashboard(userId: string) {
  const path = await getPrimaryLearningPath({ forStudent: true });
  if (!path) {
    return {
      path: null,
      percent: 0,
      completedLessons: 0,
      totalLessons: 0,
      completedActivities: 0,
      totalActivities: 0,
      estimatedHoursRemaining: 0,
      nextAction: { type: "none" } as NextAction,
      pendingActivities: [] as Array<{
        id: string;
        title: string;
        lessonTitle: string;
        href: string;
      }>,
      nextLessonProgress: null as null | {
        lessonId: string;
        title: string;
        percent: number;
        label: string;
      },
    };
  }

  const lessons = path.courses.flatMap((c) =>
    c.modules.flatMap((m) =>
      m.lessons.map((l) => ({
        ...l,
        moduleTitle: m.title,
        courseTitle: c.title,
        moduleId: m.id,
      }))
    )
  );

  const activities = lessons.flatMap((l) =>
    l.activities.map((a) => ({
      ...a,
      lessonTitle: l.title,
      lessonId: l.id,
    }))
  );

  const [lessonProgress, activityCompletions, moduleCompletions] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId } }),
    prisma.activityCompletion.findMany({ where: { userId } }),
    prisma.moduleCompletion.findMany({ where: { userId } }),
  ]);

  const completedLessonIds = new Set(
    lessonProgress.filter((p) => p.completed).map((p) => p.lessonId)
  );
  const completedActivityIds = new Set(activityCompletions.map((c) => c.activityId));

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => completedLessonIds.has(l.id)).length;
  const totalActivities = activities.length;
  const completedActivities = activities.filter((a) => completedActivityIds.has(a.id)).length;

  const percent =
    totalLessons + totalActivities === 0
      ? 0
      : ((completedLessons + completedActivities) / (totalLessons + totalActivities)) * 100;

  const remainingMinutes = lessons
    .filter((l) => !completedLessonIds.has(l.id))
    .reduce((sum, l) => sum + (l.estimatedMinutes ?? 30), 0);

  const pendingActivities = activities
    .filter((a) => !completedActivityIds.has(a.id))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      lessonTitle: a.lessonTitle,
      href: `/mi-ruta/lecciones/${a.lessonId}`,
    }));

  let nextAction: NextAction = { type: "none" };
  for (const lesson of lessons) {
    if (!completedLessonIds.has(lesson.id)) {
      nextAction = {
        type: "lesson",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleTitle: lesson.moduleTitle,
        courseTitle: lesson.courseTitle,
        href: `/mi-ruta/lecciones/${lesson.id}`,
      };
      break;
    }
    const pendingInLesson = lesson.activities.find((a) => !completedActivityIds.has(a.id));
    if (pendingInLesson) {
      nextAction = {
        type: "activity",
        activityId: pendingInLesson.id,
        activityTitle: pendingInLesson.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        href: `/mi-ruta/lecciones/${lesson.id}`,
      };
      break;
    }
  }

  let nextLessonProgress = null;
  if (nextAction.type === "lesson" || nextAction.type === "activity") {
    const lessonId = nextAction.lessonId;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (lesson) {
      const total = Math.max(1, lesson.activities.length + 1);
      const done =
        (completedLessonIds.has(lesson.id) ? 1 : 0) +
        lesson.activities.filter((a) => completedActivityIds.has(a.id)).length;
      nextLessonProgress = {
        lessonId: lesson.id,
        title: lesson.title,
        percent: (done / total) * 100,
        label: `Lección en ${lesson.moduleTitle}`,
      };
    }
  }

  return {
    path,
    percent,
    completedLessons,
    totalLessons,
    completedActivities,
    totalActivities,
    estimatedHoursRemaining: Math.max(1, Math.round(remainingMinutes / 60)) || 0,
    nextAction,
    pendingActivities,
    nextLessonProgress,
    moduleCompletions,
  };
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "PUBLISHED",
    },
    include: {
      activities: { where: { status: "PUBLISHED", required: true } },
      module: true,
    },
  });

  if (!lesson) {
    throw new Error("Lección no encontrada");
  }

  const completions = await prisma.activityCompletion.findMany({
    where: {
      userId,
      activityId: { in: lesson.activities.map((a) => a.id) },
    },
  });

  const completedIds = new Set(completions.map((c) => c.activityId));
  const missingRequired = lesson.activities.filter((a) => !completedIds.has(a.id));
  if (missingRequired.length > 0) {
    throw new Error("Completa las actividades obligatorias antes de marcar la lección");
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
  });

  await maybeCompleteModule(userId, lesson.moduleId);
  return { ok: true };
}

export async function markActivityComplete(userId: string, activityId: string) {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, status: "PUBLISHED" },
    include: { lesson: true },
  });
  if (!activity) {
    throw new Error("Actividad no encontrada");
  }

  await prisma.activityCompletion.upsert({
    where: { userId_activityId: { userId, activityId } },
    update: {},
    create: { userId, activityId },
  });

  await maybeCompleteModule(userId, activity.lesson.moduleId);
  return { ok: true };
}

export async function maybeCompleteModule(userId: string, moduleId: string) {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        where: { status: "PUBLISHED" },
        include: {
          activities: { where: { status: "PUBLISHED", required: true } },
        },
      },
    },
  });

  if (!module || module.status !== "PUBLISHED") return false;

  const requiredActivityIds = module.lessons.flatMap((l) => l.activities.map((a) => a.id));
  const lessonIds = module.lessons.map((l) => l.id);

  const [activityCompletions, lessonProgress] = await Promise.all([
    prisma.activityCompletion.findMany({
      where: { userId, activityId: { in: requiredActivityIds } },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
    }),
  ]);

  const activitiesDone = activityCompletions.length >= requiredActivityIds.length;
  const lessonsDone = lessonProgress.length >= lessonIds.length;

  if (!activitiesDone || !lessonsDone) {
    return false;
  }

  await prisma.moduleCompletion.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: {},
    create: { userId, moduleId },
  });

  return true;
}

export async function canCompleteModule(userId: string, moduleId: string) {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        where: { status: "PUBLISHED" },
        include: {
          activities: { where: { status: "PUBLISHED", required: true } },
        },
      },
    },
  });
  if (!module) return { canComplete: false, missing: [] as string[] };

  const requiredActivityIds = module.lessons.flatMap((l) => l.activities.map((a) => a.id));
  const completions = await prisma.activityCompletion.findMany({
    where: { userId, activityId: { in: requiredActivityIds } },
  });
  const done = new Set(completions.map((c) => c.activityId));
  const missing = module.lessons
    .flatMap((l) => l.activities)
    .filter((a) => !done.has(a.id))
    .map((a) => a.title);

  return { canComplete: missing.length === 0, missing };
}
