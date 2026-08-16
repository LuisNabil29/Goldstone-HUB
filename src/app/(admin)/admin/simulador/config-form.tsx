"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

export function SimulatorConfigForm({
  passingScore,
  questionCount,
  durationMinutes,
  blueprints,
}: {
  passingScore: number;
  questionCount: number;
  durationMinutes: number;
  blueprints: Array<{ itemType: string; count: number }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      passingScore: Number(form.get("passingScore")),
      questionCount: Number(form.get("questionCount")),
      durationMinutes: Number(form.get("durationMinutes")),
      blueprints: blueprints.map((bp) => ({
        itemType: bp.itemType,
        count: Number(form.get(`bp_${bp.itemType}`) || bp.count),
      })),
    };
    const res = await fetch("/api/admin/simulator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(res.ok ? "Configuración guardada" : "No se pudo guardar");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">
        Aprobatorio
        <input
          name="passingScore"
          type="number"
          defaultValue={passingScore}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
        />
      </label>
      <label className="text-sm">
        Reactivos
        <input
          name="questionCount"
          type="number"
          defaultValue={questionCount}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
        />
      </label>
      <label className="text-sm">
        Minutos
        <input
          name="durationMinutes"
          type="number"
          defaultValue={durationMinutes}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
        />
      </label>
      {blueprints.map((bp) => (
        <label key={bp.itemType} className="text-sm">
          {bp.itemType}
          <input
            name={`bp_${bp.itemType}`}
            type="number"
            defaultValue={bp.count}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
          />
        </label>
      ))}
      <div className="md:col-span-3">
        <PrimaryButton type="submit">Guardar configuración</PrimaryButton>
        {message ? <p className="mt-2 text-sm text-text-secondary">{message}</p> : null}
      </div>
    </form>
  );
}
