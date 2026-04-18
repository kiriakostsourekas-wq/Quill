"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Calendar,
  CalendarRange,
  Feather,
  Lightbulb,
  LayoutTemplate,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  MoonStar,
  PenSquare,
  Search,
  Settings,
  Sparkles,
  SunMedium,
  X,
} from "lucide-react";
import { KeyboardHint } from "@/components/app/keyboard-hint";
import { useTheme } from "@/components/app/theme-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compose", label: "Compose", icon: PenSquare },
  { href: "/carousel", label: "Carousel", icon: LayoutTemplate },
  { href: "/scheduled", label: "Scheduled", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/voice-dna", label: "Voice DNA", icon: Sparkles },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
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
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[] | null>(null);
  const [dismissedConnectXBanner, setDismissedConnectXBanner] = useState(false);
  const [modifierLabel, setModifierLabel] = useState("Ctrl");
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [user.name]
  );
  const connectXBannerStorageKey = useMemo(
    () => `quill-dismiss-connect-x-banner:${user.email}`,
    [user.email]
  );

  useEffect(() => {
    try {
      setDismissedConnectXBanner(localStorage.getItem(connectXBannerStorageKey) === "1");
    } catch {
      setDismissedConnectXBanner(false);
    }
  }, [connectXBannerStorageKey]);

  useEffect(() => {
    if (/(Mac|iPhone|iPad)/i.test(navigator.platform)) {
      setModifierLabel("⌘");
    }
  }, []);

  useEffect(() => {
    fetch("/api/accounts")
      .then((response) => response.json())
      .then((data) =>
        setConnectedPlatforms(
          Array.isArray(data.accounts)
            ? data.accounts.map((account: { platform: string }) => account.platform)
            : []
        )
      )
      .catch(() => setConnectedPlatforms([]));
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    paletteInputRef.current?.focus();
  }, [paletteOpen]);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return target instanceof HTMLElement
        ? Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
        : false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const hasModifier = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        setPaletteOpen(false);
        setShortcutHelpOpen(false);
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent("quill:escape"));
        return;
      }

      if (hasModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShortcutHelpOpen(false);
        setMenuOpen(false);
        setPaletteOpen(true);
        return;
      }

      if (hasModifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/compose");
        return;
      }

      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        router.push("/carousel");
        return;
      }

      if (!hasModifier && !isEditableTarget(event.target) && event.key === "?") {
        event.preventDefault();
        setPaletteOpen(false);
        setMenuOpen(false);
        setShortcutHelpOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const shouldShowConnectXBanner =
    !dismissedConnectXBanner &&
    (pathname === "/dashboard" || pathname === "/compose") &&
    connectedPlatforms?.length === 1 &&
    connectedPlatforms[0] === "linkedin";

  const commands = useMemo(
    () => [
      ...navItems.map((item) => ({
        id: item.href,
        label: item.label,
        description: `Open ${item.label}`,
        hint:
          item.href === "/compose"
            ? `${modifierLabel}N`
            : item.href === "/carousel"
              ? `${modifierLabel}⇧C`
              : null,
        action: () => router.push(item.href),
      })),
      {
        id: "toggle-theme",
        label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        description: "Toggle your workspace theme",
        hint: null,
        action: toggleTheme,
      },
      {
        id: "shortcuts",
        label: "View keyboard shortcuts",
        description: "Open the shortcuts help modal",
        hint: "?",
        action: () => setShortcutHelpOpen(true),
      },
    ],
    [modifierLabel, resolvedTheme, router, toggleTheme]
  );

  const filteredCommands = useMemo(() => {
    if (!commandQuery.trim()) return commands;
    const normalizedQuery = commandQuery.trim().toLowerCase();
    return commands.filter((command) =>
      `${command.label} ${command.description}`.toLowerCase().includes(normalizedQuery)
    );
  }, [commandQuery, commands]);

  function dismissConnectXBanner() {
    try {
      localStorage.setItem(connectXBannerStorageKey, "1");
    } catch {
      // Ignore localStorage failures.
    }
    setDismissedConnectXBanner(true);
  }

  function runCommand(action: () => void) {
    setPaletteOpen(false);
    setMenuOpen(false);
    setCommandQuery("");
    action();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-surface px-4 py-6 lg:block">
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
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
          <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShortcutHelpOpen(false);
                    setPaletteOpen(true);
                  }}
                  className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-muted transition hover:bg-surface-muted md:inline-flex"
                >
                  <Search className="h-4 w-4" />
                  <span>Quick search</span>
                  <KeyboardHint keys={`${modifierLabel}K`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setPaletteOpen(false);
                    setShortcutHelpOpen(true);
                  }}
                  className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-muted transition hover:bg-surface-muted sm:inline-flex"
                  aria-label="Open keyboard shortcuts help"
                >
                  <span className="text-base font-semibold">?</span>
                  <KeyboardHint keys="?" />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-ink"
                  aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                >
                  {resolvedTheme === "dark" ? (
                    <SunMedium className="h-4 w-4" />
                  ) : (
                    <MoonStar className="h-4 w-4" />
                  )}
                </button>

                <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-full border border-line bg-surface px-3 py-2 transition hover:bg-surface-muted"
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
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-surface p-2 shadow-soft">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-surface-muted"
                      onClick={() => setMenuOpen(false)}
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
            </div>
          </header>

          {shouldShowConnectXBanner && (
            <div className="border-b border-brand/15 bg-brand-light/45 px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Unlock full power: Connect your X account to publish the same post everywhere
                    with Voice DNA adaptation.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/settings#connections"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand/90"
                  >
                    Connect X now
                  </Link>
                  <button
                    type="button"
                    onClick={dismissConnectXBanner}
                    className="inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium text-muted transition hover:bg-white/70 hover:text-ink"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 px-4 py-16 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={paletteInputRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search pages and actions..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              <KeyboardHint keys="Esc" />
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-sm text-muted">
                  No matching pages or actions.
                </div>
              ) : (
                filteredCommands.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => runCommand(command.action)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-surface-muted"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{command.label}</p>
                      <p className="mt-1 text-xs text-muted">{command.description}</p>
                    </div>
                    {command.hint ? <KeyboardHint keys={command.hint} /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {shortcutHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 px-4 py-16 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts help">
          <div className="mx-auto max-w-xl rounded-[20px] border border-line bg-surface p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Keyboard shortcuts</h2>
                <p className="mt-1 text-sm text-muted">
                  Quick navigation and drafting controls for power users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShortcutHelpOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:bg-surface-muted hover:text-ink"
                aria-label="Close keyboard shortcuts help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: "Open command palette", keys: `${modifierLabel}K` },
                { label: "Compose new post", keys: `${modifierLabel}N` },
                { label: "Save draft", keys: `${modifierLabel}S` },
                { label: "Publish or schedule", keys: `${modifierLabel}↵` },
                { label: "Create carousel", keys: `${modifierLabel}⇧C` },
                { label: "Show shortcut help", keys: "?" },
                { label: "Close modal or panel", keys: "Esc" },
              ].map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between rounded-xl border border-line bg-surface-muted px-4 py-3"
                >
                  <span className="text-sm text-ink">{shortcut.label}</span>
                  <KeyboardHint keys={shortcut.keys} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
