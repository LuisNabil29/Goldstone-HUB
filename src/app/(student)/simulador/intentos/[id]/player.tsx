"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui/primitives";

type Option = {
  id: string;
  label: string;
  isCorrect?: boolean;
  correctOrder?: number | null;
};

type Question = {
  id: string;
  type: string;
  stem: string;
  explanation?: string | null;
  options: Option[];
  element?: { title: string };
};

type Answer = {
  questionId: string;
  selectedIds: string[];
  orderedIds: string[];
  isCorrect?: boolean | null;
};

export function AttemptPlayer({
  attemptId,
  endsAt,
  inProgress,
  questions,
  answers,
}: {
  attemptId: string;
  endsAt: string | null;
  inProgress: boolean;
  questions: Array<Question | null>;
  answers: Answer[];
}) {
  const router = useRouter();
  const cleanQuestions = questions.filter(Boolean) as Question[];
  const [index, setIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, Answer>>(() => {
    const map: Record<string, Answer> = {};
    for (const a of answers) {
      map[a.questionId] = a;
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = cleanQuestions[index];
  const remainingMs = useMemo(() => {
    if (!endsAt) return null;
    return Math.max(0, new Date(endsAt).getTime() - Date.now());
  }, [endsAt]);

  function updateAnswer(questionId: string, patch: Partial<Answer>) {
    setLocalAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedIds: prev[questionId]?.selectedIds ?? [],
        orderedIds: prev[questionId]?.orderedIds ?? [],
        ...patch,
      },
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = Object.values(localAnswers);
    const res = await fetch(`/api/simulator/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "No se pudo enviar");
      return;
    }
    router.refresh();
  }

  if (!current) {
    return <Card>No hay reactivos en este intento.</Card>;
  }

  const answer = localAnswers[current.id];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>
          Reactivo {index + 1} de {cleanQuestions.length}
        </span>
        {remainingMs != null && inProgress ? (
          <span>Tiempo límite: {Math.ceil(remainingMs / 60000)} min restantes (aprox.)</span>
        ) : null}
      </div>

      <Card>
        <p className="text-xs uppercase tracking-wide text-text-muted">{current.type}</p>
        <h2 className="mt-2 text-lg font-semibold">{current.stem}</h2>

        {current.type === "ORDER_PROCESS" ? (
          <OrderEditor
            options={current.options}
            orderedIds={answer?.orderedIds ?? current.options.map((o) => o.id)}
            disabled={!inProgress}
            onChange={(orderedIds) => updateAnswer(current.id, { orderedIds, selectedIds: [] })}
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {current.options.map((option) => {
              const selected = answer?.selectedIds?.includes(option.id);
              const multi = current.type === "MULTI_SELECT";
              return (
                <li key={option.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                      selected ? "border-gold bg-gold-soft" : "border-border"
                    } ${!inProgress ? "cursor-default" : ""}`}
                  >
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={current.id}
                      disabled={!inProgress}
                      checked={Boolean(selected)}
                      onChange={() => {
                        if (!inProgress) return;
                        if (multi) {
                          const set = new Set(answer?.selectedIds ?? []);
                          if (set.has(option.id)) set.delete(option.id);
                          else set.add(option.id);
                          updateAnswer(current.id, {
                            selectedIds: [...set],
                            orderedIds: [],
                          });
                        } else {
                          updateAnswer(current.id, {
                            selectedIds: [option.id],
                            orderedIds: [],
                          });
                        }
                      }}
                    />
                    <span>
                      {option.label}
                      {!inProgress && option.isCorrect != null ? (
                        <span className="ml-2 text-xs text-text-muted">
                          {option.isCorrect ? "(correcta)" : ""}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {!inProgress && answer?.isCorrect === false && current.explanation ? (
          <p className="mt-4 rounded-xl bg-surface-alt p-3 text-sm text-text-secondary">
            {current.explanation}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={index >= cleanQuestions.length - 1}
            onClick={() => setIndex((i) => i + 1)}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
        {inProgress ? (
          <PrimaryButton onClick={submit} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar intento"}
          </PrimaryButton>
        ) : null}
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}

function OrderEditor({
  options,
  orderedIds,
  disabled,
  onChange,
}: {
  options: Option[];
  orderedIds: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = orderedIds.length ? orderedIds : options.map((o) => o.id);

  function move(idx: number, dir: -1 | 1) {
    if (disabled) return;
    const next = [...ids];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <ul className="mt-4 space-y-2">
      {ids.map((id, idx) => (
        <li key={id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <span>
            {idx + 1}. {byId.get(id)?.label ?? id}
          </span>
          {!disabled ? (
            <span className="flex gap-2">
              <button type="button" onClick={() => move(idx, -1)} className="text-xs">
                ↑
              </button>
              <button type="button" onClick={() => move(idx, 1)} className="text-xs">
                ↓
              </button>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
