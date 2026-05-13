import { Suspense } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
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
                <AppLoadingState
                  compact
                  label="Opening secure link"
                  detail="Checking your magic link session."
                />
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
