"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Loader2,
  RefreshCw,
  Clock,
  Award,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { getAdminDashboardDataAction, DashboardData } from "./dashboard-actions";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface DashboardClientPageProps {
  initialEvents: EventOption[];
}

export function DashboardClientPage({ initialEvents }: DashboardClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Select the first event by default
  useEffect(() => {
    if (initialEvents.length > 0) {
      setSelectedEventId(initialEvents[0].id);
    }
  }, [initialEvents]);

  // Fetch Dashboard Data function
  const fetchDashboardData = useCallback(async (eventId: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getAdminDashboardDataAction(eventId);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        setDashboardData(res.data);
        setErrorMessage(null);
        setLastRefreshed(new Date().toLocaleTimeString("ko-KR", { hour12: false }));
      }
    } catch (err) {
      const errorObj = err as Error;
      setErrorMessage(`대시보드 통계 로딩 오류: ${errorObj.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Realtime Supabase WebSockets + Page Visibility API + Fallback Polling (20s)
  useEffect(() => {
    if (!selectedEventId) return;

    // Initial fetch
    fetchDashboardData(selectedEventId, dashboardData === null);

    // 1. Direct Supabase WebSocket subscription (Instant update on participation events)
    const channel = supabase
      .channel(`dashboard-live-${selectedEventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participations",
          filter: `event_id=eq.${selectedEventId}`,
        },
        () => {
          fetchDashboardData(selectedEventId, false);
        }
      )
      .subscribe();

    // 2. Page Visibility API + Smart Fallback Polling
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchDashboardData(selectedEventId, false);
        }
      }, 20000); // 20s conservative fallback (saves 85%+ server invocations)
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else {
        fetchDashboardData(selectedEventId, false);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedEventId, fetchDashboardData, dashboardData]);

  // Handle Event selection change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setDashboardData(null); // Reset metrics for loading state
  };

  const handleManualRefresh = () => {
    if (selectedEventId) {
      fetchDashboardData(selectedEventId, true);
    }
  };

  // Helper: Format relative timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  // Compute maximum count among popular booths for relative sizing
  const maxBoothCount =
    dashboardData && dashboardData.popularBooths.length > 0
      ? dashboardData.popularBooths[0].count
      : 1;

  // Compute participated student percentage
  const participatedPercentage =
    dashboardData && dashboardData.totalStudents > 0
      ? Math.round((dashboardData.participatedStudents / dashboardData.totalStudents) * 100)
      : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Upper Header control bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF]">관리자 대시보드</h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              진행 중인 행사의 참여 현황과 지표를 실시간으로 모니터링합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live pulsing dot */}
            {selectedEventId && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1E1E1E] px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#2C2C2E] text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#32D74B]"></span>
                </span>
                <span className="text-[#32D74B] font-bold">LIVE</span>
                <span className="text-slate-400 font-mono hidden sm:inline">({lastRefreshed} 갱신됨)</span>
              </div>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              disabled={loading || !selectedEventId}
              className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Event selection filter */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-64 space-y-1">
              <Label className="text-slate-500 dark:text-[#98989D] text-xs">행사 선택</Label>
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
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 1. Main Metrics KPI Grid */}
        {!selectedEventId ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-[#98989D]">
            <Users className="h-12 w-12 text-slate-300 dark:text-[#2C2C2E] mb-4" />
            <p className="text-base">모니터링할 행사를 선택하면 실시간 집계가 시작됩니다.</p>
          </div>
        ) : !dashboardData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-[#98989D]">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm">실시간 이벤트 지표 집계하는 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 4 Cards Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Card 1: Total Students */}
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">전체 학생</p>
                      <h3 className="text-3xl font-extrabold font-mono text-slate-800 dark:text-white">
                        {dashboardData.totalStudents}
                      </h3>
                    </div>
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-500">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">대장에 등록된 전체 학생 수</p>
                </CardContent>
              </Card>

              {/* Card 2: Participated Students */}
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <CardContent className="p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">참가 학생</p>
                      <div className="flex items-baseline gap-1.5">
                        <h3 className="text-3xl font-extrabold font-mono text-slate-800 dark:text-white">
                          {dashboardData.participatedStudents}
                        </h3>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">({participatedPercentage}%)</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                  </div>
                  
                  {/* Progress Gauge bar */}
                  <div className="w-full h-1 bg-slate-100 dark:bg-[#121212] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${participatedPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">1회 이상 스캔 기록된 고유 학생</p>
                </CardContent>
              </Card>

              {/* Card 3: Total Scan Stamp Count */}
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">참여 횟수</p>
                      <h3 className="text-3xl font-extrabold font-mono text-slate-800 dark:text-white">
                        {dashboardData.totalParticipations}
                      </h3>
                    </div>
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-2.5 text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">전체 부스의 누적 QR 도장 스캔 횟수</p>
                </CardContent>
              </Card>

              {/* Card 4: Average Participation per student */}
              <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">평균 참여</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-extrabold font-mono text-slate-800 dark:text-white">
                          {dashboardData.averageParticipation}
                        </h3>
                        <span className="text-xs text-slate-400">회 / 명</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-500">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">학생 1인당 평균 부스 체험 실적</p>
                </CardContent>
              </Card>

            </div>

            {/* 2. Split Panels (Popular Booths & Recent scans) */}
            <div className="grid gap-6 lg:grid-cols-12">
              
              {/* Popular Booths Ranking (Left 7-col) */}
              <Card className="lg:col-span-7 border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E] pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-amber-500" />
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white">인기 부스 순위 (Top 5)</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    부스별 누적 스탬프 횟수가 많은 순서입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {dashboardData.popularBooths.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-[#98989D]">
                      <Award className="h-8 w-8 text-slate-300 dark:text-[#2C2C2E] mb-2" />
                      <p className="text-xs">집계된 참여 기록이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.popularBooths.map((booth, idx) => {
                        const widthPct = maxBoothCount > 0 ? (booth.count / maxBoothCount) * 100 : 0;
                        return (
                          <div key={booth.boothId} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold",
                                    idx === 0 && "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
                                    idx === 1 && "bg-slate-100 text-slate-800 dark:bg-[#2C2C2E] dark:text-slate-200",
                                    idx > 1 && "bg-slate-50 text-slate-500 dark:bg-[#121212] dark:text-slate-400"
                                  )}
                                >
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-white">{booth.name}</span>
                                <span className="text-[10px] text-slate-400 font-medium">({booth.operatorName !== "미지정" ? booth.operatorName : "교사 미지정"})</span>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-indigo-300">
                                {booth.count}회
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-[#121212] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  idx === 0 ? "bg-indigo-600" : "bg-indigo-400/80 dark:bg-indigo-500/60"
                                )}
                                style={{ width: `${widthPct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Log Feed (Right 5-col) */}
              <Card className="lg:col-span-5 border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E] pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-indigo-500" />
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white">실시간 참여 피드</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    부스 현장에서 방금 성공한 스캔 타임라인입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {dashboardData.recentParticipations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-[#98989D]">
                      <Clock className="h-8 w-8 text-slate-300 dark:text-[#2C2C2E] mb-2" />
                      <p className="text-xs">현재 생성되는 실시간 스캔 정보가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recentParticipations.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs border-b border-slate-100/50 dark:border-[#2C2C2E]/40 pb-2.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex-shrink-0 text-slate-400 font-mono text-[10px] flex items-center gap-1">
                              <Circle className="h-1.5 w-1.5 fill-cyan-500 text-cyan-500 animate-pulse" />
                              {formatTime(item.createdAt)}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-white flex-shrink-0">
                              {item.studentName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">
                              {item.studentNumber.replace("학년 ", "").replace("반 ", "-").replace("번", "")}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                              → {item.boothName}
                            </span>
                          </div>
                          
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 dark:bg-[#1C3A27] dark:text-[#32D74B] px-1.5 py-0.5 rounded-md flex-shrink-0">
                            스캔 완료
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        )}
        
      </div>
    </DashboardLayout>
  );
}

