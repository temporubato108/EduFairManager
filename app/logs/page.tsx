import { getEventsAction } from "@/app/events/actions";
import { LogsClientPage } from "./logs-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function LogsPage() {
  // Pre-fetch active events list for filtering audit logs
  const events = await getEventsAction();

  // Filter out templates
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
  }));

  return <LogsClientPage initialEvents={serializedEvents} />;
}
