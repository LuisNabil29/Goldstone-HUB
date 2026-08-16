"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primitives";

export function InviteUserForm({
  paths,
  courses,
}: {
  paths: Array<{ id: string; title: string }>;
  courses: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [learningPathId, setLearningPathId] = useState(paths[0]?.id ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        role,
        learningPathId: role === "STUDENT" ? learningPathId : undefined,
        courseId: role === "INSTRUCTOR" ? courseId : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudo invitar");
      return;
    }
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        className="rounded-xl border border-border px-3 py-2"
      />
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@dominio.com"
        className="rounded-xl border border-border px-3 py-2"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-xl border border-border px-3 py-2"
      >
        <option value="STUDENT">Alumno</option>
        <option value="INSTRUCTOR">Instructor</option>
        <option value="ADMIN">Administrador</option>
      </select>
      {role === "STUDENT" ? (
        <select
          value={learningPathId}
          onChange={(e) => setLearningPathId(e.target.value)}
          className="rounded-xl border border-border px-3 py-2"
        >
          {paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      ) : null}
      {role === "INSTRUCTOR" ? (
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-xl border border-border px-3 py-2"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      ) : null}
      <div className="md:col-span-2">
        <PrimaryButton type="submit">Invitar</PrimaryButton>
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      </div>
    </form>
  );
}

export function ToggleActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "bg-green-50 text-success" : "bg-red-50 text-error"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </button>
  );
}
