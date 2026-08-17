"use client";

import { Suspense, useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { getBoothDetailAction } from "@/app/booths/actions";
import { recordParticipationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  LogOut,
  Radio,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Store,
  Camera,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface BoothDetail {
  id: string;
  name: string;
  description: string | null;
  event_name: string;
  allow_double_participation: boolean;
  operator_name: string;
  participant_count: number;
}

function KioskContent() {
  const searchParams = useSearchParams();
  const boothId = searchParams.get("boothId");
  
  const [booth, setBooth] = useState<BoothDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Audio mute state
  const [muted, setMuted] = useState(false);

  // Kiosk scanner and dashboard states
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [participantCount, setParticipantCount] = useState(0);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [scannedStudent, setScannedStudent] = useState<{ name: string; number: string } | null>(null);
  const [countdown, setCountdown] = useState(3);
  
  // Manual Input State
  const [manualInput, setManualInput] = useState("");
  const [manualPending, setManualPending] = useState(false);

  // Throttle refs
  const lastScannedQrRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);

  // Fetch Booth details on load
  useEffect(() => {
    if (boothId) {
      setLoading(true);
      setError(null);
      getBoothDetailAction(boothId)
        .then((res) => {
          if (res.error) {
            setError(res.error);
            setScanState("error");
          } else if (res.data) {
            setBooth(res.data);
            setParticipantCount(res.data.participant_count);
            setScanState("idle"); // Start in Kiosk Dashboard (idle) mode
          }
        })
        .catch(() => {
          setError("부스 정보를 불러오는 중 오류가 발생했습니다.");
          setScanState("error");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setBooth(null);
      setScanState("idle");
    }
  }, [boothId]);

  // Audio synthesizer using Web Audio API
  const playSuccessSound = useCallback(() => {
    if (muted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5 - Nice high scan beep)
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.warn("Web Audio API not allowed or blocked by browser policies", err);
    }
  }, [muted]);

  const playErrorSound = useCallback(() => {
    if (muted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      // Two short low pitch beeps
      playTone(380, now, 0.1);
      playTone(380, now + 0.15, 0.1);
    } catch (err) {
      console.warn("Web Audio API not allowed or blocked by browser policies", err);
    }
  }, [muted]);

  // Process QR scanner text
  const handleProcessScan = useCallback(async (qrText: string) => {
    if (!boothId) return;

    setScanState("idle"); // Temporarily hold scan loop
    setLoading(true);

    try {
      const res = await recordParticipationAction(boothId, qrText);

      if (res.error) {
        playErrorSound();
        setResultMessage(res.error);
        setScanState("error");
      } else if (res.success) {
        playSuccessSound();
        setParticipantCount((prev) => prev + 1); // Locally increment count immediately
        setResultMessage("행사 참여 등록 완료!");
        setScannedStudent({
          name: res.studentName || "학생",
          number: res.studentNumber || "미지정 학번",
        });
        setScanState("success");
      }
    } catch (err) {
      console.error("Scan processing error:", err);
      playErrorSound();
      setResultMessage("참여 처리 중 알 수 없는 시스템 오류가 발생했습니다.");
      setScanState("error");
    } finally {
      setLoading(false);
      setCountdown(3);
    }
  }, [boothId, playSuccessSound, playErrorSound]);

  // QR Scanning Scanner Event Hook
  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    
    // Only initialize camera if we are in 'scanning' state and booth exists
    if (booth && scanState === "scanning") {
      const startCamera = async () => {
        try {
          html5Qrcode = new Html5Qrcode("kiosk-reader");
          await html5Qrcode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
            },
            (decodedText) => {
              // Same-QR 2-second rate limit
              const now = Date.now();
              if (
                decodedText === lastScannedQrRef.current &&
                now - lastScannedTimeRef.current < 2000
              ) {
                console.log("Same QR scan ignored within 2 seconds");
                return;
              }

              lastScannedQrRef.current = decodedText;
              lastScannedTimeRef.current = now;

              handleProcessScan(decodedText);
            },
            () => {
              // Ignore failure logs
            }
          );
        } catch (err) {
          console.error("Camera scanner startup failed:", err);
        }
      };

      startCamera();
    }

    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().then(() => {
          html5Qrcode?.clear();
        }).catch((err) => console.error("Camera stop error", err));
      }
    };
  }, [booth, scanState, handleProcessScan]);

  // Countdown timer for 3-seconds auto-return
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (scanState === "success" || scanState === "error") {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Automatically return to scanning mode (continuous scanning)
            setScanState("scanning");
            setResultMessage(null);
            setScannedStudent(null);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanState]);

  // Manual fallback submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setManualPending(true);
    handleProcessScan(manualInput.trim()).finally(() => {
      setManualInput("");
      setManualPending(false);
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  if (loading && scanState === "idle" && !booth) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#121212] text-white min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00E5FF]" />
          <p className="text-sm text-[#98989D]">부스 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121212] text-white select-none">
      {/* Kiosk Header */}
      <header className="flex h-16 items-center justify-between border-b border-[#2C2C2E] bg-[#1E1E1E] px-6 z-10">
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6 text-[#00E5FF]" />
          <span className="font-bold tracking-tight text-[#00E5FF]">EduFair Kiosk</span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted(!muted)}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white animate-fade-in"
            title={muted ? "소리 켜기" : "음소거"}
          >
            {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5 text-[#32D74B]" />}
          </Button>

          {booth && scanState === "scanning" && (
            <div className="flex items-center gap-1.5 text-xs text-[#32D74B]">
              <Radio className="h-3.5 w-3.5 animate-ping text-[#32D74B]" />
              <span className="font-medium">실시간 스캔 대기 중</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isPending}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white"
            title="로그아웃"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex flex-1 items-center justify-center p-6 relative">
        {error ? (
          <Card className="w-full max-w-lg border-rose-950 bg-[#1E1E1E] text-white shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold tracking-tight text-[#FF453A]">부스 연결 끊김</CardTitle>
              <CardDescription className="text-[#98989D]">
                부스 식별 코드를 불러오는 데 실패했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-[#FF453A] bg-[#3A1C1C] border border-rose-900/50 p-3 rounded-lg">
                {error}
              </p>
              <p className="text-xs text-[#98989D]">
                행사 관리자 화면에서 인쇄된 올바른 QR 코드를 스캔하세요.
              </p>
            </CardContent>
          </Card>
        ) : booth ? (
          <div className="w-full max-w-md space-y-6">
            
            {/* 1. Kiosk Dashboard Mode (Idle State) */}
            {scanState === "idle" && (
              <Card className="border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-xl">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950 text-[#00E5FF] border border-cyan-800/30 mb-2">
                    <Store className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight text-white">{booth.name}</CardTitle>
                  <CardDescription className="text-[#00E5FF] font-medium text-xs flex items-center justify-center gap-1 mt-1 font-mono">
                    <Calendar className="h-3 w-3" />
                    {booth.event_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  {booth.description && (
                    <p className="text-sm text-center text-slate-300 px-4 bg-[#121212] py-2.5 rounded-xl border border-[#2C2C2E]/60">
                      {booth.description}
                    </p>
                  )}

                  {/* Main Metric: Today's Participant Count */}
                  <div className="rounded-2xl bg-[#121212] border border-[#2C2C2E] p-6 text-center space-y-2 relative overflow-hidden">
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[10px] text-[#98989D]">
                      <UserCheck className="h-3 w-3 text-[#32D74B]" />
                      <span>운영 현황</span>
                    </div>
                    
                    <p className="text-xs font-semibold text-[#98989D] uppercase tracking-wider">오늘 참여자 수</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-extrabold font-mono tracking-tight text-[#00E5FF]">
                        {participantCount}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">명</span>
                    </div>
                    
                    <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 border-t border-[#2C2C2E]/40 font-mono mt-3">
                      <span>담당: {booth.operator_name}</span>
                      <span>중복참여: {booth.allow_double_participation ? "허용" : "금지"}</span>
                    </div>
                  </div>

                  {/* Big Scan Activation Button */}
                  <Button
                    onClick={() => setScanState("scanning")}
                    className="w-full bg-[#00E5FF] hover:bg-[#00D0EB] text-black font-extrabold text-base py-6 rounded-2xl gap-2 shadow-lg shadow-cyan-950/20"
                  >
                    <Camera className="h-5 w-5" />
                    <span>QR 스캔 시작</span>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 2. Camera Scanning HUD View */}
            {scanState === "scanning" && (
              <div className="space-y-4 animate-fade-in">
                {/* Mini Metric header */}
                <div className="flex items-center justify-between bg-[#1E1E1E] px-4 py-3 rounded-2xl border border-[#2C2C2E]">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">{booth.name}</h2>
                    <p className="text-[10px] text-[#98989D] font-mono mt-0.5">{booth.event_name}</p>
                  </div>
                  <div className="flex items-baseline gap-0.5 bg-[#121212] px-3 py-1 rounded-xl border border-[#2C2C2E] font-mono">
                    <span className="text-xs text-[#98989D] mr-1">스캔수</span>
                    <span className="text-base font-bold text-[#00E5FF]">{participantCount}</span>
                    <span className="text-[10px] text-slate-500">명</span>
                  </div>
                </div>

                {/* Viewport Frame */}
                <div className="relative aspect-square w-full rounded-3xl overflow-hidden border-4 border-[#00E5FF] bg-black shadow-lg shadow-cyan-950/20">
                  <div id="kiosk-reader" className="w-full h-full object-cover"></div>
                  
                  {/* Neon HUD overlay elements */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-4 border-l-4 border-[#00E5FF]"></div>
                      <div className="w-6 h-6 border-t-4 border-r-4 border-[#00E5FF]"></div>
                    </div>
                    {/* Scanner scanning bar indicator */}
                    <div className="w-full h-0.5 bg-[#00E5FF] opacity-40 shadow-glow animate-scan-line"></div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-4 border-l-4 border-[#00E5FF]"></div>
                      <div className="w-6 h-6 border-b-4 border-r-4 border-[#00E5FF]"></div>
                    </div>
                  </div>
                </div>

                {/* Manual testing input box */}
                <form onSubmit={handleManualSubmit} className="flex gap-2 items-center bg-[#1E1E1E] p-3 rounded-2xl border border-[#2C2C2E]">
                  <Input
                    type="text"
                    placeholder="학반 및 번호:이름 직접 입력"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    disabled={manualPending}
                    className="flex-1 bg-[#121212] border-[#2C2C2E] text-white text-xs placeholder:text-slate-500 h-9"
                  />
                  <Button
                    type="submit"
                    disabled={manualPending || !manualInput.trim()}
                    className="bg-[#00E5FF] hover:bg-[#00D0EB] text-black font-semibold text-xs h-9 px-4 rounded-xl"
                  >
                    입력
                  </Button>
                </form>

                {/* Stop Scan and Release Camera Button */}
                <Button
                  onClick={() => setScanState("idle")}
                  variant="outline"
                  className="w-full border-[#2C2C2E] bg-transparent text-slate-400 hover:bg-[#2C2C2E] hover:text-white py-5 rounded-2xl text-xs gap-1.5"
                >
                  <EyeOff className="h-4 w-4" />
                  <span>스캔 중지 (대시보드로 복귀)</span>
                </Button>
              </div>
            )}

            {/* 3. Success Participation View */}
            {scanState === "success" && scannedStudent && (
              <Card className="border-[#32D74B] bg-[#1E1E1E] text-white shadow-2xl shadow-emerald-950/20 animate-scale-up py-4">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
                  <div className="rounded-full bg-emerald-950/50 p-4 border-4 border-[#32D74B] animate-bounce-slow">
                    <CheckCircle2 className="h-14 w-14 text-[#32D74B]" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#98989D]">{scannedStudent.number}</h3>
                    <h2 className="text-3xl font-extrabold text-white tracking-wide">{scannedStudent.name}</h2>
                  </div>

                  <div className="w-full py-2 bg-[#121212] border border-[#2C2C2E] rounded-xl text-xs font-semibold text-[#32D74B] font-mono tracking-wider">
                    {resultMessage}
                  </div>

                  {/* Countdown progress indicator bar */}
                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-[#98989D]">
                      <span>카메라 자동 복귀</span>
                      <span className="font-mono font-bold text-white">{countdown}초</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#32D74B] rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(countdown / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Error Participation View */}
            {scanState === "error" && (
              <Card className="border-[#FF453A] bg-[#1E1E1E] text-white shadow-2xl shadow-rose-950/20 animate-shake py-4">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
                  <div className="rounded-full bg-rose-950/50 p-4 border-4 border-[#FF453A]">
                    <AlertTriangle className="h-14 w-14 text-[#FF453A]" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">등록 오류 및 차단</h2>
                    <p className="text-xs text-[#98989D]">이유 및 진단 피드백</p>
                  </div>

                  <div className="w-full p-4 bg-[#121212] border border-rose-900/40 rounded-xl text-xs text-[#FF453A] font-medium leading-relaxed">
                    {resultMessage}
                  </div>

                  {/* Countdown progress indicator bar */}
                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-[#98989D]">
                      <span>카메라 자동 복귀</span>
                      <span className="font-mono font-bold text-white">{countdown}초</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF453A] rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(countdown / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        ) : (
          <Card className="w-full max-w-lg border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold tracking-tight">Kiosk 대기 화면</CardTitle>
              <CardDescription className="text-[#98989D]">
                부스 QR 코드가 매핑되지 않았습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-[#98989D]">
                부스의 QR 코드를 모바일 기기로 스캔하여 접속하면 해당 부스의 운영 모드로 즉시 전환됩니다.
              </p>
              <div className="rounded-lg bg-[#121212] p-4 border border-[#2C2C2E] text-left text-xs space-y-2 font-mono">
                <p className="text-[#98989D]"><span className="text-[#00E5FF] font-semibold">관리자 안내:</span></p>
                <p className="text-slate-300">1. 부스 관리 페이지에서 부스를 생성하세요.</p>
                <p className="text-slate-300">2. 생성된 부스의 QR 코드를 출력하여 부스 안내판에 게시하세요.</p>
                <p className="text-slate-300">3. 부스 운영 교사가 해당 QR 코드를 촬영하면 이 화면이 활성화됩니다.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#00E5FF]" />
        </div>
      }
    >
      <KioskContent />
    </Suspense>
  );
}
