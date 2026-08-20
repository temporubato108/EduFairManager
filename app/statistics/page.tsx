import { getEventsAction } from "@/app/events/actions";
import { StatisticsClientPage } from "./statistics-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function StatisticsPage() {
  // Pre-fetch active events list for statistics selection
  const events = await getEventsAction();

  // Filter out templates
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date || "",
  }));

  return <StatisticsClientPage initialEvents={serializedEvents} />;
}
