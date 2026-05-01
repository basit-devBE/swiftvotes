"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { SiteLogo } from "@/components/site-logo";

const marketingLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/events", label: "Events" },
];

const appLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const isAdmin = isAuthenticated && user?.systemRole === "SUPER_ADMIN";
  const isHomePage = pathname === "/";
  const isMyEventsPage = pathname === "/my-events";
  const isMyProfilePage = pathname === "/my-profile";
  const navLinks = isHomePage ? marketingLinks : appLinks;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const closeMenu = () => setIsOpen(false);
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  const linkClassName = isScrolled
    ? "text-sm font-medium text-ink/72 transition hover:text-primary"
    : "text-sm font-medium text-ink/72 transition hover:text-primary";

  const mobileButtonClassName = isScrolled
    ? "inline-flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink transition hover:border-primary/20 hover:text-primary md:hidden"
    : "inline-flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-white/88 text-ink transition hover:border-primary/20 hover:text-primary md:hidden";

  const mobileMenuClassName = isScrolled
    ? "border-t border-ink/8 px-4 pb-5 pt-3 md:hidden"
    : "border-t border-ink/8 bg-white px-4 pb-5 pt-3 md:hidden";

  const mobileLinkClassName = isScrolled
    ? "rounded-2xl px-4 py-3 text-sm font-medium text-ink/80 transition hover:bg-primary/5 hover:text-primary"
    : "rounded-2xl px-4 py-3 text-sm font-medium text-ink/80 transition hover:bg-primary/5 hover:text-primary";

  return (
    <header
      className={`sticky top-0 z-50 transition duration-300 ${
        isScrolled
          ? "border-b border-ink/8 bg-white/94 shadow-[0_16px_36px_-30px_rgba(7,17,31,0.22)] backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <div className="page-shell">
        <div className="flex min-h-[5.25rem] items-center justify-between gap-6 px-1 sm:px-2">
          <SiteLogo priority imageClassName="h-[4.4rem] sm:h-[5rem]" />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${linkClassName} ${
                  pathname === link.href ? "text-primary" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink/85"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Admin
                  </Link>
                ) : null}
                {isMyEventsPage ? (
                  <Link href="/events/create" className="button-primary">
                    Create Event
                  </Link>
                ) : (
                  <Link href="/my-events" className="button-secondary">
                    My Events
                  </Link>
                )}
                {!isMyEventsPage ? (
                  <Link href="/events/create" className="button-secondary">
                    Create Event
                  </Link>
                ) : null}
                {!isAdmin && (
                  <Link
                    href="/my-profile"
                    className={`button-secondary ${isMyProfilePage ? "text-primary" : ""}`}
                  >
                    My Profile
                  </Link>
                )}
                <Link href="/account" className="button-secondary">
                  Account
                </Link>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    void logout();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={
                    isScrolled
                      ? "inline-flex items-center justify-center rounded-full border border-ink/10 bg-white/80 px-6 py-3 text-sm font-semibold text-ink transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary"
                      : "inline-flex items-center justify-center rounded-full border border-ink/10 bg-white/84 px-6 py-3 text-sm font-semibold text-ink transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary"
                  }
                >
                  Login
                </Link>
                <Link href="/signup" className="button-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={mobileButtonClassName}
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex flex-col gap-1.5">
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {isOpen ? (
          <div className={mobileMenuClassName}>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${mobileLinkClassName} ${
                    pathname === link.href ? "text-primary" : ""
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Admin panel
                    </Link>
                  ) : null}
                  <Link
                    href={isMyEventsPage ? "/events/create" : "/my-events"}
                    className="button-secondary mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {isMyEventsPage ? "Create Event" : "My Events"}
                  </Link>
                  {!isMyEventsPage ? (
                    <Link
                      href="/events/create"
                      className="button-secondary mt-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Create Event
                    </Link>
                  ) : null}
                  {!isAdmin && (
                    <Link
                      href="/my-profile"
                      className="button-secondary mt-2"
                      onClick={() => setIsOpen(false)}
                    >
                      My Profile
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="button-secondary mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    className="button-primary mt-2"
                    onClick={() => {
                      setIsOpen(false);
                      void logout();
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="button-secondary mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="button-primary mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
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
