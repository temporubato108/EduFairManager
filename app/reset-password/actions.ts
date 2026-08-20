"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { validateUsername, validatePin, formatUsernameToEmail } from "@/lib/auth-helpers";

export interface ResetPasswordResponse {
  error?: string;
  success?: boolean;
}

/**
 * Server action for resetting password using username and 4-digit recovery PIN.
 */
export async function resetPasswordWithPinAction(
  _prevState: ResetPasswordResponse | null,
  formData: FormData
): Promise<ResetPasswordResponse> {
  const username = (formData.get("username") as string || "").trim();
  const recoveryPin = (formData.get("recovery_pin") as string || "").trim();
  const newPassword = (formData.get("new_password") as string || "");
  const confirmPassword = (formData.get("confirm_password") as string || "");

  // 1. Validation
  const userVal = validateUsername(username);
  if (!userVal.valid) {
    return { error: userVal.error };
  }

  const pinVal = validatePin(recoveryPin);
  if (!pinVal.valid) {
    return { error: pinVal.error };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "새 비밀번호는 최소 6자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "새 비밀번호와 비밀번호 확인이 일치하지 않습니다." };
  }

  const email = formatUsernameToEmail(username);

  try {
    const adminSupabase = createAdminClient();

    // 2. Find user by email
    const { data: userList, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
      return { error: `사용자 목록 조회 실패: ${listError.message}` };
    }

    const targetUser = userList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      return { error: `등록된 아이디 '${username}'를 찾을 수 없습니다.` };
    }

    // 3. Check recovery PIN
    const storedPin = targetUser.user_metadata?.recovery_pin;
    if (!storedPin || String(storedPin).trim() !== String(recoveryPin).trim()) {
      return { error: "4자리 복구 PIN이 일치하지 않습니다. PIN 번호를 다시 확인해주세요." };
    }

    // 4. Update Password
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      return { error: `비밀번호 재설정 실패: ${updateError.message}` };
    }

    // 5. Record Log
    const { recordLogAction } = await import("@/app/logs/actions");
    await recordLogAction(
      null,
      "reset_password",
      `아이디 '${username}' 비밀번호 재설정 완료 (4자리 PIN 인증)`
    );

    return { success: true };
  } catch (err) {
    const errorObj = err as Error;
    return { error: `비밀번호 재설정 처리 중 오류: ${errorObj.message}` };
  }
}
