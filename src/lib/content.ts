import { PublishStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const publishedFilter = { status: "PUBLISHED" as PublishStatus };

export async function getPrimaryLearningPath(opts?: { forStudent?: boolean }) {
  return prisma.learningPath.findFirst({
    where: opts?.forStudent ? publishedFilter : undefined,
    orderBy: { sortOrder: "asc" },
    include: {
      courses: {
        where: opts?.forStudent ? publishedFilter : undefined,
        orderBy: { sortOrder: "asc" },
        include: {
          modules: {
            where: opts?.forStudent ? publishedFilter : undefined,
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                where: opts?.forStudent ? publishedFilter : undefined,
                orderBy: { sortOrder: "asc" },
                include: {
                  activities: {
                    where: opts?.forStudent ? publishedFilter : undefined,
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getPublishedLesson(lessonId: string) {
  return prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "PUBLISHED",
      module: { status: "PUBLISHED", course: { status: "PUBLISHED", learningPath: { status: "PUBLISHED" } } },
    },
    include: {
      module: {
        include: {
          course: {
            include: { learningPath: true },
          },
        },
      },
      activities: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
      },
      resources: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listCoursesForAdmin() {
  return prisma.course.findMany({
    orderBy: [{ learningPath: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      learningPath: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { lessons: true } },
        },
      },
      _count: { select: { modules: true } },
    },
  });
}

export async function getCourseTree(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      learningPath: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              activities: { orderBy: { sortOrder: "asc" } },
              resources: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });
}

export type ContentCreateInput = {
  title: string;
  description?: string | null;
  sortOrder?: number;
};

export async function ensureEnrollment(userId: string, learningPathId: string) {
  return prisma.enrollment.upsert({
    where: {
      userId_learningPathId: { userId, learningPathId },
    },
    update: {},
    create: { userId, learningPathId },
  });
}

export function studentVisibleWhere(): Prisma.LessonWhereInput {
  return {
    status: "PUBLISHED",
    module: {
      status: "PUBLISHED",
      course: {
        status: "PUBLISHED",
        learningPath: { status: "PUBLISHED" },
      },
    },
  };
}
