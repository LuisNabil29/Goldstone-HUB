import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [courses, students, questions, attempts] = await Promise.all([
    prisma.course.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.question.count({ where: { active: true } }),
    prisma.simulationAttempt.count({
      where: { status: { in: ["SUBMITTED", "EXPIRED"] } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Administración"
        subtitle={`Hola ${session.user.name}. Gestiona contenido, alumnos y el simulador.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Cursos", value: courses, href: "/admin/cursos" },
          { label: "Alumnos", value: students, href: "/admin/alumnos" },
          { label: "Reactivos", value: questions, href: "/admin/simulador" },
          { label: "Intentos", value: attempts, href: "/admin/resultados" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-gold">
              <p className="text-sm text-text-muted">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
