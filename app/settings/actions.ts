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
    school_name: "EduFair Admin",
    school_logo: "",
    qr_size: "150",
    sound_effects_enabled: "true",
    dark_mode_enabled: "true",
    default_allow_double_participation: "true",
  };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultSettings;

    const isLegacyAdmin = user.id === "1b6e4ab3-e40b-4ad2-80bc-063271019707" || user.email === "admin@school.kr";

    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw new Error(error.message);

    const settings = { ...defaultSettings };
    if (data) {
      const settingKeys = Object.keys(defaultSettings) as (keyof SystemSettings)[];
      settingKeys.forEach((k) => {
        const userSpecificRow = data.find((r) => r.key === `${k}_${user.id}`);
        const globalRow = isLegacyAdmin ? data.find((r) => r.key === k) : null;
        const targetRow = userSpecificRow || globalRow;

        if (targetRow) {
          let val = targetRow.value;
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

    // Prioritize currently logged in user's school name from metadata
    if (user?.user_metadata?.school_name) {
      settings.school_name = user.user_metadata.school_name;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    if (settings.school_name !== undefined) {
      settings.school_name = cleanSchoolName(settings.school_name);
      
      // Update user_metadata if user is logged in (ONLY school_name, NEVER logo!)
      try {
        await supabase.auth.updateUser({
          data: { school_name: settings.school_name },
        });
      } catch {
        // ignore
      }
    }

    // Save each setting per-user using `${key}_${user.id}`
    const entries = Object.entries(settings);
    for (const [key, rawValue] of entries) {
      const cleanValue = typeof rawValue === "string" ? rawValue.trim().replace(/^["'\\]+|["'\\]+$/g, "") : String(rawValue || "");
      const userKey = `${key}_${user.id}`;
      
      const { error } = await supabase
        .from("settings")
        .upsert({ key: userKey, value: cleanValue }, { onConflict: "key" });
      if (error) {
        // Fallback for jsonb typed column
        await supabase
          .from("settings")
          .upsert({ key: userKey, value: JSON.stringify(cleanValue) }, { onConflict: "key" });
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
