"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SystemSettings {
  school_name: string;
  school_logo: string;
  qr_size: string;
  sound_effects_enabled: string;
  dark_mode_enabled: string;
  default_allow_double_participation: string;
}

export async function getSettingsAction(): Promise<SystemSettings> {
  const defaultSettings: SystemSettings = {
    school_name: "미래초등학교",
    school_logo: "",
    qr_size: "150",
    sound_effects_enabled: "true",
    dark_mode_enabled: "true",
    default_allow_double_participation: "true",
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw new Error(error.message);

    const settings = { ...defaultSettings };
    if (data) {
      data.forEach((row) => {
        const k = row.key as keyof SystemSettings;
        if (k in settings) {
          let val = row.value;
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }
          settings[k] = String(val || "");
        }
      });
    }
    return settings;
  } catch (err) {
    const errorObj = err as Error;
    console.error("Failed to load settings:", errorObj.message);
    return defaultSettings;
  }
}

export async function saveSettingsAction(settings: Partial<SystemSettings>) {
  try {
    const supabase = await createClient();

    // Prepare upsert payload
    const payload = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value || ""),
    }));

    // Upsert key-value pairs
    for (const item of payload) {
      const { error } = await supabase
        .from("settings")
        .upsert(item, { onConflict: "key" });
      if (error) {
        // Fallback for text column type
        await supabase
          .from("settings")
          .upsert({ key: item.key, value: settings[item.key as keyof SystemSettings] || "" }, { onConflict: "key" });
      }
    }

    // Record system settings change log
    const { recordLogAction } = await import("@/app/logs/actions");
    await recordLogAction(null, "update_settings", `시스템 설정 저장 완료: 학교명='${settings.school_name || ""}'`);

    revalidatePath("/", "layout"); // Revalidate entire app layout to apply changes
    return { success: true };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
