import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
}: AuthShellProps) {
  return (
    <section className="page-shell flex min-h-full items-start justify-center py-6 sm:items-center sm:py-8">
      <div className="w-full max-w-xl rounded-[2.2rem] border border-white/70 bg-white/84 p-7 shadow-card backdrop-blur sm:p-9">
        <div className="mb-8 flex justify-center">
          <SiteLogo
            className="rounded-[1.35rem] bg-white px-4 py-2 shadow-soft"
            imageClassName="h-14 sm:h-16"
          />
        </div>

        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink/64">
            {description}
          </p>
        </div>

        <div className="mt-7">
          {children}
        </div>

        <div className="mt-8 border-t border-ink/8 pt-6 text-sm text-ink/60">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            className="font-semibold text-primary transition hover:text-primary-deep"
          >
            {footerLinkLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
