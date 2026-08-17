"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Download,
  Search,
  Loader2,
  Calendar,
  AlertTriangle,
  Users,
  CheckCircle2,
  Check,
} from "lucide-react";
import { getStatisticsDataAction, StatisticsData } from "./actions";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface StatisticsClientPageProps {
  initialEvents: EventOption[];
}

const COLORS = ["#00E5FF", "#3b82f6", "#a855f7", "#eab308", "#f97316", "#ef4444"];

export function StatisticsClientPage({ initialEvents }: StatisticsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overall" | "grade" | "booth" | "student">("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Set default event
  useEffect(() => {
    if (initialEvents.length > 0) {
      setSelectedEventId(initialEvents[0].id);
    }
  }, [initialEvents]);

  // Set mounted flag to prevent Recharts SSR hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchStats = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const res = await getStatisticsDataAction(eventId);
      if (res.error) {
        setErrorMessage(res.error);
        setStatsData(null);
      } else if (res.data) {
        setStatsData(res.data);
        setErrorMessage(null);
      }
    } catch (err) {
      const errorObj = err as Error;
      setErrorMessage(`통계 로딩 실패: ${errorObj.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchStats(selectedEventId);
    }
  }, [selectedEventId, fetchStats]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const getSelectedEventName = () => {
    const ev = initialEvents.find((e) => e.id === selectedEventId);
    return ev ? ev.name : "행사";
  };

  // ----------------------------------------------------
  // Excel Export Handler (using SheetJS)
  // ----------------------------------------------------
  const handleExcelExport = () => {
    if (!statsData) return;
    const eventName = getSelectedEventName();

    // Sheet 1: Booth Stats
    const boothRows = statsData.boothStats.map((b) => ({
      "부스명": b.name,
      "담당 교사": b.operatorName,
      "스캔/참여 횟수": b.count,
    }));

    // Sheet 2: Student Stampbook Summary
    const studentRows = statsData.studentStats.map((s) => ({
      "학번 (학년-반-번호)": s.studentNumber,
      "이름": s.name,
      "완료한 부스 개수": s.completedBoothsCount,
      "완료한 부스 목록": s.completedBoothsList.join(", "),
    }));

    // Sheet 3: Raw Scans Log Timeline
    const logRows = statsData.rawLogs.map((l) => ({
      "스캔 시각": new Date(l.timestamp).toLocaleString("ko-KR"),
      "학번": l.studentNumber,
      "학생 이름": l.studentName,
      "체험 부스명": l.boothName,
    }));

    const wb = XLSX.utils.book_new();

    const wsBooths = XLSX.utils.json_to_sheet(boothRows);
    XLSX.utils.book_append_sheet(wb, wsBooths, "부스별 실적 대장");

    const wsStudents = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, wsStudents, "학생별 스탬프 현황");

    const wsLogs = XLSX.utils.json_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, wsLogs, "전체 스캔 로그");

    // Save File
    XLSX.writeFile(wb, `${eventName}_통계_보고서.xlsx`);
  };

  // Filter student lists
  const filteredStudents = statsData
    ? statsData.studentStats.filter(
        (s) =>
          s.name.includes(searchQuery) ||
          s.studentNumber.includes(searchQuery) ||
          s.completedBoothsList.some((b) => b.includes(searchQuery))
      )
    : [];

  // Group grade statistics for charting
  const gradeChartData = statsData
    ? Object.values(
        statsData.gradeClassStats.reduce<
          Record<string, { name: string; "도장 스캔수": number; "실 참여인원": number }>
        >((acc, row) => {
          const gName = `${row.grade}학년`;
          if (!acc[gName]) {
            acc[gName] = { name: gName, "도장 스캔수": 0, "실 참여인원": 0 };
          }
          acc[gName]["도장 스캔수"] += row.participationCount;
          acc[gName]["실 참여인원"] += row.participatedStudents;
          return acc;
        }, {})
      )
    : [];

  // Sort grade class stats by grade and class for presentation
  const sortedBoothStatsForChart = statsData
    ? [...statsData.boothStats].sort((a, b) => b.count - a.count)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Title and control bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF]">행사 통계 분석</h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              행사 실적, 학년별 통계, 부스별 인기 랭킹 및 학생별 개별 현황을 조회합니다.
            </p>
          </div>

          {statsData && (
            <Button
              onClick={handleExcelExport}
              className="bg-[#32D74B] hover:bg-[#2bc443] text-black font-extrabold flex items-center gap-2 rounded-xl self-start sm:self-auto shadow-lg shadow-emerald-950/10"
            >
              <Download className="h-4.5 w-4.5" />
              <span>엑셀 다운로드</span>
            </Button>
          )}
        </div>

        {/* Event selection Card */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-64 space-y-1">
              <Label className="text-slate-500 dark:text-[#98989D] text-xs">대상 행사 선택</Label>
              <Select value={selectedEventId} onValueChange={(val) => val && handleEventChange(val)}>
                <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white">
                  <SelectValue placeholder="행사를 선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                  {initialEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {errorMessage && (
              <div className="text-xs text-[#FF453A] bg-[#3A1C1C] px-3 py-2 rounded-lg border border-red-900/30 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Tab navigation */}
        {selectedEventId && (
          <div className="flex border-b border-slate-200 dark:border-[#2C2C2E] gap-2 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab("overall")}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === "overall"
                  ? "border-[#00E5FF] text-[#00E5FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              전체 요약
            </button>
            <button
              onClick={() => setActiveTab("grade")}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === "grade"
                  ? "border-[#00E5FF] text-[#00E5FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              학년/학반별
            </button>
            <button
              onClick={() => setActiveTab("booth")}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === "booth"
                  ? "border-[#00E5FF] text-[#00E5FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              부스별 통계
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === "student"
                  ? "border-[#00E5FF] text-[#00E5FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              학생별 참여대장
            </button>
          </div>
        )}

        {/* Content Area */}
        {!selectedEventId ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-[#98989D]">
            <Calendar className="h-12 w-12 text-slate-300 dark:text-[#2C2C2E] mb-4" />
            <p className="text-base">조회할 행사를 상단 필터에서 먼저 선택해 주세요.</p>
          </div>
        ) : loading && !statsData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-[#98989D]">
            <Loader2 className="h-10 w-10 animate-spin text-[#00E5FF] mb-4" />
            <p className="text-sm">행사 참여 및 스캔 지표 수집하는 중...</p>
          </div>
        ) : statsData ? (
          <div className="space-y-6">
            
            {/* Tab 1: Overall Summary */}
            {activeTab === "overall" && (
              <div className="space-y-6">
                
                {/* 3 Metric Cards */}
                <div className="grid gap-6 sm:grid-cols-3">
                  <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3 text-indigo-500">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase">전체 학생</p>
                        <h3 className="text-2xl font-extrabold font-mono text-slate-800 dark:text-white">
                          {statsData.totalStudents}명
                        </h3>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/40 p-3 text-[#00E5FF]">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase">누적 스캔</p>
                        <h3 className="text-2xl font-extrabold font-mono text-slate-800 dark:text-white">
                          {statsData.totalParticipations}회
                        </h3>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-amber-500">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase">1인당 평균 참여</p>
                        <h3 className="text-2xl font-extrabold font-mono text-slate-800 dark:text-white">
                          {statsData.totalStudents > 0
                            ? (statsData.totalParticipations / statsData.totalStudents).toFixed(1)
                            : "0.0"}회
                        </h3>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main chart panels */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">부스별 참여도 비교</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isMounted ? (
                        <div className="w-full h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedBoothStatsForChart.slice(0, 8)}>
                              <XAxis dataKey="name" stroke="#98989D" fontSize={10} tickLine={false} />
                              <YAxis stroke="#98989D" fontSize={10} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#1E1E1E", borderColor: "#2C2C2E", color: "#FFF" }}
                              />
                              <Bar dataKey="count" fill="#00E5FF" radius={[4, 4, 0, 0]} name="스캔수" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-slate-500">차트 렌더링 준비 중...</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">학년별 누적 스탬프 분포</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isMounted ? (
                        <div className="w-full h-80 flex justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={gradeChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${typeof percent === "number" ? (percent * 100).toFixed(0) : "0"}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="도장 스캔수"
                              >
                                {gradeChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-slate-500">차트 렌더링 준비 중...</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Tab 2: Grade / Class statistics */}
            {activeTab === "grade" && (
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-white">학년 / 학반별 참여 비율</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    각 학급별 실 참여율 및 1인당 스탬프 취득 평균을 보여줍니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#2C2C2E] text-slate-400 text-xs">
                          <th className="p-3 font-semibold">학년</th>
                          <th className="p-3 font-semibold">반</th>
                          <th className="p-3 font-semibold text-right">총 학생 수</th>
                          <th className="p-3 font-semibold text-right">참가 인원</th>
                          <th className="p-3 font-semibold text-right">실제 참여율</th>
                          <th className="p-3 font-semibold text-right">누적 스탬프</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/40 text-slate-700 dark:text-slate-300">
                        {statsData.gradeClassStats.map((row, idx) => {
                          const rate = row.totalStudents > 0 ? Math.round((row.participatedStudents / row.totalStudents) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#121212]/30">
                              <td className="p-3 font-semibold">{row.grade}학년</td>
                              <td className="p-3">{row.class}반</td>
                              <td className="p-3 text-right font-mono">{row.totalStudents}명</td>
                              <td className="p-3 text-right font-mono">{row.participatedStudents}명</td>
                              <td className="p-3 text-right font-mono">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-bold",
                                  rate >= 80 ? "bg-emerald-50 text-emerald-800 dark:bg-[#1C3A27] dark:text-[#32D74B]" :
                                  rate >= 50 ? "bg-amber-50 text-amber-800 dark:bg-[#3A2E1C] dark:text-[#EAB308]" :
                                  "bg-rose-50 text-rose-800 dark:bg-[#3A1C1C] dark:text-[#FF453A]"
                                )}>
                                  {rate}%
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-white">
                                {row.participationCount}회
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 3: Booth statistics */}
            {activeTab === "booth" && (
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-white">부스별 참여 실적 대장</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    부스별로 담당 교사 정보와 누적 인식 건수를 노출합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-[#2C2C2E] text-slate-400 text-xs">
                          <th className="p-3 font-semibold">순위</th>
                          <th className="p-3 font-semibold">부스명</th>
                          <th className="p-3 font-semibold">담당교사</th>
                          <th className="p-3 font-semibold text-right">총 스캔 횟수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/40 text-slate-700 dark:text-slate-300">
                        {sortedBoothStatsForChart.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-[#121212]/30">
                            <td className="p-3 font-mono font-bold text-[#00E5FF]">{idx + 1}위</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                            <td className="p-3">{row.operatorName}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-white">
                              {row.count}회
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 4: Student Stamp Book Ledger */}
            {activeTab === "student" && (
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-[#2C2C2E] pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white">학생별 개인 스탬프 현황</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      이름이나 반으로 학생을 조회하여 그들이 이수한 부스 세부 명단을 파악합니다.
                    </CardDescription>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="학번, 이름 또는 부스명 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <Search className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs">일치하는 학생 정보가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-[#2C2C2E] text-slate-400 text-xs">
                            <th className="p-3 font-semibold">학번</th>
                            <th className="p-3 font-semibold">이름</th>
                            <th className="p-3 font-semibold text-center">도장 수</th>
                            <th className="p-3 font-semibold">체험한 부스 세부 내역</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/40 text-slate-700 dark:text-slate-300">
                          {filteredStudents.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-[#121212]/30">
                              <td className="p-3 font-mono text-xs">{row.studentNumber}</td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                              <td className="p-3 text-center">
                                <span className="inline-block bg-cyan-950/80 border border-cyan-800/30 text-[#00E5FF] px-2 py-0.5 rounded font-mono font-bold text-xs">
                                  {row.completedBoothsCount}개
                                </span>
                              </td>
                              <td className="p-3">
                                {row.completedBoothsList.length === 0 ? (
                                  <span className="text-xs text-slate-500 font-medium">체험 기록 없음</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {row.completedBoothsList.map((boothName, bIdx) => (
                                      <span
                                        key={bIdx}
                                        className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-600 dark:bg-[#121212] dark:text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-[#2C2C2E]/50"
                                      >
                                        <Check className="h-2.5 w-2.5 text-[#32D74B]" />
                                        {boothName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        ) : null}

      </div>
    </DashboardLayout>
  );
}
