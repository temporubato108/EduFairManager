"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatUsernameToEmail } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export interface ActionResponse {
  error?: string;
  success?: boolean;
}

/**
 * Server action for user authentication (supports both Username and Email)
 */
export async function loginAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawIdentifier = (formData.get("identifier") as string || formData.get("email") as string || "").trim();
  const password = formData.get("password") as string;

  if (!rawIdentifier || !password) {
    return { error: "아이디와 비밀번호를 모두 입력해주세요." };
  }

  const cleanId = rawIdentifier.toLowerCase();
  let targetEmail = "";

  if (cleanId.includes("@")) {
    targetEmail = cleanId;
  } else if (cleanId === "admin") {
    targetEmail = "admin@school.kr";
  } else {
    // Check if user exists in database with specific username
    try {
      const adminSupabase = createAdminClient();
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      const matchedUser = usersData?.users?.find(
        (u) =>
          u.user_metadata?.username?.toLowerCase() === cleanId ||
          u.email?.toLowerCase().startsWith(`${cleanId}@`)
      );

      if (matchedUser?.email) {
        targetEmail = matchedUser.email;
      } else {
        targetEmail = formatUsernameToEmail(cleanId);
      }
    } catch {
      targetEmail = formatUsernameToEmail(cleanId);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (error || !data?.user) {
    if (error?.message?.includes("Invalid login credentials")) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    return { error: error?.message || "로그인에 실패했습니다." };
  }

  const role = data.user.user_metadata?.role || "operator";
  const matchedEmail = data.user.email || targetEmail;

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(null, "login", `사용자 로그인 완료: 식별자='${matchedEmail}', 권한='${role}'`);

  if (role === "admin") {
    redirect("/");
  } else {
    redirect("/kiosk");
  }
}

/**
 * Server action for signing out
 */
export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
