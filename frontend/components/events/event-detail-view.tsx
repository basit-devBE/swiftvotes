"use client";

import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { getEvent } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";
import { EventEditor } from "./event-editor";

export function EventDetailView({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getEvent(eventId);
        if (!cancelled) {
          setEvent(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load the event.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (isLoading) {
    return <p className="text-base text-ink/56">Loading event...</p>;
  }

  if (error) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        Event not found.
      </div>
    );
  }

  return <EventEditor mode="update" initialEvent={event} />;
}
