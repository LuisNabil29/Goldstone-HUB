import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import { redirect } from "next/navigation";

export default async function AdminResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/admin");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    include: {
      enrollments: { include: { learningPath: true } },
      lessonProgress: { where: { completed: true } },
      activityCompletions: true,
      simulationAttempts: {
        where: { status: { in: ["SUBMITTED", "EXPIRED"] }, mode: "FULL_SIM" },
        orderBy: { submittedAt: "desc" },
        take: 3,
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Resultados"
        subtitle="Progreso de alumnos e historial de simulacros."
      />
      <Card>
        <ul className="divide-y divide-border">
          {students.map((student) => (
            <li key={student.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-text-muted">{student.email}</p>
                  <p className="text-xs text-text-muted">
                    {student.enrollments[0]?.learningPath.title ?? "Sin ruta"}
                  </p>
                </div>
                <div className="text-sm text-text-secondary">
                  <p>Lecciones: {student.lessonProgress.length}</p>
                  <p>Actividades: {student.activityCompletions.length}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-text-muted">
                {student.simulationAttempts.length === 0 ? (
                  <li>Sin simulacros completos</li>
                ) : (
                  student.simulationAttempts.map((attempt) => (
                    <li key={attempt.id}>
                      {attempt.submittedAt?.toLocaleString("es-MX")} ·{" "}
                      {attempt.scorePercent != null
                        ? `${Math.round(attempt.scorePercent)}%`
                        : "—"}{" "}
                      · {attempt.passed ? "Aprobado" : "No aprobado"}
                    </li>
                  ))
                )}
              </ul>
            </li>
          ))}
          {students.length === 0 ? (
            <li className="py-4 text-text-secondary">No hay alumnos registrados.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
