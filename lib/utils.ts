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

export function parseBoothOperator(booth: {
  operator_name?: string | null;
  description?: string | null;
  operator?: { name: string } | null;
}): { operator_name: string; description: string | null } {
  let operatorName = "미지정";
  let description = booth.description || null;

  if (booth.operator_name && booth.operator_name.trim() && booth.operator_name.trim() !== "미지정") {
    operatorName = booth.operator_name.trim();
  }

  if (description && description.includes("<!--op:")) {
    const match = description.match(/<!--op:(.*?)-->/);
    if (match && match[1]) {
      if (operatorName === "미지정") {
        operatorName = match[1].trim();
      }
      description = description.replace(/<!--op:.*?-->\s*/g, "").trim() || null;
    }
  }

  if (operatorName === "미지정" && booth.operator && booth.operator.name) {
    operatorName = booth.operator.name;
  }

  return { operator_name: operatorName, description };
}

export function encodeBoothDescription(
  description?: string | null,
  operatorName?: string | null
): string | null {
  const cleanDesc = (description || "").replace(/<!--op:.*?-->\s*/g, "").trim();
  const cleanOp = (operatorName || "").trim();

  if (cleanOp && cleanOp !== "미지정") {
    return `<!--op:${cleanOp}-->${cleanDesc}`;
  }
  return cleanDesc || null;
}

