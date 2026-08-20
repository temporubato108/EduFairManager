/**
 * Authentication and Username / PIN Helper Utilities for EduFairManager
 */

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,20}$/;
export const PIN_REGEX = /^\d{4}$/;

/**
 * Validates whether a username satisfies length, character, and format constraints.
 * Allowed: English letters (a-z, A-Z), numbers (0-9), underscore (_). 4 to 20 chars.
 * No Korean, no spaces, no special symbols.
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = (username || "").trim();
  if (!trimmed) {
    return { valid: false, error: "아이디를 입력해주세요." };
  }
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(trimmed)) {
    return { valid: false, error: "아이디에는 한글을 사용할 수 없습니다. (영문, 숫자, _만 가능)" };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: "아이디에 공백을 포함할 수 없습니다." };
  }
  if (trimmed.length < 4 || trimmed.length > 20) {
    return { valid: false, error: "아이디는 4자 이상 20자 이하이어야 합니다." };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: "아이디는 영문, 숫자, 언더바(_)만 사용할 수 있습니다." };
  }
  return { valid: true };
}

/**
 * Validates a 4-digit numeric recovery PIN.
 */
export function validatePin(pin: string): { valid: boolean; error?: string } {
  const trimmed = (pin || "").trim();
  if (!trimmed) {
    return { valid: false, error: "4자리 복구 PIN을 입력해주세요." };
  }
  if (!PIN_REGEX.test(trimmed)) {
    return { valid: false, error: "복구 PIN은 정확히 4자리 숫자(0-9)이어야 합니다." };
  }
  return { valid: true };
}

/**
 * Converts a plain username (e.g. "hanguk_admin") to a synthetic internal Supabase email ("hanguk_admin@edufair.local").
 * If an actual email is provided (e.g. "admin@school.kr"), preserves it as is.
 */
export function formatUsernameToEmail(input: string): string {
  const clean = (input || "").trim().toLowerCase();
  if (clean.includes("@")) {
    return clean;
  }
  return `${clean}@edufair.kr`;
}

/**
 * Extracts the display username from a synthetic email.
 */
export function extractUsername(emailOrUsername: string): string {
  const clean = (emailOrUsername || "").trim();
  if (clean.endsWith("@edufair.kr")) {
    return clean.replace("@edufair.kr", "");
  }
  if (clean.endsWith("@edufair.local")) {
    return clean.replace("@edufair.local", "");
  }
  return clean;
}
