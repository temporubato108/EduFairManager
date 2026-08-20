"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateUsername, validatePin, formatUsernameToEmail } from "@/lib/auth-helpers";
import { saveSettingsAction } from "@/app/settings/actions";
import { redirect } from "next/navigation";

export interface SignupResponse {
  error?: string;
  success?: boolean;
}

/**
 * Server action for school administrator signup with simple username, school name, and 4-digit recovery PIN.
 */
export async function signupAction(
  _prevState: SignupResponse | null,
  formData: FormData
): Promise<SignupResponse> {
  const schoolName = (formData.get("school_name") as string || "").trim();
  const region = (formData.get("region") as string || "").trim();
  const username = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string || "";
  const confirmPassword = formData.get("confirm_password") as string || "";
  const recoveryPin = (formData.get("recovery_pin") as string || "").trim();

  // 1. Validation
  if (!schoolName) {
    return { error: "학교명을 입력하거나 목록에서 선택해주세요." };
  }

  const userVal = validateUsername(username);
  if (!userVal.valid) {
    return { error: userVal.error };
  }

  if (!password || password.length < 6) {
    return { error: "비밀번호는 최소 6자 이상이어야 합니다." };
  }

  if (password !== confirmPassword) {
    return { error: "비밀번호와 비밀번호 확인이 일치하지 않습니다." };
  }

  const pinVal = validatePin(recoveryPin);
  if (!pinVal.valid) {
    return { error: pinVal.error };
  }

  const email = formatUsernameToEmail(username);

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check if user already exists
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    if (existingUsers?.users?.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      return { error: `이미 사용 중인 아이디입니다: '${username}'. 다른 아이디를 입력해주세요.` };
    }

    // 2. Create User in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          school_name: schoolName,
          region,
          recovery_pin: recoveryPin,
          role: "admin",
        },
      },
    });

    if (signUpError) {
      return { error: `회원가입 실패: ${signUpError.message}` };
    }

    // If auto-confirm is enabled or session is returned
    if (!signUpData.session) {
      // Direct sign in
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }

    // 3. Save school name into system settings
    try {
      await saveSettingsAction({ school_name: schoolName });
    } catch {
      // Non-critical fallback
    }

    // 4. Log creation
    const { recordLogAction } = await import("@/app/logs/actions");
    await recordLogAction(null, "signup", `신규 학교 관리자 가입 완료: 학교명='${schoolName}', 아이디='${username}', 지역='${region}'`);

  } catch (err) {
    const errorObj = err as Error;
    return { error: `회원가입 처리 중 오류 발생: ${errorObj.message}` };
  }

  redirect("/");
}
