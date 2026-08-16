import { auth } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/progress";
import { Card, PageHeader, PrimaryButton, ProgressRing, SecondaryButton } from "@/components/ui/primitives";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getStudentDashboard(session.user.id);
  const firstName = session.user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`Bienvenido, ${firstName}`}
        actions={
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary">
              3 avisos
            </span>
            <span className="rounded-full bg-gold-soft px-3 py-1.5 text-sm font-medium text-gold-strong">
              3 Insignias
            </span>
          </div>
        }
      />

      <section
        className="relative mb-6 overflow-hidden rounded-[1.75rem] bg-graphite text-white"
        style={{
          backgroundImage: data.path?.heroImageUrl
            ? `linear-gradient(90deg, rgba(20,20,20,0.92), rgba(20,20,20,0.55)), url(${data.path.heroImageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-xl px-8 py-12">
          <h2 className="text-3xl font-semibold tracking-tight">
            {data.path?.title ?? "Tu ruta de aprendizaje"}
          </h2>
          <p className="mt-3 text-white/80">
            {data.path?.description ??
              "Avanza hacia tu certificación y construye tu futuro profesional."}
          </p>
          {data.nextAction.type !== "none" ? (
            <PrimaryButton href={data.nextAction.href} className="mt-6">
              Continuar aprendiendo →
            </PrimaryButton>
          ) : (
            <PrimaryButton href="/mi-ruta" className="mt-6">
              Ver mi ruta →
            </PrimaryButton>
          )}
        </div>
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold">Tu progreso</h3>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing percent={data.percent} />
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="font-medium text-text-primary">{data.path?.title ?? "Sin ruta"}</p>
              <p>
                {data.completedLessons + data.completedActivities} de{" "}
                {data.totalLessons + data.totalActivities} actividades completadas
              </p>
              <p>Tiempo estimado restante {data.estimatedHoursRemaining} horas</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Siguiente lección</h3>
          {data.nextLessonProgress ? (
            <div className="mt-4 space-y-4">
              <p className="font-medium text-text-primary">{data.nextLessonProgress.title}</p>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${data.nextLessonProgress.percent}%` }}
                />
              </div>
              <p className="text-sm text-text-muted">{data.nextLessonProgress.label}</p>
              <Link href={`/mi-ruta/lecciones/${data.nextLessonProgress.lessonId}`} className="text-sm font-medium text-gold-strong">
                Continuar aprendiendo →
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">No hay lecciones pendientes.</p>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Actividades pendientes</h3>
          <ul className="mt-4 space-y-3">
            {data.pendingActivities.length === 0 ? (
              <li className="text-sm text-text-secondary">Sin pendientes por ahora.</li>
            ) : (
              data.pendingActivities.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-surface-alt"
                  >
                    <span>
                      <span className="block font-medium text-text-primary">{item.title}</span>
                      <span className="text-xs text-text-muted">{item.lessonTitle}</span>
                    </span>
                    <span>→</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-semibold">Simulador de certificación</h3>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Pon a prueba tus conocimientos y mide tu preparación formativa para el EC0110.02.
          </p>
        </div>
        <SecondaryButton href="/simulador">Practicar ahora →</SecondaryButton>
      </Card>
    </div>
  );
}
