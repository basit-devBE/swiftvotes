import { Suspense } from "react";

import { Navbar } from "@/components/navbar";
import { MagicLinkHandler } from "./magic-link-handler";

export default function MagicLinkPage() {
  return (
    <div className="relative flex min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f6f9fd)]" />
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/90 p-10 shadow-[0_28px_70px_-40px_rgba(7,17,31,0.18)]">
            <Suspense
              fallback={
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff]">
                    <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                  </div>
                  <p className="text-sm text-ink/50">Loading…</p>
                </div>
              }
            >
              <MagicLinkHandler />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
