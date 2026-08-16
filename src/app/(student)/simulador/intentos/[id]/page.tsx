import { auth } from "@/lib/auth";
import { getAttemptForStudent } from "@/lib/simulator";
import { Card, PageHeader, SecondaryButton } from "@/components/ui/primitives";
import { AttemptPlayer } from "./player";
import { notFound, redirect } from "next/navigation";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const data = await getAttemptForStudent(session.user.id, id);
  if (!data) notFound();

  const inProgress = data.attempt.status === "IN_PROGRESS";

  return (
    <div>
      <PageHeader
        title={inProgress ? "Simulación en curso" : "Resultado del intento"}
        subtitle={`${data.attempt.mode} · ${data.attempt.certification.code}`}
        actions={<SecondaryButton href="/simulador">Volver al simulador</SecondaryButton>}
      />

      {!inProgress ? (
        <Card className="mb-6">
          <p className="text-2xl font-semibold">
            {data.attempt.scorePercent != null
              ? `${Math.round(data.attempt.scorePercent)}%`
              : "Sin calificación"}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {data.attempt.passed === true
              ? "Aprobado (umbral formativo alcanzado)."
              : data.attempt.passed === false
                ? "No aprobado. Revisa las respuestas incorrectas y practica los temas débiles."
                : "Práctica formativa (sin umbral de aprobación)."}
          </p>
          <p className="mt-4 text-xs text-text-muted">{data.attempt.certification.disclaimer}</p>
        </Card>
      ) : null}

      <AttemptPlayer
        attemptId={data.attempt.id}
        endsAt={data.attempt.endsAt?.toISOString() ?? null}
        inProgress={inProgress}
        questions={JSON.parse(JSON.stringify(data.questions))}
        answers={JSON.parse(JSON.stringify(data.attempt.answers))}
      />
    </div>
  );
}
