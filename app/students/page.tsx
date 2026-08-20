import { getEventsAction } from "@/app/events/actions";
import { getSettingsAction } from "@/app/settings/actions";
import { StudentClientPage } from "./student-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function StudentsPage() {
  // Pre-fetch active events and system settings (school logo)
  const [events, settings] = await Promise.all([
    getEventsAction(),
    getSettingsAction(),
  ]);

  // Filter out templates
  const activeEvents = events.filter((e) => !e.is_template);

  const serializedEvents = activeEvents.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date || "",
  }));

  return (
    <StudentClientPage
      initialEvents={serializedEvents}
      initialSchoolLogo={settings.school_logo || ""}
    />
  );
}
