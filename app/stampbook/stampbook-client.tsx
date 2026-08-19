"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QrCode,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Award,
  Lock,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getStudentStampbookAction, StudentStampbookData } from "./actions";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export function StudentStampbookClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract parameters from URL
  const codeParam = searchParams.get("code");
  const eventIdParam = searchParams.get("eventId");
  const studentIdParam = searchParams.get("studentId");

  // Determine actual eventId and studentId
  let initialEventId = eventIdParam || "";
  let initialStudentId = studentIdParam || "";

  if (codeParam) {
    let cleanCode = codeParam.trim();
    if (cleanCode.includes("code=")) {
      try {
        const url = new URL(cleanCode, "https://placeholder.local");
        cleanCode = url.searchParams.get("code") || cleanCode;
      } catch {
        const match = cleanCode.match(/[?&]code=([^&]+)/);
        if (match) cleanCode = decodeURIComponent(match[1]);
      }
    }
    if (cleanCode.includes(":")) {
      const [splitEId, splitSId] = cleanCode.split(":");
      initialEventId = splitEId;
      initialStudentId = splitSId;
    }
  }

  const [eventId, setEventId] = useState(initialEventId);
  const [studentId, setStudentId] = useState(initialStudentId);

  const [stampbook, setStampbook] = useState<StudentStampbookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stamps" | "leaderboard">("stamps");
  const [inputCode, setInputCode] = useState("");

  // Sound effects state (plays subtle chime when a new stamp is awarded while page is open!)
  const [chimeMuted, setChimeMuted] = useState(true);
  const prevStampCountRef = useRef<number>(0);

  // Play congratulatory chime sound
  const playStampChime = useCallback(() => {
    if (chimeMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = audioCtx.currentTime;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      // Arpeggio: C5 -> E5 -> G5 -> C6
      playTone(523.25, now, 0.15);
      playTone(659.25, now + 0.1, 0.15);
      playTone(783.99, now + 0.2, 0.15);
      playTone(1046.50, now + 0.3, 0.3);
    } catch {
      // Ignore audioContext errors
    }
  }, [chimeMuted]);

  // Fetch Stampbook Data function
  const fetchStampbookData = useCallback(async (eId: string, sId: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getStudentStampbookAction(eId, sId);
      if (res.error) {
        setErrorMessage(res.error);
        setStampbook(null);
      } else if (res.data) {
        const data = res.data;
        
        // Play congratulations sound if a stamp was added in real-time
        if (
          prevStampCountRef.current > 0 &&
          data.completedBoothIds.length > prevStampCountRef.current
        ) {
          playStampChime();
        }
        prevStampCountRef.current = data.completedBoothIds.length;

        setStampbook(data);
        setErrorMessage(null);
      }
    } catch (err) {
      const errorObj = err as Error;
      setErrorMessage(`스탬프북 로딩 중 오류가 발생했습니다: ${errorObj.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [playStampChime]);

  // Sync eventId/studentId from query params
  useEffect(() => {
    let eId = eventIdParam || "";
    let sId = studentIdParam || "";

    if (codeParam && codeParam.includes(":")) {
      const [splitEId, splitSId] = codeParam.split(":");
      eId = splitEId;
      sId = splitSId;
    }

    if (eId && sId) {
      setEventId(eId);
      setStudentId(sId);
    }
  }, [codeParam, eventIdParam, studentIdParam]);

  // Realtime Supabase WebSockets + Page Visibility API + Smart Polling (30s fallback)
  useEffect(() => {
    if (!eventId || !studentId) return;

    // Initial fetch
    fetchStampbookData(eventId, studentId, stampbook === null);

    // 1. Direct Supabase WebSocket subscription (Instant update without Vercel serverless invocations)
    const channel = supabase
      .channel(`stampbook-${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participations",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchStampbookData(eventId, studentId, false);
        }
      )
      .subscribe();

    // 2. Page Visibility API + Fallback Polling (Only runs when screen is active/visible)
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchStampbookData(eventId, studentId, false);
        }
      }, 30000); // 30s conservative fallback (saves 85%+ serverless function calls)
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden or phone screen is off -> Stop all polling!
        if (interval) clearInterval(interval);
      } else {
        // Tab is active again -> Fetch immediately and restart interval
        fetchStampbookData(eventId, studentId, false);
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
  }, [eventId, studentId, fetchStampbookData, stampbook]);

  // Handle manual code entry submit
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    const parts = inputCode.trim().split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      setEventId(parts[0]);
      setStudentId(parts[1]);
      setErrorMessage(null);
      setStampbook(null);
      router.push(`/stampbook?code=${parts[0]}:${parts[1]}`);
    } else {
      setErrorMessage("올바른 코드 형식(행사ID:학생ID)이 아닙니다.");
    }
  };

  const formatCompletionTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  // 1. Fallback entry screen
  if (!eventId || !studentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white p-6 select-none">
        <Card className="w-full max-w-md border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/30 mb-2">
              <QrCode className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">디지털 스탬프북</CardTitle>
            <CardDescription className="text-[#98989D] text-xs">
              발급된 QR 카드의 식별 번호를 붙여넣어 진입해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {errorMessage && (
              <div className="text-xs text-[#FF453A] bg-[#3A1C1C] px-3 py-2.5 rounded-xl border border-red-900/30 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <form onSubmit={handleManualCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code-input" className="text-xs text-[#98989D]">식별 코드 입력 (eventId:studentId)</Label>
                <Input
                  id="code-input"
                  type="text"
                  placeholder="예) 5d4e...:8f9a..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="bg-[#121212] border-[#2C2C2E] text-white placeholder:text-slate-600 rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-5 rounded-xl text-sm"
              >
                스탬프북 조회
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Loading view
  if (loading && !stampbook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-[#98989D]">스탬프 정보 실시간 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 3. Error state (failed queries)
  if (errorMessage && !stampbook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white p-6">
        <Card className="w-full max-w-md border-rose-950 bg-[#1E1E1E] text-white shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold tracking-tight text-[#FF453A]">접속 오류</CardTitle>
            <CardDescription className="text-[#98989D]">
              지정된 식별코드 정보가 유효하지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-xs text-[#FF453A] bg-[#3A1C1C] border border-rose-900/50 p-3 rounded-lg leading-relaxed">
              {errorMessage}
            </div>
            <Button
              onClick={() => {
                setEventId("");
                setStudentId("");
                setErrorMessage(null);
                setStampbook(null);
                router.push("/stampbook");
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs py-4"
            >
              식별 코드 다시 입력하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Main Stampbook View
  if (!stampbook) return null;

  const totalBooths = stampbook.booths.length;
  const completedCount = stampbook.completedBoothIds.length;
  const progressPercent = totalBooths > 0 ? Math.round((completedCount / totalBooths) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#121212] text-white select-none pb-12">
      {/* Student View Header */}
      <header className="flex h-14 items-center justify-between border-b border-[#2C2C2E] bg-[#1E1E1E] px-5">
        <div className="flex items-center gap-1.5">
          <QrCode className="h-5 w-5 text-indigo-400" />
          <span className="font-extrabold tracking-tight text-white text-sm">디지털 스탬프북</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification audio sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChimeMuted(!chimeMuted)}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white h-8 w-8"
            title={chimeMuted ? "소리 켜기" : "알림음 활성"}
          >
            {chimeMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#32D74B] animate-pulse" />}
          </Button>

          <div className="flex items-center gap-1 bg-[#121212] px-2.5 py-1 rounded-full border border-[#2C2C2E] text-[10px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#32D74B]"></span>
            </span>
            <span className="text-[#98989D] font-mono">Auto Live Sync</span>
          </div>
        </div>
      </header>

      {/* Main Student Space */}
      <main className="flex-1 p-5 max-w-lg mx-auto w-full space-y-6">
        
        {/* Profile / Stats Card */}
        <Card className="border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1 font-semibold">
                  <Calendar className="h-3 w-3" />
                  {stampbook.event.name}
                </p>
                <h2 className="text-xl font-black text-white mt-1">{stampbook.student.name}</h2>
                <p className="text-[11px] text-[#98989D] font-mono mt-0.5">{stampbook.student.studentNumber}</p>
              </div>
              
              <div className="text-right">
                <p className="text-[10px] text-[#98989D] font-semibold">내 순위</p>
                <div className="flex items-baseline justify-end gap-0.5 text-white">
                  <span className="text-2xl font-black font-mono text-indigo-400">
                    {stampbook.myRank > 0 ? stampbook.myRank : "-"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">위</span>
                </div>
              </div>
            </div>

            {/* Achievement metric gauge */}
            <div className="space-y-1.5 pt-2 border-t border-[#2C2C2E]/60">
              <div className="flex justify-between items-baseline text-xs text-[#98989D] font-semibold">
                <span>체험 부스 달성도</span>
                <span className="font-mono text-white">
                  {completedCount} / <span className="text-[#98989D]">{totalBooths}</span> ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden border border-[#2C2C2E]/40">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab triggers */}
        <div className="flex border-b border-[#2C2C2E] gap-2">
          <button
            onClick={() => setActiveTab("stamps")}
            className={cn(
              "flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-all",
              activeTab === "stamps"
                ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            내 스탬프북
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={cn(
              "flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-all",
              activeTab === "leaderboard"
                ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            🏆 명예의 전당 랭킹
          </button>
        </div>

        {/* Tab 1: Stamps Grid Slots */}
        {activeTab === "stamps" && (
          <div className="grid grid-cols-2 gap-4">
            {stampbook.booths.map((booth) => {
              const isCompleted = stampbook.completedBoothIds.includes(booth.id);
              const completionTime = stampbook.completedBoothTimes[booth.id];
              return (
                <Card
                  key={booth.id}
                  className={cn(
                    "border transition-all duration-300 relative overflow-hidden",
                    isCompleted
                      ? "border-[#32D74B] bg-emerald-950/10 shadow-lg shadow-emerald-950/10 scale-100"
                      : "border-dashed border-[#2C2C2E] bg-transparent opacity-60"
                  )}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-between min-h-[120px] text-center">
                    {/* Stamp Indicator Icon */}
                    <div
                      className={cn(
                        "rounded-full p-2.5 mb-2 border",
                        isCompleted
                          ? "bg-emerald-900/30 border-[#32D74B] text-[#32D74B] animate-scale-up"
                          : "bg-[#121212] border-[#2C2C2E] text-slate-600"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-white truncate max-w-[120px]">{booth.name}</h4>
                      {booth.description && !isCompleted && (
                        <p className="text-[9px] text-[#98989D] truncate max-w-[120px]">{booth.description}</p>
                      )}
                    </div>

                    {/* Footer completion date */}
                    <div className="mt-3 w-full">
                      {isCompleted ? (
                        <span className="inline-block text-[9px] font-bold text-[#32D74B] bg-[#1C3A27] px-2 py-0.5 rounded-full font-mono">
                          {formatCompletionTime(completionTime)} 완료
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-600 bg-[#121212] px-2 py-0.5 rounded-full">
                          미체험
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab 2: Live Leaderboard ranking list */}
        {activeTab === "leaderboard" && (
          <Card className="border-[#2C2C2E] bg-[#1E1E1E]">
            <CardHeader className="pb-3 border-b border-[#2C2C2E]/60">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4.5 w-4.5 text-amber-500" />
                <CardTitle className="text-sm font-bold">누적 스탬프 리더보드 (Top 10)</CardTitle>
              </div>
              <CardDescription className="text-[10px] text-[#98989D]">
                동률 발생 시 반 번호 순으로 자동 정렬됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#2C2C2E]/40">
                {stampbook.leaderboard.map((item) => {
                  const isMe = item.studentId === stampbook.student.id;
                  return (
                    <div
                      key={item.studentId}
                      className={cn(
                        "flex items-center justify-between p-3.5 text-xs transition-colors",
                        isMe ? "bg-indigo-950/20 border-y border-indigo-500/30 font-semibold" : "hover:bg-slate-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank tag */}
                        <span
                          className={cn(
                            "flex h-5.5 w-5.5 items-center justify-center rounded-lg text-[10px] font-black",
                            item.rank === 1 && "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
                            item.rank === 2 && "bg-slate-100 text-slate-800 dark:bg-[#2C2C2E] dark:text-slate-200",
                            item.rank === 3 && "bg-amber-50 text-amber-800 dark:bg-[#3A2E1C] dark:text-amber-500",
                            item.rank > 3 && "bg-[#121212] text-slate-500"
                          )}
                        >
                          {item.rank}
                        </span>
                        
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate flex items-center gap-1">
                            {item.name}
                            {isMe && (
                              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded">나</span>
                            )}
                          </p>
                          <p className="text-[9px] text-[#98989D] font-mono">
                            {item.studentNumber.replace("학년 ", "").replace("반 ", "-").replace("번", "")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono">
                        <Award className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-sm font-black text-indigo-400">{item.completedCount}</span>
                        <span className="text-[9px] text-slate-500">개</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
