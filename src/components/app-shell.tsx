"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Upload,
  Scale,
  Utensils,
  Dumbbell,
  Gauge,
  ClipboardList,
  Users,
  User,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Activity,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { OnboardingWizard, useOnboarding } from "@/components/onboarding";
import { HelpFab } from "@/components/help-fab";

function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

// Birincil: günlük kullanım. İkincil (Hesap): ara sıra açılan / kurulum ekranları.
const NAV_PRIMARY = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nutrition", label: "Beslenme", icon: Utensils },
  { href: "/workout", label: "Antrenman", icon: Dumbbell },
  { href: "/biometrics", label: "Biyometri", icon: Scale },
];
const NAV_SECONDARY = [
  { href: "/metabolism", label: "Metabolizma", icon: Gauge },
  { href: "/upload", label: "Yükle & Oku", icon: Upload },
  { href: "/assessment", label: "Ön Değerlendirme", icon: ClipboardList },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];
// Koç sade menüsü: yalnızca danışan(lar) + hesap ayarları.
const NAV_COACH = [
  { href: "/coach", label: "Danışanlar", icon: Users },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { id: "light", icon: Sun, label: "Aydınlık" },
    { id: "system", icon: Monitor, label: "Sistem" },
    { id: "dark", icon: Moon, label: "Karanlık" },
  ] as const;
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setTheme(o.id)}
          title={o.label}
          aria-label={o.label}
          className={cn(
            "grid h-7 w-8 place-items-center rounded-md transition-colors",
            theme === o.id ? "bg-surface text-primary-ink shadow-card" : "text-ink-3 hover:text-ink",
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary-wash text-primary-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      <item.icon className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}

function NavLinks({ onNavigate, role }: { onNavigate?: () => void; role: string }) {
  // Koç: sade, danışan-odaklı menü (kullanıcı ekranları gizli).
  if (role === "coach") {
    return (
      <nav className="flex flex-col gap-1">
        {NAV_COACH.map((item) => (
          <NavItemLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }
  // Danışan: günlük ekranlar + "Hesap" grubu ("Planım" başta).
  const secondary = NAV_SECONDARY;
  return (
    <nav className="flex flex-col gap-1">
      {NAV_PRIMARY.map((item) => (
        <NavItemLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
      <div className="mt-3 px-3 pb-1 pt-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink-3">
        Hesap
      </div>
      {secondary.map((item) => (
        <NavItemLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-primary to-primary-ink shadow-card">
        <Activity className="h-4 w-4 text-white" strokeWidth={2.4} />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight">MetaCoach</div>
        <div className="font-mono text-[0.6rem] text-ink-3">adaptive health</div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role?: string } | null;
}) {
  const role = user?.role ?? "user";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onboarding = useOnboarding();

  // Auth screens render without the app chrome.
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-border bg-surface px-3 py-5 lg:flex">
        <Brand />
        <NavLinks role={role} />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-crit"
        >
          <LogOut className="h-[18px] w-[18px]" /> Çıkış yap
        </button>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 border-r border-border bg-surface px-3 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-crit"
            >
              <LogOut className="h-[18px] w-[18px]" /> Çıkış yap
            </button>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-ground/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="btn-ghost btn h-9 w-9 p-0 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          {user && (
            <span className="hidden text-sm font-medium text-ink-2 sm:inline">{user.name}</span>
          )}
          <span
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-primary-ink text-sm font-bold text-white"
            title={user?.email ?? ""}
          >
            {initialOf(user?.name ?? "?")}
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <OnboardingWizard open={onboarding.show} onClose={onboarding.dismiss} />
      <HelpFab onReopenOnboarding={onboarding.reopen} />
    </div>
  );
}
