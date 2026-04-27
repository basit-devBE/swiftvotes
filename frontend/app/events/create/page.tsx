import { RequireAuth } from "@/components/auth/require-auth";
import { EventEditor } from "@/components/events/event-editor";
import { Navbar } from "@/components/navbar";

export default function CreateEventPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f6f8fc] text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(47,111,237,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_22%),linear-gradient(180deg,_#f9fbff_0%,_#f3f6fb_100%)]" />
      <Navbar />
      <main className="page-shell pb-16 pt-6 sm:pb-20 sm:pt-10">
        <RequireAuth>
          <EventEditor mode="create" />
        </RequireAuth>
      </main>
    </div>
  );
}
