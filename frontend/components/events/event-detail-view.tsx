"use client";

import { useEffect, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import { getEvent } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";
import { EventEditor } from "./event-editor";

export function EventDetailView({
  eventId,
  adminMode = false,
  afterSaveHref,
}: {
  eventId: string;
  adminMode?: boolean;
  afterSaveHref?: string;
}) {
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
    return (
      <AppLoadingState
        label="Loading event"
        detail="Opening the event editor and media details."
      />
    );
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

  return (
    <EventEditor
      mode="update"
      initialEvent={event}
      adminMode={adminMode}
      afterSaveHref={afterSaveHref}
    />
  );
}
