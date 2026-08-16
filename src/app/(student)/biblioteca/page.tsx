import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BibliotecaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resources = await prisma.resource.findMany({
    where: { status: "PUBLISHED", libraryVisible: true },
    orderBy: [{ topic: "asc" }, { title: "asc" }],
  });

  const byTopic = new Map<string, typeof resources>();
  for (const resource of resources) {
    const topic = resource.topic || "General";
    const list = byTopic.get(topic) ?? [];
    list.push(resource);
    byTopic.set(topic, list);
  }

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        subtitle="Materiales de apoyo clasificados por tema y tipo de recurso."
      />
      <div className="space-y-6">
        {[...byTopic.entries()].map(([topic, items]) => (
          <Card key={topic}>
            <h2 className="mb-4 text-lg font-semibold">{topic}</h2>
            <ul className="space-y-3">
              {items.map((resource) => (
                <li
                  key={resource.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{resource.title}</p>
                    <p className="text-xs text-text-muted">
                      {resource.type}
                      {resource.description ? ` · ${resource.description}` : ""}
                    </p>
                  </div>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-gold-strong"
                    >
                      Abrir
                    </a>
                  ) : (
                    <Link
                      href={`/api/resources/${resource.id}/download`}
                      className="text-sm font-medium text-gold-strong"
                    >
                      Descargar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
        {resources.length === 0 ? (
          <Card>
            <p className="text-text-secondary">La biblioteca aún no tiene materiales publicados.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
