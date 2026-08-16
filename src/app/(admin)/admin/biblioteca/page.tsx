import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import { ResourceUploadForm } from "./upload-form";
import Link from "next/link";

export default async function AdminLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        subtitle="Carga archivos o enlaces y clasifícalos por tema."
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Nuevo recurso</h2>
        <ResourceUploadForm canPublish={session.user.role === "ADMIN"} />
      </Card>
      <Card>
        <ul className="divide-y divide-border">
          {resources.map((resource) => (
            <li key={resource.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{resource.title}</p>
                  <StatusBadge status={resource.status} />
                </div>
                <p className="text-xs text-text-muted">
                  {resource.type} · {resource.topic || "General"}
                </p>
              </div>
              {resource.url ? (
                <a href={resource.url} target="_blank" rel="noreferrer" className="text-sm text-gold-strong">
                  Abrir
                </a>
              ) : (
                <Link href={`/api/resources/${resource.id}/download`} className="text-sm text-gold-strong">
                  Descargar
                </Link>
              )}
            </li>
          ))}
          {resources.length === 0 ? (
            <li className="py-4 text-text-secondary">Sin recursos todavía.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
