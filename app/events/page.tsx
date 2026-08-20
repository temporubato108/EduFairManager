import { getEventsAction } from "./actions";
import { EventClientPage } from "./event-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function EventsPage() {
  const events = await getEventsAction();
  
  // Format dates to ISO strings before passing to client components if necessary
  const serializedEvents = events.map((event) => ({
    ...event,
    date: event.date || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    created_at: event.created_at ? new Date(event.created_at).toISOString() : "",
    updated_at: event.updated_at ? new Date(event.updated_at).toISOString() : "",
    deleted_at: event.deleted_at ? new Date(event.deleted_at).toISOString() : null,
  }));

  return <EventClientPage initialEvents={serializedEvents} />;
}
