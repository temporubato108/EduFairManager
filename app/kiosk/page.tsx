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
  const [scanState, setScanState] = useState<"idle" | "scanning">("idle");
  const [participantCount, setParticipantCount] = useState(0);
  
  // Realtime overlay feedback state
  const [overlayResult, setOverlayResult] = useState<{
    type: "success" | "error";
    title?: string;
    name?: string;
    number?: string;
    message: string;
  } | null>(null);

  // Manual Input State
  const [manualInput, setManualInput] = useState("");
  const [manualPending, setManualPending] = useState(false);

  // Throttle & processing lock refs
  const isProcessingRef = useRef<boolean>(false);
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
            setScanState("idle");
          } else if (res.data) {
            setBooth(res.data);
            setParticipantCount(res.data.participant_count);
            setScanState("idle"); // Start in Kiosk Dashboard (idle) mode
          }
        })
        .catch(() => {
          setError("부스 정보를 불러오는 중 오류가 발생했습니다.");
          setScanState("idle");
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

  // Process QR scanner text (Non-blocking seamless overlay flow)
  const handleProcessScan = useCallback(async (qrText: string) => {
    if (!boothId || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const res = await recordParticipationAction(boothId, qrText);

      if (res.error) {
        playErrorSound();
        setOverlayResult({
          type: "error",
          title: "등록 오류 및 차단",
          message: res.error,
        });

        setTimeout(() => {
          setOverlayResult(null);
          isProcessingRef.current = false;
        }, 1500);
      } else if (res.success) {
        playSuccessSound();
        setParticipantCount((prev) => prev + 1); // Locally increment count immediately
        setOverlayResult({
          type: "success",
          name: res.studentName || "학생",
          number: res.studentNumber || "",
          message: "행사 참여 등록 완료!",
        });

        setTimeout(() => {
          setOverlayResult(null);
          isProcessingRef.current = false;
        }, 1000);
      }
    } catch (err) {
      console.error("Scan processing error:", err);
      playErrorSound();
      setOverlayResult({
        type: "error",
        title: "시스템 오류",
        message: "참여 처리 중 알 수 없는 시스템 오류가 발생했습니다.",
      });

      setTimeout(() => {
        setOverlayResult(null);
        isProcessingRef.current = false;
      }, 1500);
    }
  }, [boothId, playSuccessSound, playErrorSound]);

  // QR Scanning Scanner Event Hook (Runs once per scanning session, stays alive)
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
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
              },
            },
            (decodedText) => {
              // If already processing a scan, ignore new frames
              if (isProcessingRef.current) return;

              // Same-QR 2-second rate limit
              const now = Date.now();
              if (
                decodedText === lastScannedQrRef.current &&
                now - lastScannedTimeRef.current < 2000
              ) {
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-[#98989D]">부스 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] max-h-[100dvh] flex-col bg-[#121212] text-white select-none overflow-hidden">
      {/* Global CSS for Html5Qrcode Fullscreen Camera Stream & Countdown */}
      <style jsx global>{`
        #kiosk-reader {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #000 !important;
          position: relative !important;
        }
        #kiosk-reader video {
          width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          object-fit: cover !important;
          border-radius: inherit !important;
        }
        #kiosk-reader img {
          display: none !important;
        }
        #kiosk-reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #kiosk-reader__dashboard {
          display: none !important;
        }
        @keyframes countdownShrink {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        .animate-shrink-1s {
          animation: countdownShrink 1000ms linear forwards !important;
          will-change: width;
        }
        @keyframes countdownShrink15s {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        .animate-shrink-15s {
          animation: countdownShrink15s 1500ms linear forwards !important;
          will-change: width;
        }
      `}</style>

      {/* Kiosk Header */}
      <header className="flex h-14 sm:h-16 items-center justify-between border-b border-[#2C2C2E] bg-[#1E1E1E] px-4 sm:px-6 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
          <span className="font-bold tracking-tight text-indigo-400 text-sm sm:text-base">EduFair Kiosk</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted(!muted)}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white h-8 w-8 sm:h-9 sm:w-9"
            title={muted ? "소리 켜기" : "음소거"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#32D74B]" />}
          </Button>

          {booth && scanState === "scanning" && (
            <div className="flex items-center gap-1.5 text-xs text-[#32D74B]">
              <Radio className="h-3.5 w-3.5 animate-ping text-[#32D74B]" />
              <span className="font-medium hidden sm:inline">스캔 대기 중</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isPending}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white h-8 w-8 sm:h-9 sm:w-9"
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
      <main className="flex flex-1 flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden w-full max-w-lg mx-auto">
        {error ? (
          <Card className="w-full border-rose-950 bg-[#1E1E1E] text-white shadow-xl">
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
          <div className="w-full h-full flex flex-col justify-between mx-auto">
            
            {/* 1. Kiosk Dashboard Mode (Idle State) */}
            {scanState === "idle" && (
              <div className="w-full flex flex-col justify-between h-full py-2 sm:py-3 gap-3.5 animate-fade-in">
                {/* Top Booth Header Card */}
                <div className="bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl p-5 sm:p-6 text-center space-y-2.5 shadow-xl shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/40 text-indigo-300 text-xs font-mono font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{booth.event_name}</span>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {booth.name}
                  </h1>

                  {booth.description && (
                    <p className="text-xs sm:text-sm text-slate-300 bg-[#121212] p-3 rounded-2xl border border-[#2C2C2E]/80 leading-relaxed text-center">
                      {booth.description}
                    </p>
                  )}
                </div>

                {/* Center Metric Block: Operating Status */}
                <div className="rounded-3xl bg-[#1E1E1E] border border-[#2C2C2E] p-6 sm:p-7 text-center space-y-3 relative shadow-xl flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 text-[#32D74B]">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-semibold text-slate-200">실시간 운영 현황</span>
                    </div>
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-lg bg-[#121212] border border-[#2C2C2E] text-slate-400">
                      {booth.allow_double_participation ? "중복 허용" : "1회 제한"}
                    </span>
                  </div>

                  <div className="py-2">
                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">오늘 참여 학생 수</p>
                    <div className="flex items-baseline justify-center gap-1.5 my-1">
                      <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-indigo-400">
                        {participantCount}
                      </span>
                      <span className="text-xl font-bold text-slate-400">명</span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center text-xs sm:text-sm text-slate-400 border-t border-[#2C2C2E]">
                    <span>담당 운영교사</span>
                    <span className="font-bold text-white bg-[#121212] px-3 py-1 rounded-xl border border-[#2C2C2E]">
                      {booth.operator_name}
                    </span>
                  </div>
                </div>

                {/* Big Scan Activation Button */}
                <Button
                  onClick={() => setScanState("scanning")}
                  className="w-full h-15 sm:h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg sm:text-xl rounded-2xl sm:rounded-3xl gap-3 shadow-2xl shadow-indigo-950/50 active:scale-[0.98] transition-transform shrink-0"
                >
                  <Camera className="h-6 w-6" />
                  <span>QR 스캔 시작</span>
                </Button>
              </div>
            )}

            {/* 2. Camera Scanning View (Compact Square Frame without scrolling) */}
            {scanState === "scanning" && (
              <div className="flex flex-col h-full w-full justify-between gap-2.5 flex-1 animate-fade-in py-1">
                {/* Mini Metric header */}
                <div className="flex items-center justify-between bg-[#1E1E1E]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#2C2C2E] shadow-md shrink-0">
                  <div className="min-w-0 pr-2">
                    <h2 className="text-sm font-bold text-white tracking-wide truncate">{booth.name}</h2>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{booth.event_name}</p>
                  </div>
                  <div className="flex items-baseline gap-1 bg-[#121212] px-3 py-1 rounded-xl border border-[#2C2C2E] font-mono shrink-0">
                    <span className="text-xs text-slate-400">스캔</span>
                    <span className="text-base font-bold text-indigo-400">{participantCount}</span>
                    <span className="text-[10px] text-slate-500">명</span>
                  </div>
                </div>

                {/* Viewport Frame - Centered Rounded Square Box without vertical stretch */}
                <div className="relative w-full aspect-square max-h-[46vh] sm:max-h-[52vh] rounded-3xl overflow-hidden border-2 border-indigo-500/80 bg-black shadow-2xl flex items-center justify-center mx-auto shrink-0">
                  <div id="kiosk-reader" className="w-full h-full object-cover"></div>
                  
                  {/* Neon HUD overlay elements (only active when not displaying result modal) */}
                  {!overlayResult && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-8 z-10">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                        <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                      </div>
                      {/* Scanner scanning bar indicator */}
                      <div className="w-full h-0.5 bg-indigo-400 opacity-60 shadow-[0_0_12px_#818cf8] animate-scan-line"></div>
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                        <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                      </div>
                    </div>
                  )}

                  {/* Overlay Feedback Modal (Floating directly over active camera) */}
                  {overlayResult && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-scale-up">
                      {overlayResult.type === "success" ? (
                        <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border-2 border-[#32D74B] bg-[#1E1E1E]/95 backdrop-blur-md p-5 text-center space-y-3 shadow-2xl shadow-emerald-950/50">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/80 border-2 border-[#32D74B] animate-bounce-slow">
                            <CheckCircle2 className="h-7 w-7 text-[#32D74B]" />
                          </div>

                          <div className="space-y-0.5">
                            {overlayResult.number && (
                              <p className="text-xs font-mono font-medium text-slate-400">{overlayResult.number}</p>
                            )}
                            <h2 className="text-2xl font-black tracking-tight text-white">{overlayResult.name}</h2>
                          </div>

                          <div className="py-1.5 px-3 bg-[#121212] border border-[#2C2C2E] rounded-xl text-xs font-bold text-[#32D74B] font-mono">
                            {overlayResult.message}
                          </div>

                          {/* 1s Progress shrink bar */}
                          <div className="w-full space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>다음 학생 스캔 준비</span>
                              <span className="font-mono font-bold text-white">1초</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                              <div className="h-full bg-[#32D74B] rounded-full animate-shrink-1s"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border-2 border-[#FF453A] bg-[#1E1E1E]/95 backdrop-blur-md p-5 text-center space-y-3 shadow-2xl shadow-rose-950/50 animate-shake">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/80 border-2 border-[#FF453A]">
                            <AlertTriangle className="h-7 w-7 text-[#FF453A]" />
                          </div>

                          <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white tracking-tight">{overlayResult.title || "등록 오류"}</h2>
                            <p className="text-xs text-[#FF453A] bg-[#121212] p-2.5 rounded-xl border border-rose-900/40 leading-relaxed font-medium">
                              {overlayResult.message}
                            </p>
                          </div>

                          {/* 1.5s Progress shrink bar */}
                          <div className="w-full space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>스캐너 자동 복귀</span>
                              <span className="font-mono font-bold text-white">1.5초</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF453A] rounded-full animate-shrink-15s"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Controls Area */}
                <div className="space-y-2 shrink-0">
                  {/* Manual testing input box */}
                  <form onSubmit={handleManualSubmit} className="flex gap-2 items-center bg-[#1E1E1E] p-2 rounded-2xl border border-[#2C2C2E]">
                    <Input
                      type="text"
                      placeholder="학번/QR 직접 입력 (예: 60101)"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      disabled={manualPending}
                      className="flex-1 bg-[#121212] border-[#2C2C2E] text-white text-xs placeholder:text-slate-500 h-9"
                    />
                    <Button
                      type="submit"
                      disabled={manualPending || !manualInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 px-4 rounded-xl"
                    >
                      입력
                    </Button>
                  </form>

                  {/* Stop Scan and Release Camera Button */}
                  <Button
                    onClick={() => setScanState("idle")}
                    variant="outline"
                    className="w-full border-[#2C2C2E] bg-[#1E1E1E]/60 text-slate-400 hover:bg-[#2C2C2E] hover:text-white py-2 h-9 rounded-xl text-xs gap-1.5"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>스캔 중지 (대시보드로 복귀)</span>
                  </Button>
                </div>
              </div>
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
                <p className="text-[#98989D]"><span className="text-indigo-400 font-semibold">관리자 안내:</span></p>
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <KioskContent />
    </Suspense>
  );
}
