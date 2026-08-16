import {
  AttemptStatus,
  QuestionType,
  SimulationMode,
  type ExamBlueprint,
  type Question,
  type QuestionOption,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QuestionWithOptions = Question & { options: QuestionOption[] };

export async function getActiveCertification() {
  return prisma.certification.findFirst({
    where: { active: true },
    include: {
      blueprints: true,
      elements: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export function validateBankCoverage(
  blueprints: ExamBlueprint[],
  countsByType: Record<string, number>
): { ok: boolean; missing: Array<{ type: QuestionType; need: number; have: number }> } {
  const missing: Array<{ type: QuestionType; need: number; have: number }> = [];
  for (const bp of blueprints) {
    const have = countsByType[bp.itemType] ?? 0;
    if (have < bp.count) {
      missing.push({ type: bp.itemType, need: bp.count, have });
    }
  }
  return { ok: missing.length === 0, missing };
}

export function pickQuestionsForBlueprint(
  questions: QuestionWithOptions[],
  blueprints: ExamBlueprint[],
  rng: () => number = Math.random
): QuestionWithOptions[] {
  const byType = new Map<QuestionType, QuestionWithOptions[]>();
  for (const q of questions) {
    const list = byType.get(q.type) ?? [];
    list.push(q);
    byType.set(q.type, list);
  }

  const selected: QuestionWithOptions[] = [];
  for (const bp of blueprints) {
    const pool = shuffle([...(byType.get(bp.itemType) ?? [])], rng);
    if (pool.length < bp.count) {
      throw new Error(`Banco insuficiente para ${bp.itemType}: ${pool.length}/${bp.count}`);
    }
    selected.push(...pool.slice(0, bp.count));
  }

  return shuffle(selected, rng);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function scoreAnswer(
  question: QuestionWithOptions,
  selectedIds: string[],
  orderedIds: string[]
): boolean {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "CASE":
    case "ERROR_ID": {
      const correct = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      return correct.length === 1 && selectedIds.length === 1 && selectedIds[0] === correct[0];
    }
    case "MULTI_SELECT": {
      const correct = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
      const selected = new Set(selectedIds);
      if (correct.size !== selected.size) return false;
      for (const id of correct) {
        if (!selected.has(id)) return false;
      }
      return true;
    }
    case "ORDER_PROCESS": {
      const ordered = [...question.options]
        .filter((o) => o.correctOrder != null)
        .sort((a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0))
        .map((o) => o.id);
      if (ordered.length !== orderedIds.length) return false;
      return ordered.every((id, idx) => id === orderedIds[idx]);
    }
    default: {
      const _exhaustive: never = question.type;
      return _exhaustive;
    }
  }
}

export function computeScorePercent(correctCount: number, total: number): number {
  if (total === 0) return 0;
  return (correctCount / total) * 100;
}

export function isPassing(scorePercent: number, passingScore: number): boolean {
  return scorePercent >= passingScore;
}

export async function startFullSimulation(userId: string) {
  const certification = await getActiveCertification();
  if (!certification) {
    throw new Error("No hay certificación configurada");
  }

  const questions = await prisma.question.findMany({
    where: { certificationId: certification.id, active: true },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  const countsByType: Record<string, number> = {};
  for (const q of questions) {
    countsByType[q.type] = (countsByType[q.type] ?? 0) + 1;
  }

  const coverage = validateBankCoverage(certification.blueprints, countsByType);
  if (!coverage.ok) {
    throw new Error(
      `Banco insuficiente: ${coverage.missing
        .map((m) => `${m.type} ${m.have}/${m.need}`)
        .join(", ")}`
    );
  }

  const selected = pickQuestionsForBlueprint(questions, certification.blueprints);
  const endsAt = new Date(Date.now() + certification.durationMinutes * 60 * 1000);

  return prisma.simulationAttempt.create({
    data: {
      userId,
      certificationId: certification.id,
      mode: "FULL_SIM",
      status: "IN_PROGRESS",
      endsAt,
      questionIds: selected.map((q) => q.id),
    },
  });
}

export async function startTopicPractice(userId: string, elementId: string, count = 10) {
  const certification = await getActiveCertification();
  if (!certification) throw new Error("No hay certificación configurada");

  const questions = await prisma.question.findMany({
    where: { certificationId: certification.id, elementId, active: true },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  if (questions.length === 0) {
    throw new Error("No hay reactivos para este elemento");
  }

  const selected = shuffle(questions).slice(0, Math.min(count, questions.length));

  return prisma.simulationAttempt.create({
    data: {
      userId,
      certificationId: certification.id,
      mode: "TOPIC_PRACTICE",
      status: "IN_PROGRESS",
      elementId,
      endsAt: new Date(Date.now() + 45 * 60 * 1000),
      questionIds: selected.map((q) => q.id),
    },
  });
}

export async function startErrorReview(userId: string, count = 10) {
  const certification = await getActiveCertification();
  if (!certification) throw new Error("No hay certificación configurada");

  const wrong = await prisma.attemptAnswer.findMany({
    where: {
      isCorrect: false,
      attempt: { userId, status: "SUBMITTED" },
    },
    select: { questionId: true },
    distinct: ["questionId"],
    take: 100,
  });

  const questionIds = wrong.map((w) => w.questionId);
  if (questionIds.length === 0) {
    throw new Error("Aún no tienes respuestas incorrectas para repasar");
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds }, active: true },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  const selected = shuffle(questions).slice(0, Math.min(count, questions.length));

  return prisma.simulationAttempt.create({
    data: {
      userId,
      certificationId: certification.id,
      mode: "ERROR_REVIEW",
      status: "IN_PROGRESS",
      endsAt: new Date(Date.now() + 45 * 60 * 1000),
      questionIds: selected.map((q) => q.id),
    },
  });
}

export async function submitAttempt(
  userId: string,
  attemptId: string,
  answers: Array<{ questionId: string; selectedIds?: string[]; orderedIds?: string[] }>
) {
  const attempt = await prisma.simulationAttempt.findFirst({
    where: { id: attemptId, userId },
  });
  if (!attempt) throw new Error("Intento no encontrado");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Este intento ya fue enviado");

  const expired = attempt.endsAt && attempt.endsAt.getTime() < Date.now();
  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.questionIds } },
    include: { options: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  let correctCount = 0;
  const answerRows = attempt.questionIds.map((questionId) => {
    const question = byId.get(questionId);
    const payload = answers.find((a) => a.questionId === questionId);
    const selectedIds = payload?.selectedIds ?? [];
    const orderedIds = payload?.orderedIds ?? [];
    const isCorrect = question
      ? scoreAnswer(question, selectedIds, orderedIds)
      : false;
    if (isCorrect) correctCount += 1;
    return {
      attemptId,
      questionId,
      selectedIds,
      orderedIds,
      isCorrect,
    };
  });

  await prisma.attemptAnswer.deleteMany({ where: { attemptId } });
  await prisma.attemptAnswer.createMany({ data: answerRows });

  const total = attempt.questionIds.length;
  const scorePercent = computeScorePercent(correctCount, total);
  const certification = await prisma.certification.findUnique({
    where: { id: attempt.certificationId },
  });
  const passed = isPassing(scorePercent, certification?.passingScore ?? 80);

  return prisma.simulationAttempt.update({
    where: { id: attemptId },
    data: {
      status: expired ? ("EXPIRED" as AttemptStatus) : "SUBMITTED",
      submittedAt: new Date(),
      scorePercent,
      passed: attempt.mode === "FULL_SIM" ? passed : null,
    },
    include: {
      answers: true,
    },
  });
}

export async function getAttemptForStudent(userId: string, attemptId: string) {
  const attempt = await prisma.simulationAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      answers: true,
      certification: true,
    },
  });
  if (!attempt) return null;

  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.questionIds } },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      element: true,
    },
  });

  const ordered = attempt.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  const revealAnswers = attempt.status !== "IN_PROGRESS";

  return {
    attempt,
    questions: ordered.map((q) => {
      if (!q) return null;
      if (!revealAnswers) {
        return {
          ...q,
          explanation: null,
          options: q.options.map((o) => ({
            id: o.id,
            label: o.label,
            sortOrder: o.sortOrder,
            correctOrder: q.type === "ORDER_PROCESS" ? null : undefined,
            isCorrect: undefined,
          })),
        };
      }
      return q;
    }),
  };
}

export async function getReinforcementTopics(userId: string) {
  const wrong = await prisma.attemptAnswer.groupBy({
    by: ["questionId"],
    where: {
      isCorrect: false,
      attempt: { userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
    },
    _count: { questionId: true },
  });

  if (wrong.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: { id: { in: wrong.map((w) => w.questionId) } },
    include: { element: true },
  });

  const byElement = new Map<string, { elementId: string; title: string; misses: number }>();
  for (const q of questions) {
    const count = wrong.find((w) => w.questionId === q.id)?._count.questionId ?? 0;
    const current = byElement.get(q.elementId) ?? {
      elementId: q.elementId,
      title: q.element.title,
      misses: 0,
    };
    current.misses += count;
    byElement.set(q.elementId, current);
  }

  return [...byElement.values()].sort((a, b) => b.misses - a.misses);
}

export type SimulationModeType = SimulationMode;
