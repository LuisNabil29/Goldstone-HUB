import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import { InviteUserForm, ToggleActiveButton } from "./invite-form";

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/admin");

  const [users, paths, courses] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enrollments: { include: { learningPath: true } },
        instructorAssignments: true,
      },
    }),
    prisma.learningPath.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.course.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Alumnos e instructores"
        subtitle="Invita usuarios, activa o desactiva accesos e inscribe en la ruta."
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Invitar usuario</h2>
        <InviteUserForm
          paths={paths.map((p) => ({ id: p.id, title: p.title }))}
          courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        />
      </Card>
      <Card>
        <ul className="divide-y divide-border">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">
                  {user.name}{" "}
                  <span className="text-xs text-text-muted">({user.role})</span>
                </p>
                <p className="text-sm text-text-muted">{user.email}</p>
                <p className="text-xs text-text-muted">
                  {user.enrollments[0]?.learningPath.title ??
                    (user.instructorAssignments.length
                      ? `${user.instructorAssignments.length} asignación(es)`
                      : "Sin inscripción")}
                </p>
              </div>
              <ToggleActiveButton userId={user.id} active={user.active} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
