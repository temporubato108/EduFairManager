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

function parseStudentNumber(numStr: string) {
  if (!numStr) return { grade: 999, classNum: 999, number: 999 };

  const matchKorean = numStr.match(/(\d+)\s*학년\s*(\d+)\s*반(?:\s*(\d+)\s*번)?/);
  if (matchKorean) {
    return {
      grade: parseInt(matchKorean[1], 10),
      classNum: parseInt(matchKorean[2], 10),
      number: matchKorean[3] ? parseInt(matchKorean[3], 10) : 0,
    };
  }

  const matchDash = numStr.match(/^(\d+)[-_](\d+)[-_](\d+)$/);
  if (matchDash) {
    return {
      grade: parseInt(matchDash[1], 10),
      classNum: parseInt(matchDash[2], 10),
      number: parseInt(matchDash[3], 10),
    };
  }

  if (/^\d{5}$/.test(numStr)) {
    return {
      grade: parseInt(numStr[0], 10),
      classNum: parseInt(numStr.substring(1, 3), 10),
      number: parseInt(numStr.substring(3, 5), 10),
    };
  }

  if (/^\d{4}$/.test(numStr)) {
    return {
      grade: parseInt(numStr[0], 10),
      classNum: parseInt(numStr[1], 10),
      number: parseInt(numStr.substring(2, 4), 10),
    };
  }

  const nums = numStr.match(/\d+/g);
  if (nums && nums.length >= 3) {
    return {
      grade: parseInt(nums[0], 10),
      classNum: parseInt(nums[1], 10),
      number: parseInt(nums[2], 10),
    };
  }

  return { grade: 999, classNum: 999, number: 999 };
}

/**
 * Fetch all active students for a specific event sorted naturally by grade, class, and number
 */
export async function getStudentsAction(eventId: string): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("event_id", eventId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const students = (data || []).sort((a, b) => {
    const pA = parseStudentNumber(a.student_number);
    const pB = parseStudentNumber(b.student_number);
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
  
  // Generate student ID and QR Code payload
  const studentId = crypto.randomUUID();
  const qrCode = `${eventId}:${studentId}`;

  const adminSupabase = createAdminClient();
  const { data: newStudent, error } = await adminSupabase
    .from("students")
    .insert([
      {
        id: studentId,
        event_id: eventId,
        student_number: data.student_number,
        name: data.name,
        qr_code: qrCode,
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(eventId, "create_student", `학생 추가 완료: 이름='${newStudent.name}', 학번='${newStudent.student_number}'`);

  revalidatePath("/students");
  return { success: true, data: newStudent };
}

/**
 * Bulk import students from Excel file
 */
export async function importStudentsAction(eventId: string, studentsList: StudentInput[]) {
  if (!studentsList || studentsList.length === 0) {
    return { error: "업로드할 학생 데이터가 존재하지 않습니다." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // Map students to database record schema
  const records = studentsList.map((student) => {
    const studentId = crypto.randomUUID();
    const qrCode = `${eventId}:${studentId}`;
    return {
      id: studentId,
      event_id: eventId,
      student_number: student.student_number,
      name: student.name,
      qr_code: qrCode,
    };
  });

  const adminSupabase = createAdminClient();
  // Bulk Insert
  const { data, error } = await adminSupabase
    .from("students")
    .insert(records)
    .select();

  if (error) {
    // Check for duplicate student number key constraint error
    if (error.message.includes("unique_student_number_per_event")) {
      return { error: "중복된 학번이 존재합니다. 엑셀 파일을 다시 확인해주세요." };
    }
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(eventId, "import_students", `학생 Excel 일괄 업로드 완료: 총 ${data?.length || 0}명 등록`);

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
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(updatedStudent.event_id, "update_student", `학생 정보 수정 완료 (ID: ${id}): 이름='${updatedStudent.name}', 학번='${updatedStudent.student_number}'`);

  revalidatePath("/students");
  return { success: true, data: updatedStudent };
}

/**
 * Soft delete a student
 */
export async function deleteStudentAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // Fetch details before soft delete to record event_id, name, and student_number in logs
  const { data: targetStudent } = await supabase
    .from("students")
    .select("event_id, name, student_number")
    .eq("id", id)
    .single();

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("students")
    .update({ deleted_at: new Date().toISOString() })
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
