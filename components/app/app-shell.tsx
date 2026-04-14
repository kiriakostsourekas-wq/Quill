"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  CalendarRange,
  Feather,
  LayoutTemplate,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  PenSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compose", label: "Compose", icon: PenSquare },
  { href: "/carousel", label: "Carousel", icon: LayoutTemplate },
  { href: "/scheduled", label: "Scheduled", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/voice-dna", label: "Voice DNA", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppShellProps = {
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [user.name]
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-white px-4 py-6 lg:block">
          <Link href="/dashboard" className="flex items-center gap-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">Quill</p>
              <p className="text-xs text-muted">Product app</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-brand-light hover:text-brand",
                    active && "bg-brand-light text-brand"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-line bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Feather className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold text-ink">Quill</span>
              </div>

              <div className="hidden text-sm text-muted lg:block">
                quill-ai.dev
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-full border border-line bg-white px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand">
                    {initials || "Q"}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>
                  <MenuSquare className="h-4 w-4 text-muted" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-white p-2 shadow-soft">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <form action="/api/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
