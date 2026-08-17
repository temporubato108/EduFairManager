import { getSettingsAction } from "./actions";
import { SettingsClientPage } from "./settings-client";

export const revalidate = 0; // Force dynamic fetching for real-time accuracy

export default async function SettingsPage() {
  const settings = await getSettingsAction();

  return <SettingsClientPage initialSettings={settings} />;
}
