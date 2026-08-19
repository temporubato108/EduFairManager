"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface RecordParticipationResponse {
  success?: boolean;
  error?: string;
  studentName?: string;
  studentNumber?: string;
}

interface EventJoined {
  name: string;
  allow_double_participation: boolean;
}

/**
 * Validates student QR content and records booth participation with duplicate checking and event logging
 */
export async function recordParticipationAction(
  boothId: string,
  qrCodeContent: string
): Promise<RecordParticipationResponse> {
  if (!boothId || !qrCodeContent) {
    return { error: "필수 파라미터가 누락되었습니다." };
  }

  // 1. Parse QR content. Support full URL (https://.../stampbook?code=eventId:studentId) and raw eventId:studentId
  let cleanCode = qrCodeContent.trim();
  if (cleanCode.includes("code=")) {
    try {
      const url = new URL(cleanCode, "https://placeholder.local");
      const extracted = url.searchParams.get("code");
      if (extracted) cleanCode = extracted;
    } catch {
      const match = cleanCode.match(/[?&]code=([^&]+)/);
      if (match) cleanCode = decodeURIComponent(match[1]);
    }
  }

  const parts = cleanCode.split(":");
  if (parts.length !== 2) {
    return { error: "유효하지 않은 QR 코드 형식입니다." };
  }
  const [eventId, studentId] = parts;

  const supabase = createAdminClient();

  // 2. Fetch Booth details and parent Event policies
  const { data: booth, error: boothError } = await supabase
    .from("booths")
    .select("*, event:events(name, allow_double_participation)")
    .eq("id", boothId)
    .is("deleted_at", null)
    .single();

  if (boothError || !booth) {
    return { error: "부스 정보를 찾을 수 없거나 삭제된 부스입니다." };
  }

  // 3. Verify event matching
  if (booth.event_id !== eventId) {
    return { error: "현재 부스가 속한 행사와 학생 QR의 행사가 일치하지 않습니다." };
  }

  // 4. Fetch Student details
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .single();

  if (studentError || !student) {
    return { error: "해당 행사에 등록되지 않았거나 삭제된 학생입니다." };
  }

  const eventData = booth.event as unknown as EventJoined | null;
  const allowDouble = eventData ? eventData.allow_double_participation : false;

  // 5. Check duplicate participation if policy is set to false (forbidden)
  if (!allowDouble) {
    const { data: existing, error: checkError } = await supabase
      .from("participations")
      .select("id")
      .eq("booth_id", boothId)
      .eq("student_id", studentId)
      .limit(1);

    if (checkError) {
      return { error: "중복 체크 쿼리 중 오류가 발생했습니다." };
    }

    if (existing && existing.length > 0) {
      // Log duplicate scan error
      const { recordLogAction } = await import("@/app/logs/actions");
      await recordLogAction(
        eventId,
        "scan_duplicate_error",
        `${student.student_number} ${student.name} 학생 중복 스캔 시도 차단 (중복 금지 정책).`
      );

      return { error: "이미 이 부스에 참여 완료한 학생입니다." };
    }
  }

  // 6. Record participation
  const { error: insertError } = await supabase.from("participations").insert([
    {
      event_id: eventId,
      booth_id: boothId,
      student_id: studentId,
    },
  ]);

  if (insertError) {
    return { error: `참여 기록 등록 실패: ${insertError.message}` };
  }

  // 7. Log success scan
  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(
    eventId,
    "scan_success",
    `${student.student_number} ${student.name} 학생 스캔 성공 (참여 기록 등록 완료).`
  );

  // Revalidate routes
  revalidatePath("/kiosk");
  
  return {
    success: true,
    studentName: student.name,
    studentNumber: student.student_number,
  };
}
