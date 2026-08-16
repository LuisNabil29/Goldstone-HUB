"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export type NavItem = {
  href: string;
  label: string;
};

export function BrandMark() {
  return (
    <div className="px-2 py-1">
      <span className="text-gold font-semibold tracking-tight">GoldStone</span>{" "}
      <span className="text-sidebar-fg font-semibold tracking-tight">Hub</span>
    </div>
  );
}

export function SidebarNav({
  items,
  userName,
  userRoleLabel,
}: {
  items: NavItem[];
  userName: string;
  userRoleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-fg">
      <div className="px-5 py-6 text-xl">
        <BrandMark />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl px-4 py-3 text-sm transition ${
                active
                  ? "bg-sidebar-active border-l-2 border-gold text-white"
                  : "text-sidebar-muted hover:bg-sidebar-active hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-sm font-semibold text-graphite">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-sidebar-muted">{userRoleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 w-full rounded-full border border-white/15 px-3 py-2 text-xs text-sidebar-muted hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
