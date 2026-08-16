import { auth } from "@/lib/auth";
import { getPublishedLesson } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, SecondaryButton } from "@/components/ui/primitives";
import { CompleteActivityButton, CompleteLessonButton } from "./actions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const lesson = await getPublishedLesson(id);
  if (!lesson) notFound();

  const [progress, completions] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
    }),
    prisma.activityCompletion.findMany({
      where: {
        userId: session.user.id,
        activityId: { in: lesson.activities.map((a) => a.id) },
      },
    }),
  ]);

  const completedActivities = new Set(completions.map((c) => c.activityId));

  return (
    <div>
      <PageHeader
        title={lesson.title}
        subtitle={`${lesson.module.course.title} · ${lesson.module.title}`}
        actions={<SecondaryButton href="/mi-ruta">Volver a mi ruta</SecondaryButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <div className="prose max-w-none whitespace-pre-wrap text-text-secondary">
            {lesson.content || "Sin contenido aún."}
          </div>
          <div className="mt-6">
            {progress?.completed ? (
              <p className="text-sm font-medium text-success">Lección completada</p>
            ) : (
              <CompleteLessonButton lessonId={lesson.id} />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold">Actividades</h3>
            <ul className="mt-4 space-y-3">
              {lesson.activities.map((activity) => (
                <li key={activity.id} className="rounded-xl border border-border p-3">
                  <p className="font-medium">{activity.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {activity.required ? "Obligatoria" : "Opcional"}
                  </p>
                  {completedActivities.has(activity.id) ? (
                    <p className="mt-2 text-sm text-success">Completada</p>
                  ) : (
                    <div className="mt-3">
                      <CompleteActivityButton activityId={activity.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="font-semibold">Recursos</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {lesson.resources.length === 0 ? (
                <li className="text-text-muted">Sin recursos adjuntos.</li>
              ) : (
                lesson.resources.map((resource) => (
                  <li key={resource.id}>
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-strong hover:underline"
                      >
                        {resource.title}
                      </a>
                    ) : (
                      <Link
                        href={`/api/resources/${resource.id}/download`}
                        className="text-gold-strong hover:underline"
                      >
                        {resource.title}
                      </Link>
                    )}
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
