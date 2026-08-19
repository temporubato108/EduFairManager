"use server";

import { createClient } from "@/lib/supabase/server";
import { parseBoothOperator } from "@/lib/utils";

export interface BoothStat {
  id: string;
  name: string;
  operatorName: string;
  count: number;
}

export interface GradeClassStat {
  grade: string;
  class: string;
  totalStudents: number;
  participatedStudents: number;
  participationCount: number;
}

export interface StudentStat {
  id: string;
  studentNumber: string;
  name: string;
  completedBoothsCount: number;
  completedBoothsList: string[];
}

export interface RawLog {
  timestamp: string;
  studentNumber: string;
  studentName: string;
  boothName: string;
}

export interface StatisticsData {
  boothStats: BoothStat[];
  gradeClassStats: GradeClassStat[];
  studentStats: StudentStat[];
  rawLogs: RawLog[];
  totalStudents: number;
  totalParticipations: number;
}

interface BoothJoined {
  name: string;
  operator: { name: string } | null;
}

interface StudentJoined {
  name: string;
  student_number: string;
}

interface ParticipationRow {
  id: string;
  created_at: string;
  booth_id: string | null;
  student_id: string | null;
  booth: unknown;
  student: unknown;
}

/**
 * Parses grade and class number from typical student number format (e.g. "6학년 1반 23번")
 */
function parseGradeClass(num: string) {
  const match = num.match(/(\d+)학년\s*(\d+)반/) || num.match(/(\d+)-(\d+)/);
  if (match) {
    return { grade: match[1], classNum: match[2] };
  }
  return { grade: "기타", classNum: "기타" };
}

/**
 * Fetch and aggregate event stats (Overall, By Grade/Class, By Booth, By Student, Raw Logs)
 */
export async function getStatisticsDataAction(eventId: string) {
  if (!eventId) {
    return { error: "행사 ID가 누락되었습니다." };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch active booths
    const { data: booths, error: bError } = await supabase
      .from("booths")
      .select("id, name, description, operator:teachers(name)")
      .eq("event_id", eventId)
      .is("deleted_at", null);

    if (bError) throw new Error(bError.message);

    // 2. Fetch active students
    const { data: students, error: sError } = await supabase
      .from("students")
      .select("id, name, student_number")
      .eq("event_id", eventId)
      .is("deleted_at", null);

    if (sError) throw new Error(sError.message);

    // 3. Fetch all participations
    const { data: participations, error: pError } = await supabase
      .from("participations")
      .select("id, booth_id, student_id, booth:booths(name, operator:teachers(name)), student:students(name, student_number)")
      .eq("event_id", eventId);

    if (pError) throw new Error(pError.message);

    const activeStudents = students || [];
    const activeBooths = booths || [];
    const rows = (participations || []) as unknown as ParticipationRow[];

    // ----------------------------------------------------
    // Aggregation 1: Booth Stats
    // ----------------------------------------------------
    const boothStatMap: Record<string, number> = {};
    rows.forEach((p) => {
      if (p.booth_id) {
        boothStatMap[p.booth_id] = (boothStatMap[p.booth_id] || 0) + 1;
      }
    });

    const boothStats: BoothStat[] = activeBooths.map((b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawBooth = b as any;
      const opObj = Array.isArray(rawBooth.operator)
        ? rawBooth.operator[0]
        : rawBooth.operator;
      const { operator_name } = parseBoothOperator({
        description: rawBooth.description,
        operator: opObj,
      });
      return {
        id: b.id,
        name: b.name,
        operatorName: operator_name,
        count: boothStatMap[b.id] || 0,
      };
    });

    // ----------------------------------------------------
    // Aggregation 2: Student Stats
    // ----------------------------------------------------
    // Map of studentId -> list of completed booth names
    const studentCompletionMap: Record<string, string[]> = {};
    rows.forEach((p) => {
      if (p.student_id && p.booth) {
        const boothData = p.booth as unknown as BoothJoined;
        if (!studentCompletionMap[p.student_id]) {
          studentCompletionMap[p.student_id] = [];
        }
        // Avoid adding duplicate booths if event double scans are allowed
        if (!studentCompletionMap[p.student_id].includes(boothData.name)) {
          studentCompletionMap[p.student_id].push(boothData.name);
        }
      }
    });

    const studentStats: StudentStat[] = activeStudents.map((s) => {
      const completedList = studentCompletionMap[s.id] || [];
      return {
        id: s.id,
        studentNumber: s.student_number,
        name: s.name,
        completedBoothsCount: completedList.length,
        completedBoothsList: completedList,
      };
    });

    // ----------------------------------------------------
    // Aggregation 3: Grade / Class Stats
    // ----------------------------------------------------
    const gcMap: Record<string, { total: number; uniqueParticipants: Set<string>; totalScans: number }> = {};

    // First populate total student count per Grade-Class
    activeStudents.forEach((s) => {
      const { grade, classNum } = parseGradeClass(s.student_number);
      const key = `${grade}-${classNum}`;
      if (!gcMap[key]) {
        gcMap[key] = { total: 0, uniqueParticipants: new Set<string>(), totalScans: 0 };
      }
      gcMap[key].total++;
    });

    // Accumulate participations
    rows.forEach((p) => {
      if (!p.student_id) return;
      // Find student number
      const sRow = activeStudents.find((s) => s.id === p.student_id);
      if (!sRow) return;

      const { grade, classNum } = parseGradeClass(sRow.student_number);
      const key = `${grade}-${classNum}`;
      if (!gcMap[key]) {
        gcMap[key] = { total: 0, uniqueParticipants: new Set<string>(), totalScans: 0 };
      }
      gcMap[key].totalScans++;
      gcMap[key].uniqueParticipants.add(p.student_id);
    });

    const gradeClassStats: GradeClassStat[] = Object.entries(gcMap)
      .map(([key, item]) => {
        const [grade, classNum] = key.split("-");
        return {
          grade,
          class: classNum,
          totalStudents: item.total,
          participatedStudents: item.uniqueParticipants.size,
          participationCount: item.totalScans,
        };
      })
      .sort((a, b) => {
        if (a.grade !== b.grade) {
          return a.grade.localeCompare(b.grade, undefined, { numeric: true });
        }
        return a.class.localeCompare(b.class, undefined, { numeric: true });
      });

    // ----------------------------------------------------
    // Aggregation 4: Raw Logs Timeline
    // ----------------------------------------------------
    const sortedRows = [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const rawLogs: RawLog[] = sortedRows.map((r) => {
      const studentData = r.student as unknown as StudentJoined | null;
      const sName = studentData ? studentData.name : "알 수 없는 학생";
      const sNum = studentData ? studentData.student_number : "학번 없음";

      const boothData = r.booth as unknown as BoothJoined | null;
      const bName = boothData ? boothData.name : "알 수 없는 부스";

      return {
        timestamp: r.created_at,
        studentNumber: sNum,
        studentName: sName,
        boothName: bName,
      };
    });

    const statsData: StatisticsData = {
      boothStats,
      gradeClassStats,
      studentStats,
      rawLogs,
      totalStudents: activeStudents.length,
      totalParticipations: rows.length,
    };

    return { success: true, data: statsData };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
