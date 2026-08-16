import { auth } from "@/lib/auth";
import { getPrimaryLearningPath } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, StatusBadge } from "@/components/ui/primitives";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MiRutaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const path = await getPrimaryLearningPath({ forStudent: true });
  const progress = await prisma.lessonProgress.findMany({
    where: { userId: session.user.id, completed: true },
  });
  const completed = new Set(progress.map((p) => p.lessonId));

  return (
    <div>
      <PageHeader
        title="Mi ruta"
        subtitle={path?.description ?? "Cursos, módulos y lecciones de tu ruta asignada."}
      />

      {!path ? (
        <Card>
          <p className="text-text-secondary">Aún no hay una ruta publicada.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {path.courses.map((course) => (
            <Card key={course.id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <StatusBadge status={course.status} />
              </div>
              <div className="space-y-5">
                {course.modules.map((module) => (
                  <div key={module.id}>
                    <h3 className="mb-2 font-medium text-text-primary">{module.title}</h3>
                    <ul className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <Link
                            href={`/mi-ruta/lecciones/${lesson.id}`}
                            className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-surface-alt"
                          >
                            <span>{lesson.title}</span>
                            <span className="text-sm text-text-muted">
                              {completed.has(lesson.id) ? "Completada" : "Pendiente"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
