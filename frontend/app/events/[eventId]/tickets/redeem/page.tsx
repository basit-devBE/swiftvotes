import { TicketRedeemView } from "@/components/events/ticket-redeem-view";

export default async function TicketRedeemPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <TicketRedeemView eventId={eventId} />;
}
