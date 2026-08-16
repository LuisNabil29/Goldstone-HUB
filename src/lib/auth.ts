import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { createTransport } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { homeForRole } from "@/lib/rbac";

const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

function buildTransport() {
  if (!hasSmtp) {
    return createTransport({
      jsonTransport: true,
    });
  }

  return createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Nodemailer({
      server: hasSmtp
        ? {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          }
        : { jsonTransport: true },
      from: process.env.SMTP_FROM || "GoldStone Hub <noreply@goldstonehub.local>",
      async sendVerificationRequest({ identifier, url, provider }) {
        const user = await prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
        });

        if (!user || !user.active) {
          throw new Error("INVITE_ONLY");
        }

        const transport = buildTransport();
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Tu acceso a GoldStone Hub",
          text: `Hola ${user.name},\n\nUsa este enlace para entrar a GoldStone Hub (válido por unos minutos):\n${url}\n\nSi no solicitaste este acceso, ignora este mensaje.`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#141414">
              <h1 style="font-size:20px;margin:0 0 12px">GoldStone Hub</h1>
              <p>Hola ${user.name},</p>
              <p>Usa este enlace para acceder. Expira en unos minutos y solo funciona una vez.</p>
              <p style="margin:24px 0">
                <a href="${url}" style="background:#d4a017;color:#141414;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">
                  Entrar a GoldStone Hub
                </a>
              </p>
              <p style="color:#5c5c5c;font-size:13px;word-break:break-all">${url}</p>
            </div>
          `,
        });

        if (!hasSmtp) {
          console.log("\n========== MAGIC LINK (dev) ==========");
          console.log(`To: ${identifier}`);
          console.log(`URL: ${url}`);
          console.log("======================================\n");
          try {
            const { mkdir, writeFile } = await import("fs/promises");
            const { join } = await import("path");
            const dir = join(process.cwd(), "uploads");
            await mkdir(dir, { recursive: true });
            await writeFile(
              join(dir, "last-magic-link.txt"),
              `${identifier}\n${url}\n`,
              "utf8"
            );
          } catch (err) {
            console.error("No se pudo guardar last-magic-link.txt", err);
          }
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login/verificar",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      return Boolean(dbUser?.active);
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase() },
      });

      if (!dbUser || !dbUser.active) {
        return token;
      }

      token.id = dbUser.id;
      token.role = dbUser.role;
      token.name = dbUser.name;
      token.email = dbUser.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  trustHost: true,
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Se requiere rol de administrador");
  }
  return session;
}

export async function requireStaff() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR") {
    throw new Error("Se requiere acceso de administración");
  }
  return session;
}

export { homeForRole };
