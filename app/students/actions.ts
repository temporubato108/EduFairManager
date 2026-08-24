"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface StudentInput {
  student_number: string;
  name: string;
}

export interface Student {
  id: string;
  event_id: string;
  student_number: string;
  name: string;
  qr_code: string;
  created_at: string;
}

interface ParsedStudentNumber {
  isExternal: boolean;
  affiliation: string;
  grade: number;
  classNum: number;
  number: number;
}

function parseStudentNumber(numStr: string): ParsedStudentNumber {
  if (!numStr) {
    return { isExternal: false, affiliation: "", grade: 999, classNum: 999, number: 999 };
  }

  // 1. External students (e.g. "[외부] 용산초 1번", "[외부] 유치원 다솜반 1번", "[외부] 1번")
  if (numStr.startsWith("[외부]") || numStr.includes("외부") || numStr.includes("게스트")) {
    let affiliation = "일반";

    if (numStr.startsWith("[외부]")) {
      const after = numStr.replace(/^\[외부\]\s*/, "").trim();
      const matchText = after.match(/^([^0-9]+)/);
      if (matchText && matchText[1].trim()) {
        affiliation = matchText[1].trim();
      }
    } else {
      const matchBracket = numStr.match(/\[([^\]]+)\]/);
      if (matchBracket && matchBracket[1].trim()) {
        affiliation = matchBracket[1].trim();
      }
    }

    const matchNum = numStr.match(/(\d+)\s*번?/);
    const num = matchNum ? parseInt(matchNum[1], 10) : 0;

    return {
      isExternal: true,
      affiliation,
      grade: 999,
      classNum: 999,
      number: num,
    };
  }

  // 2. Korean standard format: "1학년 2반 3번"
  const matchKorean = numStr.match(/(\d+)\s*학년\s*(\d+)\s*반(?:\s*(\d+)\s*번)?/);
  if (matchKorean) {
    return {
      isExternal: false,
      affiliation: "",
      grade: parseInt(matchKorean[1], 10),
      classNum: parseInt(matchKorean[2], 10),
      number: matchKorean[3] ? parseInt(matchKorean[3], 10) : 0,
    };
  }

  // 3. Dash format: "1-2-3"
  const matchDash = numStr.match(/^(\d+)[-_](\d+)[-_](\d+)$/);
  if (matchDash) {
    return {
      isExternal: false,
      affiliation: "",
      grade: parseInt(matchDash[1], 10),
      classNum: parseInt(matchDash[2], 10),
      number: parseInt(matchDash[3], 10),
    };
  }

  // 4. 5-digit number format: "10203"
  if (/^\d{5}$/.test(numStr)) {
    return {
      isExternal: false,
      affiliation: "",
      grade: parseInt(numStr[0], 10),
      classNum: parseInt(numStr.substring(1, 3), 10),
      number: parseInt(numStr.substring(3, 5), 10),
    };
  }

  // 5. 4-digit number format: "1203"
  if (/^\d{4}$/.test(numStr)) {
    return {
      isExternal: false,
      affiliation: "",
      grade: parseInt(numStr[0], 10),
      classNum: parseInt(numStr.substring(1, 2), 10),
      number: parseInt(numStr.substring(2, 4), 10),
    };
  }

  // 6. Fallback numbers
  const nums = numStr.match(/\d+/g);
  if (nums && nums.length >= 3) {
    return {
      isExternal: false,
      affiliation: "",
      grade: parseInt(nums[0], 10),
      classNum: parseInt(nums[1], 10),
      number: parseInt(nums[2], 10),
    };
  }

  return { isExternal: false, affiliation: "", grade: 999, classNum: 999, number: 999 };
}

/**
 * Fetch all active students for a specific event sorted naturally:
 * 1. Regular students: Grade -> Class -> Number
 * 2. External students: Affiliation -> Number
 */
