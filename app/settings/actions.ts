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

    // 1. Prioritize currently logged in user's school name from metadata
    if (user?.user_metadata?.school_name) {
      settings.school_name = cleanSchoolName(user.user_metadata.school_name);
    } else {
      settings.school_name = cleanSchoolName(settings.school_name);
    }

    // 2. Fetch user-specific school logo from database table (not cookie/metadata to prevent 494 Request Header Too Large)
    if (user) {
      const { data: userLogoRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", `school_logo_${user.id}`)
        .single();

      if (userLogoRow?.value && isValidSchoolLogo(userLogoRow.value)) {
        let rawLogo = userLogoRow.value;
        if (typeof rawLogo === "string") {
          try {
            if ((rawLogo.startsWith('"') && rawLogo.endsWith('"')) || rawLogo.startsWith('{') || rawLogo.startsWith('[')) {
              rawLogo = JSON.parse(rawLogo);
            }
          } catch {
            // raw
          }
        }
        settings.school_logo = String(rawLogo).trim();
      }
    }

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

    if (settings.school_name !== undefined) {
      settings.school_name = cleanSchoolName(settings.school_name);
    }

    // 1. Update lightweight school_name in user_metadata only (NEVER put image/base64 in metadata!)
    if (user && settings.school_name !== undefined) {
      try {
        await supabase.auth.updateUser({
          data: { school_name: settings.school_name },
        });
      } catch {
        // ignore
      }
    }

    // 2. Save school logo in settings table under user-scoped key (to prevent Cookie header overflow)
    if (user && settings.school_logo !== undefined) {
      const logoVal = settings.school_logo ? String(settings.school_logo).trim() : "";
      await supabase
        .from("settings")
        .upsert({
          key: `school_logo_${user.id}`,
          value: logoVal,
        }, { onConflict: "key" });
    }

    // 3. Prepare upsert payload for general settings
    const entries = Object.entries(settings);
    for (const [key, rawValue] of entries) {
      if (key === "school_logo" && user) continue; // User-scoped logo handled above
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

/**
 * Server action to change password for the authenticated user
 */
export async function changePasswordAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const newPassword = (formData.get("new_password") as string || "").trim();
  const confirmPassword = (formData.get("confirm_password") as string || "").trim();

  if (!newPassword || newPassword.length < 6) {
    return { error: "새 비밀번호는 최소 6자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "새 비밀번호와 비밀번호 확인이 일치하지 않습니다." };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: "로그인 세션이 만료되었습니다. 다시 로그인해주세요." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: `비밀번호 변경 실패: ${updateError.message}` };
    }

    const { recordLogAction } = await import("@/app/logs/actions");
    await recordLogAction(
      null,
      "change_password",
      `비밀번호 변경 완료: 계정='${user.user_metadata?.username || user.email}'`
    );

    return { success: true };
  } catch (err) {
    const errorObj = err as Error;
    return { error: `비밀번호 변경 중 오류: ${errorObj.message}` };
  }
}
