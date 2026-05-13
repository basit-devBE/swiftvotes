import { Suspense } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Navbar } from "@/components/navbar";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f6f9fd)]" />
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar />
        <main className="flex-1">
        <AuthShell
          eyebrow="Sign in"
          title="Sign in to manage your events."
          description="Continue to your event workspace, approve nominations, review contestants, or check vote and payment activity."
          footerText="Running a new campaign?"
          footerLinkLabel="Create an organiser account"
          footerLinkHref="/signup"
        >
          <Suspense
            fallback={
              <AppLoadingState
                compact
                label="Loading sign-in"
                detail="Preparing the secure sign-in form."
              />
            }
          >
            <LoginForm />
          </Suspense>
        </AuthShell>
        </main>
      </div>
    </div>
  );
}
