"use server";

import { createAdminClient } from "@/lib/supabase/server";

interface RecordParticipationResponse {
  success?: boolean;
  error?: string;
  title?: string;
  studentName?: string;
  studentNumber?: string;
}

interface EventJoined {
  name: string;
  status: "ready" | "progress" | "end" | string;
  allow_double_participation: boolean;
}

function normalizeStudentNumber(str: string): { grade: number; classNum: number; studentNum: number } | null {
  if (!str) return null;
  const clean = str.trim().replace(/\s+/g, "");

  // 1. Korean format: e.g. "1학년1반1번", "6학년3반24번"
  const korMatch = clean.match(/^(\d+)학년(\d+)반(\d+)번?$/);
  if (korMatch) {
    return {
      grade: parseInt(korMatch[1], 10),
      classNum: parseInt(korMatch[2], 10),
      studentNum: parseInt(korMatch[3], 10),
    };
  }

  // 2. Dash/slash/dot separated: e.g. "1-1-1", "1/1/1", "1.1.1", "1_1_1"
  const sepMatch = clean.match(/^(\d+)[-_./](\d+)[-_./](\d+)$/);
  if (sepMatch) {
    return {
      grade: parseInt(sepMatch[1], 10),
      classNum: parseInt(sepMatch[2], 10),
      studentNum: parseInt(sepMatch[3], 10),
    };
  }

  // 3. 5-digit format: e.g. "10101" -> 1학년 01반 01번
  if (/^\d{5}$/.test(clean)) {
    return {
      grade: parseInt(clean[0], 10),
      classNum: parseInt(clean.substring(1, 3), 10),
      studentNum: parseInt(clean.substring(3, 5), 10),
    };
  }

  // 4. 4-digit format: e.g. "1101" -> 1학년 1반 01번
  if (/^\d{4}$/.test(clean)) {
    return {
      grade: parseInt(clean[0], 10),
      classNum: parseInt(clean[1], 10),
      studentNum: parseInt(clean.substring(2, 4), 10),
    };
  }

  // 5. 3-digit format: e.g. "111" -> 1학년 1반 1번
  if (/^\d{3}$/.test(clean)) {
    return {
      grade: parseInt(clean[0], 10),
      classNum: parseInt(clean[1], 10),
      studentNum: parseInt(clean[2], 10),
    };
  }

  return null;
}

/**
 * Validates student QR content or manual student number (e.g. 10101, 1-1-1, 1학년 1반 1번)
 * and records booth participation with duplicate check and logging.
 */
