"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { SiteLogo } from "@/components/site-logo";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
      </svg>
    ),
  },
  {
    href: "/admin/events",
    label: "Events",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/payments",
    label: "Payments",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="3.5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 10.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 14c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 7c1.657 0 3 1.343 3 3.5S13.657 14 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 8.5C11.328 8.5 12 7.828 12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login?next=/admin");
    } else if (status === "authenticated" && user?.systemRole !== "SUPER_ADMIN") {
      router.replace("/");
    }
  }, [status, user, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-ink/50">Loading admin panel…</p>
      </div>
    );
  }

  if (status === "anonymous" || user?.systemRole !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-ink">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/8 px-5">
          <SiteLogo className="h-6 w-6 brightness-0 invert" />
          <span className="font-display text-base font-semibold tracking-tight text-white">
            SwiftVote
          </span>
          <span className="ml-auto rounded-md bg-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Navigation
          </p>
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/25 text-white"
                    : "text-white/55 hover:bg-white/7 hover:text-white/90",
                ].join(" ")}
              >
                <span className={active ? "text-white" : "text-white/45"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user + back link */}
        <div className="shrink-0 border-t border-white/8 px-3 py-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/45 transition hover:bg-white/7 hover:text-white/80"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to app
          </Link>

          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-bold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/80">
                {user.fullName}
              </p>
              <p className="text-[10px] text-white/35">Super Admin</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/40 transition hover:bg-white/7 hover:text-white/75"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9.5 9.5V11a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2h4.5a2 2 0 012 2v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 7H6M12 7l-2-2M12 7l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="ml-56 flex min-h-screen flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
