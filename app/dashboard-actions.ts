"use server";

import { createClient } from "@/lib/supabase/server";
import { parseBoothOperator } from "@/lib/utils";

export interface BoothRanking {
  boothId: string;
  name: string;
  operatorName: string;
  count: number;
}

export interface RecentScan {
  id: string;
  createdAt: string;
  studentName: string;
  studentNumber: string;
  boothName: string;
}

export interface DashboardData {
  totalStudents: number;
  participatedStudents: number;
  totalParticipations: number;
  averageParticipation: number;
  popularBooths: BoothRanking[];
  recentParticipations: RecentScan[];
}

interface BoothJoined {
  name: string;
  operator_name?: string | null;
  description?: string | null;
  operator?: { name: string } | null;
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
 * Fetch and aggregate live dashboard metrics for a specific event
 */
export async function getAdminDashboardDataAction(eventId: string) {
  if (!eventId) {
    return { error: "행사 ID가 누락되었습니다." };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch total students registered for this event
    const { count: totalStudents, error: tsError } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("deleted_at", null);

    if (tsError) throw new Error(tsError.message);

    // 2. Fetch all participations with created_at to aggregate statistics
    const { data: participations, error: pError } = await supabase
      .from("participations")
      .select("id, created_at, booth_id, student_id, booth:booths(name, description, operator:teachers(name)), student:students(name, student_number)")
      .eq("event_id", eventId);

    if (pError) throw new Error(pError.message);

    const rows = (participations || []) as unknown as ParticipationRow[];
    const totalPCount = rows.length;

    // 3. Compute unique participated students count
    const uniqueStudents = new Set<string>();
    rows.forEach((p) => {
      if (p.student_id) {
        uniqueStudents.add(p.student_id);
      }
    });
    const participatedCount = uniqueStudents.size;

    // 4. Compute average participation (Scans / Total Students)
    const totalStudentsNum = totalStudents || 0;
    const avgParticipation =
      totalStudentsNum > 0 ? Number((totalPCount / totalStudentsNum).toFixed(1)) : 0;

    // 5. Aggregate popular booths
    const boothMap: Record<string, { name: string; operatorName: string; count: number }> = {};
    rows.forEach((p) => {
      const bId = p.booth_id;
      if (!bId) return;

      const boothData = p.booth as unknown as BoothJoined | null;
      const bName = boothData ? boothData.name : "알 수 없는 부스";
      const parsedBooth = boothData ? parseBoothOperator(boothData) : { operator_name: "미지정" };
      const opName = parsedBooth.operator_name;

      if (!boothMap[bId]) {
        boothMap[bId] = { name: bName, operatorName: opName, count: 0 };
      }
      boothMap[bId].count++;
    });

    const popularBooths = Object.entries(boothMap)
      .map(([boothId, item]) => ({
        boothId,
        name: item.name,
        operatorName: item.operatorName,
        count: item.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 6. Format recent participations (last 6 items)
    // Sort chronologically by actual created_at timestamp
    const sortedRecent = [...rows]
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 6);

    const recentList = sortedRecent.map((r) => {
      const studentData = r.student as unknown as StudentJoined | null;
      const sName = studentData ? studentData.name : "알 수 없는 학생";
      const sNum = studentData ? studentData.student_number : "학번 없음";
      
      const boothData = r.booth as unknown as BoothJoined | null;
      const bName = boothData ? boothData.name : "알 수 없는 부스";

      return {
        id: r.id,
        createdAt: r.created_at || new Date().toISOString(),
        studentName: sName,
        studentNumber: sNum,
        boothName: bName,
      };
    });

    const dashboardData: DashboardData = {
      totalStudents: totalStudentsNum,
      participatedStudents: participatedCount,
      totalParticipations: totalPCount,
      averageParticipation: avgParticipation,
      popularBooths,
      recentParticipations: recentList,
    };

    return { success: true, data: dashboardData };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
