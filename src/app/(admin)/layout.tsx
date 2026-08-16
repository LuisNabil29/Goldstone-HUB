import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Providers } from "@/components/providers";
import { SidebarNav } from "@/components/shell/sidebar";

const adminNav = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/biblioteca", label: "Biblioteca" },
  { href: "/admin/simulador", label: "Simulador" },
  { href: "/admin/resultados", label: "Resultados" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR") {
    redirect("/inicio");
  }

  const roleLabel = session.user.role === "ADMIN" ? "Administrador" : "Instructor";

  return (
    <Providers>
      <div className="flex min-h-screen bg-background">
        <SidebarNav items={adminNav} userName={session.user.name} userRoleLabel={roleLabel} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
