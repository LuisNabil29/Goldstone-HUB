"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

export function CompleteLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/progress/lessons/${lessonId}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "No se pudo completar la lección");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <PrimaryButton disabled={loading} type="button" onClick={onClick}>
        {loading ? "Guardando…" : "Marcar lección como completada"}
      </PrimaryButton>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </div>
  );
}

export function CompleteActivityButton({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await fetch(`/api/progress/activities/${activityId}`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-alt disabled:opacity-50"
    >
      {loading ? "…" : "Marcar completada"}
    </button>
  );
}
