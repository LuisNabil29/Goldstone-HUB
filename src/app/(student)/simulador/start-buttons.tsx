"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";

export function StartSimulationButtons({
  elements,
}: {
  elements: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function start(body: Record<string, string>) {
    setLoading(body.mode);
    setError(null);
    const res = await fetch("/api/simulator/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "No se pudo iniciar");
      return;
    }
    router.push(`/simulador/intentos/${data.id}`);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => start({ mode: "FULL_SIM" })} disabled={loading === "FULL_SIM"}>
          {loading === "FULL_SIM" ? "Preparando…" : "Simulacro completo"}
        </PrimaryButton>
        <SecondaryButton onClick={() => start({ mode: "ERROR_REVIEW" })}>
          {loading === "ERROR_REVIEW" ? "Preparando…" : "Repaso de errores"}
        </SecondaryButton>
      </div>
      <div>
        <p className="mb-2 text-sm text-text-secondary">Práctica por elemento</p>
        <div className="flex flex-wrap gap-2">
          {elements.map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => start({ mode: "TOPIC_PRACTICE", elementId: el.id })}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-alt"
            >
              {el.title}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
