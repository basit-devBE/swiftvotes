"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SiteLogo } from "@/components/site-logo";
import { useAuth } from "@/hooks/use-auth";

const baseLinks = [
  { href: "/", label: "Home", exact: true },
  { href: "/events", label: "Events", exact: false },
];

const authedLinks = [
  { href: "/my-events", label: "My Events", exact: false },
  { href: "/my-profile", label: "My Profile", exact: false },
  { href: "/account", label: "Account", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const isAdmin = isAuthenticated && user?.systemRole === "SUPER_ADMIN";
  const links = isAuthenticated
    ? [...baseLinks, ...authedLinks.filter((link) => !isAdmin || link.href !== "/my-profile")]
    : baseLinks;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b transition duration-200",
        isScrolled
          ? "border-line bg-white/92 shadow-[0_16px_36px_-30px_rgba(7,17,31,0.22)] backdrop-blur-xl"
          : "border-transparent bg-white/72 backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="page-shell">
        <div className="flex min-h-20 items-center justify-between gap-4">
          <SiteLogo priority imageClassName="h-12 sm:h-14" />

          <nav className="hidden items-center gap-1 rounded-2xl border border-line/80 bg-white/72 p-1 md:flex">
            {links.map((link) => {
              const active = isActive(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-primary text-white shadow-[0_10px_22px_rgba(15,76,219,0.18)]"
                      : "text-ink/58 hover:bg-primary/7 hover:text-ink",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/events/create"
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep"
                >
                  Create Event
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/58 transition hover:border-accent/30 hover:text-accent"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/62 transition hover:border-primary/30 hover:text-primary"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep"
                >
                  Create account
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white text-ink transition hover:border-primary/30 hover:text-primary md:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">Toggle navigation menu</span>
            <span className="flex flex-col gap-1.5">
              <span
                className={[
                  "h-0.5 w-5 rounded-full bg-current transition",
                  isOpen ? "translate-y-2 rotate-45" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "h-0.5 w-5 rounded-full bg-current transition",
                  isOpen ? "opacity-0" : "opacity-100",
                ].join(" ")}
              />
              <span
                className={[
                  "h-0.5 w-5 rounded-full bg-current transition",
                  isOpen ? "-translate-y-2 -rotate-45" : "",
                ].join(" ")}
              />
            </span>
          </button>
        </div>

        {isOpen ? (
          <div className="border-t border-line/80 pb-4 pt-3 md:hidden">
            <nav className="grid gap-2">
              {links.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active
                        ? "bg-primary text-white"
                        : "bg-white/70 text-ink/68 hover:bg-primary/7 hover:text-ink",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {isAuthenticated ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    href="/events/create"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                  >
                    Create Event
                  </Link>
                  <button
                    type="button"
                    className="rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-ink/62"
                    onClick={() => {
                      setIsOpen(false);
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink/68"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
