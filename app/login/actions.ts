"use server";

import { createClient } from "@/lib/supabase/server";
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
  const identifier = (formData.get("identifier") as string || formData.get("email") as string || "").trim();
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { error: "아이디와 비밀번호를 모두 입력해주세요." };
  }

  const email = formatUsernameToEmail(identifier);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Translate common error messages
    if (error.message.includes("Invalid login credentials")) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    return { error: error.message };
  }

  // Determine role and redirect (handled outside try/catch to avoid swallowing redirect errors)
  const role = data.user?.user_metadata?.role || "operator";

  // Import dynamically or at top. Let's import inside or at top.
  // We can import at the top of the file, or use inline import to avoid circular dependencies.
  // Since we don't import auth inside logs, there's no circle. Let's import at top.
  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(null, "login", `사용자 로그인 완료: 이메일='${email}', 권한='${role}'`);
  
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
