"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

export function ResourceUploadForm({ canPublish }: { canPublish: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/admin/resources", { method: "POST", body: data });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "No se pudo guardar");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <input
        name="title"
        required
        placeholder="Título"
        className="rounded-xl border border-border px-3 py-2"
      />
      <input
        name="topic"
        placeholder="Tema"
        className="rounded-xl border border-border px-3 py-2"
      />
      <select name="type" className="rounded-xl border border-border px-3 py-2" defaultValue="PDF">
        {["PDF", "PPT", "DOC", "XLS", "LINK", "PODCAST", "VIDEO", "BOOK"].map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        name="url"
        placeholder="URL (YouTube, podcast, libro…)"
        className="rounded-xl border border-border px-3 py-2"
      />
      <input
        name="file"
        type="file"
        className="rounded-xl border border-border px-3 py-2 md:col-span-2"
      />
      <textarea
        name="description"
        placeholder="Descripción"
        rows={2}
        className="rounded-xl border border-border px-3 py-2 md:col-span-2"
      />
      <div className="md:col-span-2">
        <PrimaryButton type="submit">
          {canPublish ? "Guardar y publicar" : "Guardar borrador"}
        </PrimaryButton>
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      </div>
    </form>
  );
}
