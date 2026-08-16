"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui/primitives";

type Activity = {
  id: string;
  title: string;
  required: boolean;
  status: "DRAFT" | "PUBLISHED";
};

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  status: "DRAFT" | "PUBLISHED";
  activities: Activity[];
};

type Module = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED";
  modules: Module[];
};

export function CourseEditor({
  course,
  canPublish,
}: {
  course: Course;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");

  async function patchCourse(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }
    router.refresh();
  }

  async function createModule() {
    if (!moduleTitle.trim()) return;
    const res = await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id, title: moduleTitle }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al crear módulo");
      return;
    }
    setModuleTitle("");
    router.refresh();
  }

  async function createLesson(moduleId: string) {
    const title = window.prompt("Título de la lección");
    if (!title) return;
    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, title, content: "" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al crear lección");
      return;
    }
    router.refresh();
  }

  async function createActivity(lessonId: string) {
    const title = window.prompt("Título de la actividad");
    if (!title) return;
    const res = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, title, required: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al crear actividad");
      return;
    }
    router.refresh();
  }

  async function setStatus(
    entity: "modules" | "lessons" | "activities",
    id: string,
    status: "DRAFT" | "PUBLISHED"
  ) {
    const res = await fetch(`/api/admin/${entity}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo cambiar el estado");
      return;
    }
    router.refresh();
  }

  async function saveLessonContent(id: string, content: string) {
    await fetch("/api/admin/lessons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary">{course.description || "Sin descripción"}</p>
          <div className="mt-2">
            <StatusBadge status={course.status} />
          </div>
        </div>
        {canPublish ? (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => patchCourse("DRAFT")}>Pasar a borrador</SecondaryButton>
            <PrimaryButton onClick={() => patchCourse("PUBLISHED")}>Publicar curso</PrimaryButton>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Puedes editar en borrador. La publicación la hace un administrador.
          </p>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold">Nuevo módulo</h3>
        <div className="mt-3 flex gap-2">
          <input
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Título del módulo"
            className="flex-1 rounded-xl border border-border px-3 py-2"
          />
          <PrimaryButton onClick={createModule}>Agregar</PrimaryButton>
        </div>
      </Card>

      {course.modules.map((module) => (
        <Card key={module.id}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <StatusBadge status={module.status} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => createLesson(module.id)}
                className="rounded-full border border-border px-3 py-1.5 text-xs"
              >
                + Lección
              </button>
              {canPublish ? (
                <button
                  type="button"
                  onClick={() =>
                    setStatus(
                      "modules",
                      module.id,
                      module.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                    )
                  }
                  className="rounded-full border border-border px-3 py-1.5 text-xs"
                >
                  {module.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            {module.lessons.map((lesson) => (
              <div key={lesson.id} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{lesson.title}</h4>
                    <StatusBadge status={lesson.status} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => createActivity(lesson.id)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs"
                    >
                      + Actividad
                    </button>
                    {canPublish ? (
                      <button
                        type="button"
                        onClick={() =>
                          setStatus(
                            "lessons",
                            lesson.id,
                            lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                          )
                        }
                        className="rounded-full border border-border px-3 py-1.5 text-xs"
                      >
                        {lesson.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <textarea
                  defaultValue={lesson.content ?? ""}
                  rows={4}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                  onBlur={(e) => saveLessonContent(lesson.id, e.target.value)}
                />
                <ul className="mt-3 space-y-2">
                  {lesson.activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-sm"
                    >
                      <span>
                        {activity.title}{" "}
                        <span className="text-text-muted">
                          ({activity.required ? "obligatoria" : "opcional"})
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={activity.status} />
                        {canPublish ? (
                          <button
                            type="button"
                            onClick={() =>
                              setStatus(
                                "activities",
                                activity.id,
                                activity.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                              )
                            }
                            className="text-xs text-gold-strong"
                          >
                            {activity.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
