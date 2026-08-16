import { AssignmentScope, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getInstructorAssignments(userId: string) {
  return prisma.instructorAssignment.findMany({ where: { userId } });
}

export async function canInstructorEdit(
  userId: string,
  role: UserRole,
  scope: AssignmentScope,
  scopeId: string
): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (role !== "INSTRUCTOR") return false;

  const assignments = await getInstructorAssignments(userId);
  if (assignments.some((a) => a.scope === scope && a.scopeId === scopeId)) {
    return true;
  }

  if (scope === "MODULE") {
    const module = await prisma.module.findUnique({
      where: { id: scopeId },
      select: { courseId: true },
    });
    if (
      module &&
      assignments.some((a) => a.scope === "COURSE" && a.scopeId === module.courseId)
    ) {
      return true;
    }
  }

  if (scope === "RESOURCE") {
    const resource = await prisma.resource.findUnique({
      where: { id: scopeId },
      select: { lessonId: true },
    });
    if (resource?.lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: resource.lessonId },
        select: { moduleId: true, module: { select: { courseId: true } } },
      });
      if (lesson) {
        if (
          assignments.some(
            (a) =>
              (a.scope === "MODULE" && a.scopeId === lesson.moduleId) ||
              (a.scope === "COURSE" && a.scopeId === lesson.module.courseId)
          )
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

export async function instructorCourseFilter(userId: string, role: UserRole) {
  if (role === "ADMIN") return undefined;
  const assignments = await getInstructorAssignments(userId);
  const courseIds = assignments.filter((a) => a.scope === "COURSE").map((a) => a.scopeId);
  const moduleIds = assignments.filter((a) => a.scope === "MODULE").map((a) => a.scopeId);
  const modules = moduleIds.length
    ? await prisma.module.findMany({ where: { id: { in: moduleIds } }, select: { courseId: true } })
    : [];
  const ids = [...new Set([...courseIds, ...modules.map((m) => m.courseId)])];
  return { id: { in: ids } };
}