export async function getStudentsAction(eventId: string): Promise<Student[]> {
  const supabase = await createClient();
  let allStudents: Student[] = [];
  let sFrom = 0;
  const sBatchSize = 1000;
  let sHasMore = true;

  while (sHasMore) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .range(sFrom, sFrom + sBatchSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      allStudents = allStudents.concat(data as unknown as Student[]);
      if (data.length < sBatchSize) sHasMore = false;
      else sFrom += sBatchSize;
    } else {
      sHasMore = false;
    }
  }

  const students = allStudents.sort((a, b) => {
    const pA = parseStudentNumber(a.student_number);
    const pB = parseStudentNumber(b.student_number);

    // 1. Regular students come before external participants
    if (pA.isExternal !== pB.isExternal) {
      return pA.isExternal ? 1 : -1;
    }

    // 2. Both external: group by Affiliation first, then Number
    if (pA.isExternal && pB.isExternal) {
      const affDiff = pA.affiliation.localeCompare(pB.affiliation, "ko");
      if (affDiff !== 0) return affDiff;
      if (pA.number !== pB.number) return pA.number - pB.number;
      return a.name.localeCompare(b.name, "ko");
    }

    // 3. Both regular: Grade -> Class -> Number
    if (pA.grade !== pB.grade) return pA.grade - pB.grade;
    if (pA.classNum !== pB.classNum) return pA.classNum - pB.classNum;
    if (pA.number !== pB.number) return pA.number - pB.number;
    return a.name.localeCompare(b.name, "ko");
  });

  return students;
}

/**
 * Create a single student with a custom UUID and computed QR code (eventId:studentId)
 */
