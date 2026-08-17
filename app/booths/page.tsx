import { getEventsAction } from "@/app/events/actions";
import { getTeachersAction } from "./actions";
import { BoothClientPage } from "./booth-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function BoothsPage() {
  // Pre-fetch active events and teachers list for dropdown options
  const events = await getEventsAction();
  const teachers = await getTeachersAction();

  // Filter out templates for booth associations
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
  }));

  const serializedTeachers = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
  }));

  return (
    <BoothClientPage
      initialEvents={serializedEvents}
      teachers={serializedTeachers}
    />
  );
}
