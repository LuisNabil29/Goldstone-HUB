import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { instructorCourseFilter } from "@/lib/assignments";
import { Card, PageHeader, StatusBadge, PrimaryButton } from "@/components/ui/primitives";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateCourseForm } from "./create-course-form";

export default async function AdminCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const filter = await instructorCourseFilter(session.user.id, session.user.role);
  const courses = await prisma.course.findMany({
    where: filter,
    orderBy: { sortOrder: "asc" },
    include: {
      learningPath: true,
      _count: { select: { modules: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Cursos"
        subtitle="Crea, edita y publica cursos, módulos y lecciones."
      />

      {session.user.role === "ADMIN" ? (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Nuevo curso</h2>
          <CreateCourseForm />
        </Card>
      ) : null}

      <div className="space-y-4">
        {courses.map((course) => (
          <Card key={course.id} className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <StatusBadge status={course.status} />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {course.learningPath.title} · {course._count.modules} módulos
              </p>
            </div>
            <PrimaryButton href={`/admin/cursos/${course.id}`}>Abrir</PrimaryButton>
          </Card>
        ))}
        {courses.length === 0 ? (
          <Card>
            <p className="text-text-secondary">No hay cursos asignados.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
