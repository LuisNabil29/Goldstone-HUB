"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

export function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudo crear");
      return;
    }
    setTitle("");
    setDescription("");
    router.push(`/admin/cursos/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[2fr_2fr_auto]">
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del curso"
        className="rounded-xl border border-border px-3 py-2"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción"
        className="rounded-xl border border-border px-3 py-2"
      />
      <PrimaryButton type="submit">Crear</PrimaryButton>
      {error ? <p className="text-sm text-error md:col-span-3">{error}</p> : null}
    </form>
  );
}