export async function recordParticipationAction(
  boothId: string,
  inputContent: string
): Promise<RecordParticipationResponse> {
  if (!boothId || !inputContent) {
    return { error: "필수 파라미터가 누락되었습니다." };
  }

  const supabase = createAdminClient();

  // 1. Fetch Booth and Event Configuration
  const { data: booth, error: boothError } = await supabase
    .from("booths")
    .select("*, event:events(name, status, allow_double_participation)")
    .eq("id", boothId)
    .is("deleted_at", null)
    .single();

  if (boothError || !booth) {
    return { error: "부스 정보를 찾을 수 없거나 삭제된 부스입니다." };
  }

  const eventId = booth.event_id;
  const eventData = booth.event as unknown as EventJoined | null;
  const eventStatus = eventData?.status || "ready";

  // Check Event Active Status
  if (eventStatus === "ready") {
    import("@/app/logs/actions").then(({ recordLogAction }) => {
      recordLogAction(
        eventId,
        "scan_status_blocked",
        `행사 시작 전 부스 스캔 시도 차단 (행사 상태: 준비).`
      ).catch(() => {});
    });
    return {
      error: "행사가 시작되지 않았습니다.",
      title: "행사 준비 중",
    };
  }

  if (eventStatus === "end") {
    import("@/app/logs/actions").then(({ recordLogAction }) => {
      recordLogAction(
        eventId,
        "scan_status_blocked",
        `종료된 행사 부스 스캔 시도 차단 (행사 상태: 종료).`
      ).catch(() => {});
    });
    return {
      error: "이미 종료된 행사입니다.",
      title: "행사 종료",
    };
  }

  // 2. Parse input: Can be full URL, eventId:studentId, or manual student number
  let cleanCode = inputContent.trim();
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

  let studentId: string | null = null;
  let targetStudent: { id: string; event_id: string; name: string; student_number: string } | null = null;

  // Case A: QR Code scan format "eventId:studentId"
  const parts = cleanCode.split(":");
  if (parts.length === 2 && parts[0].length > 10 && parts[1].length > 10) {
    const [qrEventId, qrStudentId] = parts;
    if (qrEventId !== eventId) {
      return { error: "현재 부스가 속한 행사와 학생 QR의 행사가 일치하지 않습니다." };
    }
    studentId = qrStudentId;

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, event_id, name, student_number")
      .eq("id", studentId)
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .single();

    if (studentError || !studentData) {
      return { error: "해당 행사에 등록되지 않았거나 삭제된 학생입니다." };
    }
    targetStudent = studentData;
  } else {
    // Case B: Direct student number (or name) input in the current event (chunked for >1000 students)
    let allStudents: { id: string; event_id: string; name: string; student_number: string }[] = [];
    let sFrom = 0;
    const sBatchSize = 1000;
    let sHasMore = true;

    while (sHasMore) {
      const { data, error: studentsError } = await supabase
        .from("students")
        .select("id, event_id, name, student_number")
        .eq("event_id", eventId)
        .is("deleted_at", null)
        .range(sFrom, sFrom + sBatchSize - 1);

      if (studentsError) throw new Error(studentsError.message);

      if (data && data.length > 0) {
        allStudents = allStudents.concat(data);
        if (data.length < sBatchSize) sHasMore = false;
        else sFrom += sBatchSize;
      } else {
        sHasMore = false;
      }
    }

    if (allStudents.length === 0) {
      return { error: "해당 행사에 등록된 학생이 없습니다." };
    }

    // 1) Direct exact match on student_number
    let matched = allStudents.filter(
      (s) =>
        s.student_number?.trim() === cleanCode ||
        s.student_number?.replace(/\s+/g, "") === cleanCode.replace(/\s+/g, "")
    );

    // 2) Normalized Grade-Class-Number matching (e.g., "10101" vs "1학년 1반 1번")
    if (matched.length === 0) {
      const inputParsed = normalizeStudentNumber(cleanCode);
      if (inputParsed) {
        matched = allStudents.filter((s) => {
          const sParsed = normalizeStudentNumber(s.student_number);
          if (!sParsed) return false;
          return (
            sParsed.grade === inputParsed.grade &&
            sParsed.classNum === inputParsed.classNum &&
            sParsed.studentNum === inputParsed.studentNum
          );
        });
      }
    }

    // 3) Exact match on student name
    if (matched.length === 0) {
      matched = allStudents.filter((s) => s.name?.trim() === cleanCode);
    }

    if (matched.length === 0) {
      return {
        error: `입력하신 '${cleanCode}'에 해당하는 학생을 찾을 수 없습니다. 학번을 다시 확인해주세요.`,
      };
    }

    if (matched.length > 1) {
      return {
        error: `'${cleanCode}' 검색 결과가 ${matched.length}명 있습니다. 정확한 학번(예: 10101 또는 1학년 1반 1번)으로 입력해주세요.`,
      };
    }

    targetStudent = matched[0];
    studentId = targetStudent.id;
  }

  if (!targetStudent || !studentId) {
    return { error: "학생 정보를 확인할 수 없습니다." };
  }

  // 3. Check duplicate participation if policy is set to false (forbidden)
  const allowDouble = eventData ? eventData.allow_double_participation : false;

  if (!allowDouble) {
    const { data: existing } = await supabase
      .from("participations")
      .select("id")
      .eq("booth_id", boothId)
      .eq("student_id", studentId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Log duplicate scan/input error in background (non-blocking)
      import("@/app/logs/actions").then(({ recordLogAction }) => {
        recordLogAction(
          eventId,
          "scan_duplicate_error",
          `${targetStudent!.student_number} ${targetStudent!.name} 학생 중복 참여 시도 차단 (중복 금지 정책).`
        ).catch(() => {});
      });

      return { error: "이미 이 부스에 참여 완료한 학생입니다." };
    }
  }

  // 4. Record participation
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

  // 5. Log success scan/input in background without delaying user feedback
  import("@/app/logs/actions").then(({ recordLogAction }) => {
    recordLogAction(
      eventId,
      "scan_success",
      `${targetStudent!.student_number} ${targetStudent!.name} 학생 부스 참여 등록 완료 (${cleanCode.includes(":") ? "QR 스캔" : "학번 직접입력"}).`
    ).catch(() => {});
  });

  return {
    success: true,
    studentName: targetStudent.name,
    studentNumber: targetStudent.student_number,
  };
}
