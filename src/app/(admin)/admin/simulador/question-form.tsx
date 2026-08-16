"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

const TYPES = [
  "MULTIPLE_CHOICE",
  "CASE",
  "ORDER_PROCESS",
  "MULTI_SELECT",
  "ERROR_ID",
] as const;

export function QuestionForm({ elements }: { elements: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]>("MULTIPLE_CHOICE");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const options = [1, 2, 3, 4].map((n) => ({
      label: String(form.get(`opt${n}`) || ""),
      isCorrect:
        type === "ORDER_PROCESS"
          ? false
          : type === "MULTI_SELECT"
            ? form.get(`correct${n}`) === "on"
            : form.get("correct") === String(n),
      correctOrder: type === "ORDER_PROCESS" ? n : null,
    }));

    const res = await fetch("/api/admin/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elementId: form.get("elementId"),
        type,
        stem: form.get("stem"),
        explanation: form.get("explanation"),
        options,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudo crear");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <select
        name="elementId"
        required
        className="w-full rounded-xl border border-border px-3 py-2"
        defaultValue={elements[0]?.id}
      >
        {elements.map((el) => (
          <option key={el.id} value={el.id}>
            {el.title}
          </option>
        ))}
      </select>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
        className="w-full rounded-xl border border-border px-3 py-2"
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <textarea
        name="stem"
        required
        placeholder="Enunciado"
        rows={3}
        className="w-full rounded-xl border border-border px-3 py-2"
      />
      <textarea
        name="explanation"
        placeholder="Explicación / refuerzo"
        rows={2}
        className="w-full rounded-xl border border-border px-3 py-2"
      />
      <div className="grid gap-2 md:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <input
              name={`opt${n}`}
              required
              placeholder={`Opción ${n}`}
              className="flex-1 rounded-xl border border-border px-3 py-2"
            />
            {type === "MULTI_SELECT" ? (
              <input name={`correct${n}`} type="checkbox" title="Correcta" />
            ) : type === "ORDER_PROCESS" ? (
              <span className="text-xs text-text-muted">#{n}</span>
            ) : (
              <input name="correct" type="radio" value={n} defaultChecked={n === 1} title="Correcta" />
            )}
          </div>
        ))}
      </div>
      <PrimaryButton type="submit">Agregar reactivo</PrimaryButton>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}