export async function createStudentAction(eventId: string, data: StudentInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminSupabase = createAdminClient();
  const trimmedNumber = data.student_number?.trim();

  // 1. Purge any soft-deleted records with this student number or generally in this event
  await adminSupabase
    .from("students")
    .delete()
    .eq("event_id", eventId)
    .not("deleted_at", "is", null);

  // 2. Check if an active student with this student number already exists
  const { data: existingActive } = await adminSupabase
    .from("students")
    .select("id, name, student_number")
    .eq("event_id", eventId)
    .eq("student_number", trimmedNumber)
    .maybeSingle();

  if (existingActive) {
    return { error: `이미 등록되어 있는 학번입니다: ${trimmedNumber} (${existingActive.name})` };
  }
  
  // Generate student ID and QR Code payload
  const studentId = crypto.randomUUID();
  const qrCode = `${eventId}:${studentId}`;

  const { data: newStudent, error } = await adminSupabase
    .from("students")
    .insert([
      {
        id: studentId,
        event_id: eventId,
        student_number: trimmedNumber,
        name: data.name.trim(),
        qr_code: qrCode,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.message.includes("unique_student_number_per_event")) {
      return { error: `이미 등록된 학번입니다: ${trimmedNumber}` };
    }
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(eventId, "create_student", `학생 추가 완료: 이름='${newStudent.name}', 학번='${newStudent.student_number}'`);

  revalidatePath("/students");
  return { success: true, data: newStudent };
}

/**
 * Bulk import students from Excel file or batch registration
 */
export async function importStudentsAction(eventId: string, studentsList: StudentInput[]) {
  if (!studentsList || studentsList.length === 0) {
    return { error: "업로드할 학생 데이터가 존재하지 않습니다." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminSupabase = createAdminClient();

  // 1. Purge any soft-deleted records for this event so they never cause unique constraint collisions
  await adminSupabase
    .from("students")
    .delete()
    .eq("event_id", eventId)
    .not("deleted_at", "is", null);

  // 2. Validate for duplicates within the uploaded list itself
  const duplicatesInList: string[] = [];
  const seenNumbers = new Set<string>();
  for (const s of studentsList) {
    const num = s.student_number?.trim();
    if (!num) continue;
    if (seenNumbers.has(num)) {
      duplicatesInList.push(num);
    }
    seenNumbers.add(num);
  }

  if (duplicatesInList.length > 0) {
    const uniqueDups = Array.from(new Set(duplicatesInList));
    return {
      error: `업로드할 목록 내에 중복된 학번이 존재합니다: ${uniqueDups.slice(0, 5).join(", ")}${uniqueDups.length > 5 ? " 외 다수" : ""}`,
    };
  }

  // 3. Check for collisions against existing active students in this event
  const inputNumbers = Array.from(seenNumbers);
  const { data: existingActive } = await adminSupabase
    .from("students")
    .select("student_number, name")
    .eq("event_id", eventId)
    .in("student_number", inputNumbers);

  if (existingActive && existingActive.length > 0) {
    const conflictList = existingActive.map((s) => `${s.student_number} (${s.name})`);
    return {
      error: `이미 행사에 등록되어 있는 학번입니다: ${conflictList.slice(0, 5).join(", ")}${conflictList.length > 5 ? " 외 다수" : ""}`,
    };
  }

  // 4. Map students to database record schema
  const records = studentsList.map((student) => {
    const studentId = crypto.randomUUID();
    const qrCode = `${eventId}:${studentId}`;
    return {
      id: studentId,
      event_id: eventId,
      student_number: student.student_number.trim(),
      name: student.name.trim(),
      qr_code: qrCode,
    };
  });

  // 5. Bulk Insert
  const { data, error } = await adminSupabase
    .from("students")
    .insert(records)
    .select();

  if (error) {
    if (error.message.includes("unique_student_number_per_event")) {
      return { error: "중복된 학번이 존재합니다. 학생 목록을 다시 확인해주세요." };
    }
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(eventId, "import_students", `학생 일괄 업로드 완료: 총 ${data?.length || 0}명 등록`);

  revalidatePath("/students");
  return { success: true, count: data?.length || 0 };
}

/**
 * Update an existing student's details
 */
export async function updateStudentAction(id: string, data: Partial<StudentInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminSupabase = createAdminClient();
  const { data: updatedStudent, error } = await adminSupabase
    .from("students")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.message.includes("unique_student_number_per_event")) {
      return { error: "이미 다른 학생에게 사용 중인 학번입니다." };
    }
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(updatedStudent.event_id, "update_student", `학생 정보 수정 완료 (ID: ${id}): 이름='${updatedStudent.name}', 학번='${updatedStudent.student_number}'`);

  revalidatePath("/students");
  return { success: true, data: updatedStudent };
}

/**
 * Permanently delete a single student
 */
export async function deleteStudentAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminSupabase = createAdminClient();

  // Fetch details before delete to record event_id, name, and student_number in logs
  const { data: targetStudent } = await adminSupabase
    .from("students")
    .select("event_id, name, student_number")
    .eq("id", id)
    .maybeSingle();

  // Delete associated participations first
  await adminSupabase
    .from("participations")
    .delete()
    .eq("student_id", id);

  const { error } = await adminSupabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(
    targetStudent ? targetStudent.event_id : null,
    "delete_student",
    `학생 삭제 완료: 이름='${targetStudent ? targetStudent.name : "알 수 없음"}', 학번='${targetStudent ? targetStudent.student_number : ""}' (ID: ${id})`
  );

  revalidatePath("/students");
  return { success: true };
}

/**
 * Permanently delete multiple students at once
 */
export async function deleteStudentsBatchAction(ids: string[], eventId?: string) {
  if (!ids || ids.length === 0) {
    return { error: "삭제할 학생이 선택되지 않았습니다." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminSupabase = createAdminClient();

  // Delete associated participations first
  await adminSupabase
    .from("participations")
    .delete()
    .in("student_id", ids);

  const { error } = await adminSupabase
    .from("students")
    .delete()
    .in("id", ids);

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(
    eventId || null,
    "delete_students_batch",
    `학생 일괄 삭제 완료: 총 ${ids.length}명 삭제 처리`
  );

  revalidatePath("/students");
  return { success: true, count: ids.length };
}
