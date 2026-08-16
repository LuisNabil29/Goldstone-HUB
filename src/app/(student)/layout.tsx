import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Providers } from "@/components/providers";
import { SidebarNav } from "@/components/shell/sidebar";

const studentNav = [
  { href: "/inicio", label: "Inicio" },
  { href: "/mi-ruta", label: "Mi ruta" },
  { href: "/actividades", label: "Actividades" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/simulador", label: "Simulador" },
  { href: "/perfil", label: "Perfil" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/admin");

  return (
    <Providers>
      <div className="flex min-h-screen bg-background">
        <SidebarNav
          items={studentNav}
          userName={session.user.name}
          userRoleLabel="Estudiante"
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
