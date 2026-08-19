import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidSchoolLogo(logo?: string | null): boolean {
  if (!logo || typeof logo !== "string") return false;
  const trimmed = logo.trim().replace(/^["']|["']$/g, "").trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "{}" || trimmed === "[]") {
    return false;
  }
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export function cleanSchoolName(name?: string | null): string {
  if (!name || typeof name !== "string") return "EduFair Admin";
  let cleaned = name.trim();
  try {
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = JSON.parse(cleaned);
    }
  } catch {
    // ignore JSON parse error
  }
  cleaned = String(cleaned)
    .replace(/^["'\\/]+|["'\\/]+$/g, "")
    .replace(/\\"/g, '"')
    .replace(/^\\/, "")
    .trim();

  while (cleaned.startsWith("\\") || cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1).trim();
  }

  return cleaned || "EduFair Admin";
}
