import { getEventsAction } from "@/app/events/actions";
import { DashboardClientPage } from "./dashboard-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function HomePage() {
  // Pre-fetch active events list for dashboard monitoring
  const events = await getEventsAction();

  // Filter out templates
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date || "",
  }));

  return <DashboardClientPage initialEvents={serializedEvents} />;
}
