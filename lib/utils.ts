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
