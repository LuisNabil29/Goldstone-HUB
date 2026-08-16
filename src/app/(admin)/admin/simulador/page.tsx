import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBankCoverage } from "@/lib/simulator";
import { Card, PageHeader } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import { QuestionForm } from "./question-form";
import { SimulatorConfigForm } from "./config-form";

export default async function AdminSimulatorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/admin");

  const certification = await prisma.certification.findFirst({
    where: { active: true },
    include: {
      blueprints: true,
      elements: { orderBy: { sortOrder: "asc" } },
    },
  });

  const counts = certification
    ? await prisma.question.groupBy({
        by: ["type"],
        where: { active: true, certificationId: certification.id },
        _count: { type: true },
      })
    : [];

  const countsByType: Record<string, number> = {};
  for (const row of counts) countsByType[row.type] = row._count.type;
  const coverage = certification
    ? validateBankCoverage(certification.blueprints, countsByType)
    : { ok: false, missing: [] };

  const recent = await prisma.question.findMany({
    where: { certificationId: certification?.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { element: true },
  });

  return (
    <div>
      <PageHeader
        title="Simulador"
        subtitle="Configura la certificación, el blueprint y el banco de reactivos."
      />

      {!certification ? (
        <Card>
          <p className="text-text-secondary">Ejecuta el seed para crear la certificación EC0110.02.</p>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <h2 className="font-semibold">{certification.code}</h2>
            <p className="mt-2 text-sm text-text-secondary">{certification.disclaimer}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div>Aprobatorio: {certification.passingScore}</div>
              <div>Reactivos: {certification.questionCount}</div>
              <div>Minutos: {certification.durationMinutes}</div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">
                Cobertura del banco:{" "}
                {coverage.ok ? (
                  <span className="text-success">Suficiente para un simulacro</span>
                ) : (
                  <span className="text-error">Insuficiente</span>
                )}
              </p>
              {!coverage.ok ? (
                <ul className="mt-2 text-xs text-text-muted">
                  {coverage.missing.map((m) => (
                    <li key={m.type}>
                      {m.type}: {m.have}/{m.need}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="mt-6">
              <SimulatorConfigForm
                passingScore={certification.passingScore}
                questionCount={certification.questionCount}
                durationMinutes={certification.durationMinutes}
                blueprints={certification.blueprints.map((b) => ({
                  itemType: b.itemType,
                  count: b.count,
                }))}
              />
            </div>
          </Card>

          <Card className="mb-6">
            <h2 className="mb-3 font-semibold">Agregar reactivo</h2>
            <QuestionForm elements={certification.elements.map((e) => ({ id: e.id, title: e.title }))} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Reactivos recientes</h2>
            <ul className="divide-y divide-border text-sm">
              {recent.map((q) => (
                <li key={q.id} className="py-3">
                  <p className="font-medium">{q.stem}</p>
                  <p className="text-xs text-text-muted">
                    {q.type} · {q.element.title}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
