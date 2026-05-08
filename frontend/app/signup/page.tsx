import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { Navbar } from "@/components/navbar";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f6f9fd)]" />
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar />
        <main className="flex-1">
        <AuthShell
          eyebrow="Create account"
          title="Create an organiser account."
          description="Use this account to create events, submit them for approval, confirm nominations, and manage voting windows."
          footerText="Already managing an event?"
          footerLinkLabel="Sign in"
          footerLinkHref="/login"
        >
          <SignupForm />
        </AuthShell>
        </main>
      </div>
    </div>
  );
}
