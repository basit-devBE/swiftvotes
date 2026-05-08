import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";

const footerLinks = [
  { href: "/#features", label: "Voting tools" },
  { href: "/#how-it-works", label: "Workflow" },
  { href: "/#events", label: "Live campaigns" },
  { href: "/signup", label: "Create event" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-[#04070e] pb-10 pt-14 text-white">
      <div className="page-shell">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <SiteLogo className="rounded-[1.5rem] bg-white px-4 py-2 shadow-soft" />
            <p className="mt-6 text-base leading-7 text-white/62">
              SwiftVote helps organisers run reviewed campaigns with nominations,
              contestant profiles, paid vote verification, and payment records.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:justify-end sm:gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/68 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/45">
          © 2026 SwiftVote. Built for nominations, paid voting, and event reporting.
        </div>
      </div>
    </footer>
  );
}
