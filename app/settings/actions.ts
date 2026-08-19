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

import { isValidSchoolLogo, cleanSchoolName } from "@/lib/utils";

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
          if (typeof val === "string") {
            try {
              if ((val.startsWith('"') && val.endsWith('"')) || val.startsWith('{') || val.startsWith('[')) {
                val = JSON.parse(val);
              }
            } catch {
              // use raw string
            }
          }
          const strVal = String(val ?? "").trim();
          if (strVal === "null" || strVal === "undefined" || strVal === '""' || strVal === "''") {
            settings[k] = "";
          } else {
            settings[k] = strVal;
          }
        }
      });
    }

    settings.school_name = cleanSchoolName(settings.school_name);

    if (!isValidSchoolLogo(settings.school_logo)) {
      settings.school_logo = "";
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

    if (settings.school_name !== undefined) {
      settings.school_name = cleanSchoolName(settings.school_name);
    }

    // Prepare upsert payload
    const entries = Object.entries(settings);
    for (const [key, rawValue] of entries) {
      const cleanValue = typeof rawValue === "string" ? rawValue.trim().replace(/^["'\\]+|["'\\]+$/g, "") : String(rawValue || "");
      const { error } = await supabase
        .from("settings")
        .upsert({ key, value: cleanValue }, { onConflict: "key" });
      if (error) {
        // Fallback for jsonb typed column
        await supabase
          .from("settings")
          .upsert({ key, value: JSON.stringify(cleanValue) }, { onConflict: "key" });
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
