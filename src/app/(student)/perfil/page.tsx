import { auth } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/progress";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [enrollment, dashboard, attempts] = await Promise.all([
    prisma.enrollment.findFirst({
      where: { userId: session.user.id },
      include: { learningPath: true },
    }),
    getStudentDashboard(session.user.id),
    prisma.simulationAttempt.count({
      where: { userId: session.user.id, status: { in: ["SUBMITTED", "EXPIRED"] } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Datos de tu cuenta y resumen de avance." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Cuenta</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Nombre</dt>
              <dd className="font-medium">{session.user.name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Correo</dt>
              <dd className="font-medium">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Rol</dt>
              <dd className="font-medium">Estudiante</dd>
            </div>
            <div>
              <dt className="text-text-muted">Ruta asignada</dt>
              <dd className="font-medium">{enrollment?.learningPath.title ?? "Sin inscripción"}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Resumen</h2>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            <li>Avance general: {Math.round(dashboard.percent)}%</li>
            <li>
              Lecciones: {dashboard.completedLessons}/{dashboard.totalLessons}
            </li>
            <li>
              Actividades: {dashboard.completedActivities}/{dashboard.totalActivities}
            </li>
            <li>Intentos de simulador: {attempts}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
