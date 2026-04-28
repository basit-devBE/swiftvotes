"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/my-events")}`);
    }
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-3xl border-t border-primary/15 pt-10">
        <p className="section-kicker">Session check</p>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
          Verifying your access.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-ink/64">
          We&apos;re checking your session and restoring your account if your
          refresh cookie is still valid.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
