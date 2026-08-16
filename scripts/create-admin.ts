import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
const name = process.argv[3] || "Administrador";
const role = (process.argv[4] || "ADMIN") as UserRole;

if (!email) {
  console.error("Uso: npm run create-admin -- correo@dominio.com \"Nombre\" [ADMIN|INSTRUCTOR|STUDENT]");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role, active: true },
    create: {
      email: email.toLowerCase(),
      name,
      role,
      active: true,
    },
  });
  console.log(`Usuario listo: ${user.email} (${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
