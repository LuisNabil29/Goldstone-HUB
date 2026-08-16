import { auth } from "@/lib/auth";
import { getActiveCertification, getReinforcementTopics } from "@/lib/simulator";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, ProgressRing } from "@/components/ui/primitives";
import { StartSimulationButtons } from "./start-buttons";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SimuladorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certification = await getActiveCertification();
  const attempts = await prisma.simulationAttempt.findMany({
    where: { userId: session.user.id, status: { in: ["SUBMITTED", "EXPIRED"] } },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });
  const reinforcement = await getReinforcementTopics(session.user.id);
  const fullSims = attempts.filter((a) => a.mode === "FULL_SIM" && a.scorePercent != null);
  const avg =
    fullSims.length === 0
      ? 0
      : fullSims.reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) / fullSims.length;

  return (
    <div>
      <PageHeader
        title="Simulador de certificación"
        subtitle="Práctica por tema, repaso de errores y simulacros formativos."
      />

      {certification ? (
        <Card className="mb-6">
          <p className="text-sm text-text-muted">{certification.code}</p>
          <h2 className="mt-1 text-xl font-semibold">{certification.title}</h2>
          <p className="mt-3 text-sm text-text-secondary">{certification.disclaimer}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
            <span>{certification.questionCount} reactivos</span>
            <span>{certification.durationMinutes} minutos</span>
            <span>Aprobatorio {certification.passingScore}+</span>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <p className="text-text-secondary">El simulador aún no está configurado.</p>
        </Card>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <ProgressRing percent={avg} label="Desempeño" />
          <p className="mt-3 text-sm text-text-secondary">
            {fullSims.length === 0 ? "Sin simulacros todavía" : "Promedio de simulacros completos"}
          </p>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold">Comenzar práctica</h3>
          {certification ? (
            <StartSimulationButtons elements={certification.elements} />
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Temas a reforzar</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {reinforcement.length === 0 ? (
              <li className="text-text-muted">Aún no hay errores registrados.</li>
            ) : (
              reinforcement.map((item) => (
                <li key={item.elementId} className="flex justify-between border-b border-border py-2">
                  <span>{item.title}</span>
                  <span className="text-text-muted">{item.misses} fallos</span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold">Historial</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {attempts.length === 0 ? (
              <li className="text-text-muted">Sin intentos todavía.</li>
            ) : (
              attempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between border-b border-border py-2">
                  <span>
                    {attempt.mode} ·{" "}
                    {attempt.scorePercent != null ? `${Math.round(attempt.scorePercent)}%` : "—"}
                    {attempt.passed === true ? " · Aprobado" : attempt.passed === false ? " · No aprobado" : ""}
                  </span>
                  <Link href={`/simulador/intentos/${attempt.id}`} className="text-gold-strong">
                    Ver
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
