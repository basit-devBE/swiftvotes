import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { Navbar } from "@/components/navbar";

export default function SignupPage() {
  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f6f9fd)]" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-hidden">
        <AuthShell
          eyebrow="Create account"
          title="Create your SwiftVote account."
          description="Start with a clean account flow now so you can move into event creation and team management in the next product phase."
          footerText="Already created an account?"
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
