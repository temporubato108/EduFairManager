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
  const rawIdentifier = (formData.get("identifier") as string || formData.get("email") as string || "").trim();
  const password = formData.get("password") as string;

  if (!rawIdentifier || !password) {
    return { error: "아이디와 비밀번호를 모두 입력해주세요." };
  }

  const supabase = await createClient();

  // Prepare candidate email addresses
  const candidateEmails: string[] = [];
  if (rawIdentifier.includes("@")) {
    candidateEmails.push(rawIdentifier.toLowerCase());
  } else {
    const cleanId = rawIdentifier.toLowerCase();
    // 1. If 'admin', prioritize 'admin@school.kr' legacy account
    if (cleanId === "admin") {
      candidateEmails.push("admin@school.kr");
      candidateEmails.push("admin@edufair.local");
      candidateEmails.push("admin@school.es.kr");
    } else {
      candidateEmails.push(formatUsernameToEmail(cleanId));
      candidateEmails.push(`${cleanId}@school.kr`);
      candidateEmails.push(`${cleanId}@school.es.kr`);
    }
  }

  let authData: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null = null;
  let lastError: { message?: string } | null = null;

  for (const email of candidateEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.user) {
      authData = data;
      lastError = null;
      break;
    } else {
      lastError = error;
    }
  }

  if (lastError || !authData) {
    // Translate common error messages
    if (lastError?.message?.includes("Invalid login credentials")) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    return { error: lastError?.message || "로그인에 실패했습니다." };
  }

  const role = authData.user?.user_metadata?.role || "operator";
  const matchedEmail = authData.user?.email || rawIdentifier;

  // Import dynamically or at top. Let's import inside or at top.
  // We can import at the top of the file, or use inline import to avoid circular dependencies.
  // Since we don't import auth inside logs, there's no circle. Let's import at top.
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
