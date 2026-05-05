"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { magicLinkLogin } from "@/lib/api/auth";
import { useAuth } from "@/hooks/use-auth";

type State = "verifying" | "success" | "error";

export function MagicLinkHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithSession } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");

    async function verifyToken() {
      if (!token) {
        setState("error");
        setErrorMessage("No login token found in this URL.");
        return;
      }

      try {
        const session = await magicLinkLogin(token);
        if (cancelled) return;
        loginWithSession(session);
        setState("success");
        setTimeout(() => {
          router.replace("/my-events");
        }, 1200);
      } catch (err: unknown) {
        if (cancelled) return;
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "This link is invalid, expired, or has already been used.",
        );
      }
    }

    void verifyToken();

    return () => {
      cancelled = true;
    };
  }, [searchParams, loginWithSession, router]);

  if (state === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff]">
          <svg
            className="h-6 w-6 animate-spin text-primary"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
        </div>
        <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
          Verifying your link…
        </p>
        <p className="text-sm text-ink/50">Just a moment.</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef9f2]">
          <svg className="h-6 w-6 text-[#1b6f4b]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
          You&apos;re in!
        </p>
        <p className="text-sm text-ink/50">Redirecting you now…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff2f4]">
        <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" />
        </svg>
      </div>
      <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
        Link unavailable
      </p>
      <p className="max-w-xs text-sm leading-6 text-ink/54">{errorMessage}</p>
      <a
        href="/login"
        className="mt-2 rounded-full border border-primary/20 bg-[#eef4ff] px-5 py-2 text-sm font-semibold text-primary transition hover:bg-[#dceaff]"
      >
        Go to login
      </a>
    </div>
  );
}
