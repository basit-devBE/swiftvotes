"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SiteLogo } from "@/components/site-logo";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#events", label: "Events" },
  { href: "#admin", label: "Admin" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    : "text-sm font-medium text-white/78 transition hover:text-white";

  const mobileButtonClassName = isScrolled
    ? "inline-flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-white/80 text-ink transition hover:border-primary/20 hover:text-primary md:hidden"
    : "inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:border-white/24 hover:bg-white/12 md:hidden";

  const mobileMenuClassName = isScrolled
    ? "border-t border-ink/8 px-4 pb-5 pt-3 md:hidden"
    : "border-t border-white/10 bg-[#040912]/94 px-4 pb-5 pt-3 text-white backdrop-blur md:hidden";

  const mobileLinkClassName = isScrolled
    ? "rounded-2xl px-4 py-3 text-sm font-medium text-ink/80 transition hover:bg-primary/5 hover:text-primary"
    : "rounded-2xl px-4 py-3 text-sm font-medium text-white/82 transition hover:bg-white/8 hover:text-white";

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={`page-shell transition duration-300 ${
          isScrolled ? "glass-panel" : "rounded-[2rem] bg-transparent"
        }`}
      >
        <div className="flex min-h-[5.25rem] items-center justify-between gap-6 px-4 sm:px-6">
          <SiteLogo priority imageClassName="h-[4.4rem] sm:h-[5rem]" />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClassName}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link href="#get-started" className="button-primary">
              Get Started
            </Link>
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
                  className={mobileLinkClassName}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="#get-started"
                className="button-primary mt-2"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
