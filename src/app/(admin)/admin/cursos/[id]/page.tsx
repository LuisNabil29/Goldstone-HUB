import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canInstructorEdit } from "@/lib/assignments";
import { Card, PageHeader, StatusBadge, SecondaryButton } from "@/components/ui/primitives";
import { notFound, redirect } from "next/navigation";
import { CourseEditor } from "./course-editor";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const allowed = await canInstructorEdit(session.user.id, session.user.role, "COURSE", id);
  if (!allowed) redirect("/admin/cursos");

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      learningPath: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { activities: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!course) notFound();

  return (
    <div>
      <PageHeader
        title={course.title}
        subtitle={course.learningPath.title}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={course.status} />
            <SecondaryButton href="/admin/cursos">Volver</SecondaryButton>
          </div>
        }
      />
      <CourseEditor
        course={JSON.parse(JSON.stringify(course))}
        canPublish={session.user.role === "ADMIN"}
      />
    </div>
  );
}
