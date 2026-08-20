import { getEventsAction } from "@/app/events/actions";
import { StudentClientPage } from "./student-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function StudentsPage() {
  // Pre-fetch active events for student association filter
  const events = await getEventsAction();

  // Filter out templates
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date || "",
  }));

  return <StudentClientPage initialEvents={serializedEvents} />;
}
