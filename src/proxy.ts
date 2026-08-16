import { auth } from "@/lib/auth";
import { homeForRole, isStaff } from "@/lib/rbac";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const path = nextUrl.pathname;

  const publicRoutes = ["/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));

  if (path === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
  }

  if (!isPublicRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/admin") && isLoggedIn && !isStaff(role)) {
    return NextResponse.redirect(new URL("/inicio", nextUrl));
  }

  if (
    isLoggedIn &&
    isStaff(role) &&
    (path === "/" ||
      path.startsWith("/inicio") ||
      path.startsWith("/mi-ruta") ||
      path.startsWith("/actividades") ||
      path.startsWith("/biblioteca") ||
      path.startsWith("/simulador") ||
      path.startsWith("/perfil"))
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  if (path === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
