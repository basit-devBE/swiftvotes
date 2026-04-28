import { RequireAuth } from "@/components/auth/require-auth";
import { EventEditor } from "@/components/events/event-editor";
import { Navbar } from "@/components/navbar";

export default function CreateEventPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f4f7fb] text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.14),_transparent_28%),radial-gradient(circle_at_82%_10%,_rgba(180,15,23,0.10),_transparent_18%),linear-gradient(180deg,_#fbfcff_0%,_#f2f5fa_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0)_100%)]" />
      <Navbar />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        <RequireAuth>
          <EventEditor mode="create" />
        </RequireAuth>
      </main>
    </div>
  );
}
