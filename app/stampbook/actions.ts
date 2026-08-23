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
  allow_double_participation: boolean;
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
  uniqueBoothCount: number;
  totalScans: number;
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
  scanned_at?: string;
  created_at?: string;
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
      .select("id, name, allow_double_participation")
      .eq("id", eventId)
      .single();

    if (eError) {
      return { error: "행사 정보를 불러올 수 없습니다." };
    }

    const eventInfo: EventInfo = {
      id: event.id,
      name: event.name,
      allow_double_participation: Boolean(event.allow_double_participation),
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
      .select("id, scanned_at, booth_id, student_id")
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
        completedBoothTimes[p.booth_id] = p.scanned_at || p.created_at || "";
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

    // Compute unique completed booths count and total scans for each student
    const studentCompletionCounts: Record<string, Set<string>> = {};
    const studentTotalScans: Record<string, number> = {};
    studentList.forEach((s) => {
      studentCompletionCounts[s.id] = new Set<string>();
      studentTotalScans[s.id] = 0;
    });

    allScans.forEach((p) => {
      if (p.student_id && studentTotalScans[p.student_id] !== undefined) {
        studentTotalScans[p.student_id]++;
        if (p.booth_id) {
          studentCompletionCounts[p.student_id].add(p.booth_id);
        }
      }
    });

    const isDoubleAllowed = Boolean(event.allow_double_participation);

    const leaderboardList = studentList.map((s) => {
      const uniqueCount = studentCompletionCounts[s.id].size;
      const totalScans = studentTotalScans[s.id] || 0;
      return {
        studentId: s.id,
        name: s.name,
        studentNumber: s.studentNumber,
        completedCount: uniqueCount,
        uniqueBoothCount: uniqueCount,
        totalScans: totalScans,
      };
    });

    // Sort descending by completedCount (stamps), then totalScans (participation count), then class number and name
    leaderboardList.sort((a, b) => {
      // 1. 스탬프 개수 우선
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      // 2. 부스 참여 횟수 우선
      if (b.totalScans !== a.totalScans) {
        return b.totalScans - a.totalScans;
      }
      // 3. 반 번호 순 정렬
      return a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true });
    });

    // Assign Ranks (동률 시 동일 순위 부여)
    let currentRank = 1;
    let prevStamps = -1;
    let prevScans = -1;

    const rankedLeaderboard: LeaderboardEntry[] = leaderboardList.map((item, idx) => {
      if (item.completedCount !== prevStamps || item.totalScans !== prevScans) {
        currentRank = idx + 1;
        prevStamps = item.completedCount;
        prevScans = item.totalScans;
      }
      return {
        studentId: item.studentId,
        name: item.name,
        studentNumber: item.studentNumber,
        completedCount: item.completedCount,
        uniqueBoothCount: item.uniqueBoothCount,
        totalScans: item.totalScans,
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
      leaderboard: rankedLeaderboard.slice(0, 30), // Top 30 students
      myRank,
    };

    return { success: true, data };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
