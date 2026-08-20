"use server";

import { createClient } from "@/lib/supabase/server";
import { parseBoothOperator } from "@/lib/utils";

export interface StudentInfo {
  id: string;
  name: string;
  studentNumber: string;
}

export interface EventInfo {
  id: string;
  name: string;
}

export interface StampbookBooth {
  id: string;
  name: string;
  description: string | null;
  operator_name?: string | null;
}

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  studentNumber: string;
  completedCount: number;
  rank: number;
}

export interface StudentStampbookData {
  student: StudentInfo;
  event: EventInfo;
  booths: StampbookBooth[];
  completedBoothIds: string[];
  completedBoothTimes: Record<string, string>;
  leaderboard: LeaderboardEntry[];
  myRank: number;
}

interface StudentRow {
  id: string;
  name: string;
  student_number: string;
  event_id: string;
}

interface ParticipationRow {
  id: string;
  created_at: string;
  booth_id: string;
  student_id: string;
}

/**
 * Fetch a student's digital stampbook status, event details, booth completion states, and live leaderboard.
 */
export async function getStudentStampbookAction(eventId: string, studentId: string) {
  if (!eventId || !studentId) {
    return { error: "행사 ID와 학생 ID가 필요합니다." };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch student details
    const { data: student, error: sError } = await supabase
      .from("students")
      .select("id, name, student_number, event_id")
      .eq("id", studentId)
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .single();

    if (sError) {
      return { error: "등록된 학생 정보를 찾을 수 없습니다." };
    }

    const studentRow = student as unknown as StudentRow;

    // 2. Fetch event details
    const { data: event, error: eError } = await supabase
      .from("events")
      .select("id, name")
      .eq("id", eventId)
      .single();

    if (eError) {
      return { error: "행사 정보를 불러올 수 없습니다." };
    }

    const eventInfo: EventInfo = {
      id: event.id,
      name: event.name,
    };

    // 3. Fetch all active booths for this event with operator info
    const { data: booths, error: bError } = await supabase
      .from("booths")
      .select("id, name, description, operator:teachers(name)")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("name");

    if (bError) throw new Error(bError.message);

    const stampbookBooths: StampbookBooth[] = (booths || []).map((b) => {
      const parsed = parseBoothOperator({
        description: b.description,
        operator: b.operator as unknown as { name: string } | null,
      });
      return {
        id: b.id,
        name: b.name,
        description: parsed.description,
        operator_name: parsed.operator_name !== "미지정" ? parsed.operator_name : null,
      };
    });

    // 4. Fetch this student's participations
    const { data: participations, error: pError } = await supabase
      .from("participations")
      .select("id, booth_id, student_id")
      .eq("student_id", studentId)
      .eq("event_id", eventId);

    if (pError) throw new Error(pError.message);

    const myScans = (participations || []) as unknown as ParticipationRow[];

    // Map completed booths
    const completedBoothIds = Array.from(new Set(myScans.map((p) => p.booth_id)));
    const completedBoothTimes: Record<string, string> = {};
    myScans.forEach((p) => {
      // Keep the earliest scan timestamp if duplicate scans exist
      if (!completedBoothTimes[p.booth_id]) {
        completedBoothTimes[p.booth_id] = p.created_at;
      }
    });

    // ----------------------------------------------------
    // Aggregation 5: Live Student Leaderboard
    // ----------------------------------------------------
    // Fetch all active students in the event
    const { data: allStudents, error: asError } = await supabase
      .from("students")
      .select("id, name, student_number")
      .eq("event_id", eventId)
      .is("deleted_at", null);

    if (asError) throw new Error(asError.message);

    interface DBStudentRow {
      id: string;
      name: string;
      student_number: string;
    }

    const studentList: StudentInfo[] = ((allStudents || []) as unknown as DBStudentRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      studentNumber: s.student_number,
    }));

    // Fetch all participations in the event
    const { data: allParts, error: apError } = await supabase
      .from("participations")
      .select("id, booth_id, student_id")
      .eq("event_id", eventId);

    if (apError) throw new Error(apError.message);

    const allScans = (allParts || []) as unknown as ParticipationRow[];

    // Compute unique completed booths count for each student
    const studentCompletionCounts: Record<string, Set<string>> = {};
    studentList.forEach((s) => {
      studentCompletionCounts[s.id] = new Set<string>();
    });

    allScans.forEach((p) => {
      if (p.student_id && p.booth_id && studentCompletionCounts[p.student_id]) {
        studentCompletionCounts[p.student_id].add(p.booth_id);
      }
    });

    const leaderboardList = studentList.map((s) => ({
      studentId: s.id,
      name: s.name,
      studentNumber: s.studentNumber,
      completedCount: studentCompletionCounts[s.id].size,
    }));

    // Sort descending by count, then sort ascending by class number and name
    leaderboardList.sort((a, b) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true });
    });

    // Assign Ranks (handling ties)
    let currentRank = 1;
    let prevCount = -1;
    const rankedLeaderboard: LeaderboardEntry[] = leaderboardList.map((item, idx) => {
      if (item.completedCount !== prevCount) {
        currentRank = idx + 1;
        prevCount = item.completedCount;
      }
      return {
        studentId: item.studentId,
        name: item.name,
        studentNumber: item.studentNumber,
        completedCount: item.completedCount,
        rank: currentRank,
      };
    });

    const myRank = rankedLeaderboard.find((x) => x.studentId === studentId)?.rank || 0;

    const data: StudentStampbookData = {
      student: {
        id: studentRow.id,
        name: studentRow.name,
        studentNumber: studentRow.student_number,
      },
      event: eventInfo,
      booths: stampbookBooths,
      completedBoothIds,
      completedBoothTimes,
      leaderboard: rankedLeaderboard.slice(0, 10), // Top 10 students
      myRank,
    };

    return { success: true, data };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
