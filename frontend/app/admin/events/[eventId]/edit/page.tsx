import { RequireAuth } from "@/components/auth/require-auth";
import { EventDetailView } from "@/components/events/event-detail-view";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <div className="px-8 py-10">
      <RequireAuth>
        <EventDetailView
          eventId={eventId}
          adminMode
          afterSaveHref="/admin/events"
        />
      </RequireAuth>
    </div>
  );
}
