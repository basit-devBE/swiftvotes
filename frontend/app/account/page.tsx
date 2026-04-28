import { AccountProfileForm } from "@/components/account/account-profile-form";
import { RequireAuth } from "@/components/auth/require-auth";
import { Navbar } from "@/components/navbar";

export default function AccountPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.1),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f6f9fd)]" />
      <Navbar />
      <main className="page-shell pb-16 pt-10 sm:pb-20 sm:pt-14">
        <RequireAuth>
          <AccountProfileForm />
        </RequireAuth>
      </main>
    </div>
  );
}
