import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export function isStaff(role: UserRole | undefined | null): boolean {
  return role === "ADMIN" || role === "INSTRUCTOR";
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "ADMIN";
}

export function homeForRole(role: UserRole | undefined | null): string {
  if (role === "ADMIN" || role === "INSTRUCTOR") {
    return "/admin";
  }
  return "/inicio";
}

export function assertStaff(session: Session | null) {
  if (!session?.user || !isStaff(session.user.role)) {
    throw new Error("Se requiere acceso de administración");
  }
  return session;
}

export function assertAdmin(session: Session | null) {
  if (!session?.user || !isAdmin(session.user.role)) {
    throw new Error("Se requiere rol de administrador");
  }
  return session;
}
