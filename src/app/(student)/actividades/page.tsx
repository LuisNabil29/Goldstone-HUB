import { auth } from "@/lib/auth";
import { getPrimaryLearningPath } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ActividadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const path = await getPrimaryLearningPath({ forStudent: true });
  const activities =
    path?.courses.flatMap((c) =>
      c.modules.flatMap((m) =>
        m.lessons.flatMap((l) =>
          l.activities.map((a) => ({
            ...a,
            lessonTitle: l.title,
            lessonId: l.id,
            moduleTitle: m.title,
          }))
        )
      )
    ) ?? [];

  const completions = await prisma.activityCompletion.findMany({
    where: { userId: session.user.id },
  });
  const done = new Set(completions.map((c) => c.activityId));

  return (
    <div>
      <PageHeader
        title="Actividades"
        subtitle="Ejercicios y entregables vinculados a tus lecciones."
      />
      <Card>
        <ul className="divide-y divide-border">
          {activities.length === 0 ? (
            <li className="py-4 text-text-secondary">No hay actividades publicadas.</li>
          ) : (
            activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-text-muted">
                    {activity.moduleTitle} · {activity.lessonTitle}
                    {activity.required ? " · Obligatoria" : " · Opcional"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={done.has(activity.id) ? "text-success" : "text-text-muted"}>
                    {done.has(activity.id) ? "Completada" : "Pendiente"}
                  </span>
                  <Link href={`/mi-ruta/lecciones/${activity.lessonId}`} className="text-gold-strong">
                    Abrir
                  </Link>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
