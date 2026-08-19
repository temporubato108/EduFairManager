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
  RefreshCw,
} from "lucide-react";
import jsQR from "jsqr";

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
  
  // Camera hardware loading & error recovery states
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);

  // Native Video Stream & Scanner Engine Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Native QR Scanner Lifecycle (Direct WebRTC + BarcodeDetector + jsQR Fallback)
  useEffect(() => {
    let isMounted = true;

    if (booth && scanState === "scanning") {
      setCameraLoading(true);
      setCameraError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let barcodeDetector: any = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        } catch (e) {
          console.warn("BarcodeDetector init failed, fallback to jsQR", e);
          barcodeDetector = null;
        }
      }

      const startCameraStream = async () => {
        try {
          // Stop any previous media stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }

          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch (envErr) {
            console.warn("Environment camera failed, trying generic camera", envErr);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }

          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          if (!isMounted) return;
          setCameraLoading(false);

          // Prepare canvas for fallback frame processing
          if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
          }
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          let lastScanTime = 0;

          const scanLoop = async (now: number) => {
            if (!isMounted || scanState !== "scanning") return;

            // Run scanner at ~30 FPS (every 33ms)
            if (now - lastScanTime >= 33) {
              lastScanTime = now;
              const video = videoRef.current;

              if (
                video &&
                video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0 &&
                !isProcessingRef.current
              ) {
                try {
                  let detectedCode: string | null = null;

                  // 1. Priority: Native Google/Browser BarcodeDetector (Direct GPU MLKit)
                  if (barcodeDetector) {
                    const barcodes = await barcodeDetector.detect(video);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                      detectedCode = barcodes[0].rawValue;
                    }
                  }

                  // 2. Fallback: jsQR (Pure JS/WASM Canvas Decoder)
                  if (!detectedCode && ctx) {
                    const width = video.videoWidth;
                    const height = video.videoHeight;
                    if (canvas.width !== width || canvas.height !== height) {
                      canvas.width = width;
                      canvas.height = height;
                    }
                    ctx.drawImage(video, 0, 0, width, height);
                    const imgData = ctx.getImageData(0, 0, width, height);
                    const code = jsQR(imgData.data, imgData.width, imgData.height, {
                      inversionAttempts: "dontInvert",
                    });
                    if (code && code.data) {
                      detectedCode = code.data;
                    }
                  }

                  if (detectedCode) {
                    const currentTime = Date.now();
                    if (
                      detectedCode !== lastScannedQrRef.current ||
                      currentTime - lastScannedTimeRef.current >= 2000
                    ) {
                      lastScannedQrRef.current = detectedCode;
                      lastScannedTimeRef.current = currentTime;
                      handleProcessScan(detectedCode);
                    }
                  }
                } catch {
                  // Non-fatal frame decode error
                }
              }
            }

            animFrameIdRef.current = requestAnimationFrame(scanLoop);
          };

          animFrameIdRef.current = requestAnimationFrame(scanLoop);
        } catch (err) {
          console.error("Camera startup error:", err);
          if (isMounted) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (errMsg.includes("Permission") || errMsg.includes("NotAllowed")) {
              setCameraError("카메라 접근 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요.");
            } else if (errMsg.includes("NotReadable") || errMsg.includes("in use")) {
              setCameraError("카메라 장치가 다른 앱에서 사용 중입니다. 다른 앱을 닫고 다시 시도해주세요.");
            } else {
              setCameraError("카메라를 켜지 못했습니다. 아래 버튼을 눌러 다시 시도해주세요.");
            }
            setCameraLoading(false);
          }
        }
      };

      startCameraStream();
    }

    const videoElem = videoRef.current;
    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoElem) {
        videoElem.srcObject = null;
      }
    };
  }, [booth, scanState, cameraRetryCount, handleProcessScan]);

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
    <div className="flex h-screen max-h-screen flex-col bg-[#121212] text-white select-none overflow-hidden">
      {/* Global CSS for Animations */}
      <style jsx global>{`
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
          <QrCode className="h-6 w-6 text-indigo-400" />
          <span className="font-extrabold tracking-tight text-indigo-400 text-base sm:text-lg">EduFair Kiosk</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted(!muted)}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white h-9 w-9 sm:h-10 sm:w-10"
            title={muted ? "소리 켜기" : "음소거"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-[#32D74B]" />}
          </Button>

          {booth && scanState === "scanning" && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#32D74B]">
              <Radio className="h-4 w-4 animate-ping text-[#32D74B]" />
              <span className="hidden sm:inline">스캔 대기 중</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isPending}
            className="text-[#98989D] hover:bg-[#2C2C2E] hover:text-white h-9 w-9 sm:h-10 sm:w-10"
            title="로그아웃"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex flex-1 flex-col items-center justify-center p-2 sm:p-6 relative overflow-hidden h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)]">
        {error ? (
          <Card className="w-full max-w-md border-rose-950 bg-[#1E1E1E] text-white shadow-xl">
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
          <div className="w-full max-w-none sm:max-w-md md:max-w-lg flex flex-col items-center justify-center mx-auto my-auto overflow-hidden px-1 sm:px-0">
            
            {/* 1. Kiosk Dashboard Mode (Idle State) - Full-width on Mobile, Clean Center on Desktop */}
            {scanState === "idle" && (
              <Card className="border-2 border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-2xl w-full my-auto rounded-[2rem] overflow-hidden p-5 sm:p-7 flex flex-col justify-center space-y-5 animate-scale-up">
                <CardHeader className="text-center pb-1 space-y-2 p-0">
                  <div className="mx-auto flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-indigo-950/90 text-indigo-400 border-2 border-indigo-700/50 shadow-xl shadow-indigo-950/40 p-4">
                    <Store className="h-10 w-10 sm:h-11 sm:w-11" />
                  </div>
                  <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                    {booth.name}
                  </CardTitle>
                  <div className="flex justify-center pt-0.5">
                    <span className="text-sm sm:text-base text-indigo-300 font-bold px-4 py-1.5 rounded-full bg-indigo-950/90 border border-indigo-700/60 inline-flex items-center gap-2 font-mono shadow-md">
                      <Calendar className="h-4 w-4 text-indigo-400" />
                      {booth.event_name}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 sm:space-y-5 p-0">
                  {booth.description && (
                    <p className="text-sm sm:text-base text-center text-slate-200 px-4 py-3 bg-[#121212] rounded-2xl border-2 border-[#2C2C2E] leading-relaxed font-medium">
                      {booth.description}
                    </p>
                  )}

                  {/* Main Metric: Today's Participant Count */}
                  <div className="rounded-3xl bg-[#121212] border-2 border-[#2C2C2E] p-6 sm:p-7 text-center space-y-2 relative overflow-hidden shadow-inner">
                    <div className="absolute top-3.5 left-4 flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 font-bold">
                      <UserCheck className="h-4 w-4 text-[#32D74B]" />
                      <span>운영 현황</span>
                    </div>
                    
                    <p className="text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-widest pt-2">오늘 참여자 수</p>
                    <div className="flex items-baseline justify-center gap-2 py-1">
                      <span className="text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight text-indigo-400 drop-shadow-md leading-none">
                        {participantCount}
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-slate-300">명</span>
                    </div>
                    
                    <div className="pt-3.5 flex justify-between items-center text-sm sm:text-base text-slate-300 border-t border-[#2C2C2E] font-mono mt-3">
                      <span>담당: <strong className="text-white font-bold">{booth.operator_name}</strong></span>
                      <span>중복: <strong className={booth.allow_double_participation ? "text-[#32D74B] font-bold" : "text-amber-400 font-bold"}>{booth.allow_double_participation ? "허용" : "금지"}</strong></span>
                    </div>
                  </div>

                  {/* Big Scan Activation Button */}
                  <Button
                    onClick={() => setScanState("scanning")}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] text-white font-black text-2xl sm:text-3xl py-6 sm:py-7 rounded-2xl sm:rounded-3xl gap-3 shadow-2xl shadow-indigo-950/70 transition-all flex items-center justify-center"
                  >
                    <Camera className="h-8 w-8" />
                    <span>QR 스캔 시작</span>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 2. Camera Scanning View - Full Mobile Width Match (Matches 2nd Reference Image) */}
            {scanState === "scanning" && (
              <div className="flex flex-col w-full items-center justify-center space-y-3 sm:space-y-4 my-auto animate-fade-in">
                {/* Header Info Card */}
                <div className="w-full bg-[#1E1E1E] border-2 border-[#2C2C2E] rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-2xl shrink-0">
                  <div className="min-w-0 pr-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate leading-tight">{booth.name}</h2>
                    <p className="text-sm font-bold text-indigo-400 font-mono truncate mt-0.5">{booth.event_name}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5 bg-[#121212] px-4 py-2 rounded-2xl border-2 border-[#2C2C2E] font-mono shrink-0 shadow-inner">
                    <span className="text-sm font-bold text-slate-400">스캔</span>
                    <span className="text-2xl sm:text-3xl font-black text-indigo-400">{participantCount}</span>
                    <span className="text-sm font-bold text-slate-400">명</span>
                  </div>
                </div>

                {/* Viewport Frame - Full-width square viewfinder */}
                <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-4 border-indigo-500 bg-black shadow-2xl flex items-center justify-center shrink-0">
                  {/* Direct Native Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full aspect-square object-cover scale-[1.25] origin-center"
                    style={{
                      imageRendering: "-webkit-optimize-contrast",
                    }}
                  />
                  
                  {/* Camera Loading Spinner */}
                  {cameraLoading && !cameraError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 gap-3 p-4 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                      <p className="text-sm font-bold text-slate-300">카메라 켜는 중...</p>
                    </div>
                  )}

                  {/* Camera Error & Retry Interface */}
                  {cameraError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#121212] p-6 text-center space-y-4">
                      <div className="h-14 w-14 rounded-full bg-rose-950/80 border-2 border-[#FF453A] flex items-center justify-center text-[#FF453A] mx-auto">
                        <AlertTriangle className="h-8 w-8" />
                      </div>
                      <div className="space-y-1.5 max-w-xs">
                        <p className="text-base font-black text-white">카메라를 켤 수 없음</p>
                        <p className="text-xs text-rose-400 font-semibold leading-relaxed">{cameraError}</p>
                      </div>
                      <Button
                        onClick={() => setCameraRetryCount((c) => c + 1)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm h-11 px-5 rounded-xl gap-2 shadow-lg"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>카메라 다시 연결</span>
                      </Button>
                    </div>
                  )}

                  {/* Neon HUD overlay elements (only active when camera is live and no modal is open) */}
                  {!overlayResult && !cameraLoading && !cameraError && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-8 z-10">
                      <div className="flex justify-between">
                        <div className="w-14 h-14 border-t-4 border-l-4 border-indigo-400 rounded-2xl"></div>
                        <div className="w-14 h-14 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl"></div>
                      </div>
                      {/* Scanner scanning bar indicator */}
                      <div className="w-full h-1.5 bg-indigo-400 opacity-90 shadow-[0_0_20px_#818cf8] animate-scan-line"></div>
                      <div className="flex justify-between">
                        <div className="w-14 h-14 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl"></div>
                        <div className="w-14 h-14 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl"></div>
                      </div>
                    </div>
                  )}

                  {/* Overlay Feedback Modal (Floating directly over square camera) */}
                  {overlayResult && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-scale-up">
                      {overlayResult.type === "success" ? (
                        <div className="w-full rounded-3xl border-3 border-[#32D74B] bg-[#1E1E1E] p-6 text-center space-y-4 shadow-2xl shadow-emerald-950/80">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950/80 border-2 border-[#32D74B] animate-bounce-slow">
                            <CheckCircle2 className="h-10 w-10 text-[#32D74B]" />
                          </div>

                          <div className="space-y-1">
                            {overlayResult.number && (
                              <p className="text-lg font-mono font-extrabold text-slate-400">{overlayResult.number}</p>
                            )}
                            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">{overlayResult.name}</h2>
                          </div>

                          <div className="py-3 px-4 bg-[#121212] border-2 border-[#2C2C2E] rounded-2xl text-lg font-bold text-[#32D74B] font-mono">
                            {overlayResult.message}
                          </div>

                          {/* 1s Progress shrink bar */}
                          <div className="w-full space-y-2 pt-1">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                              <span>다음 학생 스캔 준비</span>
                              <span className="font-mono font-black text-white">1초</span>
                            </div>
                            <div className="w-full h-3 bg-[#121212] rounded-full overflow-hidden">
                              <div className="h-full bg-[#32D74B] rounded-full animate-shrink-1s"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full rounded-3xl border-3 border-[#FF453A] bg-[#1E1E1E] p-6 text-center space-y-4 shadow-2xl shadow-rose-950/80 animate-shake">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-950/80 border-2 border-[#FF453A]">
                            <AlertTriangle className="h-10 w-10 text-[#FF453A]" />
                          </div>

                          <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{overlayResult.title || "등록 오류"}</h2>
                            <p className="text-sm sm:text-base text-[#FF453A] bg-[#121212] p-3.5 rounded-2xl border border-rose-900/40 leading-relaxed font-bold">
                              {overlayResult.message}
                            </p>
                          </div>

                          {/* 1.5s Progress shrink bar */}
                          <div className="w-full space-y-2 pt-1">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                              <span>스캐너 자동 복귀</span>
                              <span className="font-mono font-black text-white">1.5초</span>
                            </div>
                            <div className="w-full h-3 bg-[#121212] rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF453A] rounded-full animate-shrink-15s"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Controls Area - Large full-width touch targets */}
                <div className="w-full space-y-2 shrink-0">
                  <p className="text-center text-xs font-bold text-indigo-300/90 py-0.5">
                    💡 20~30cm 거리에서 비추면 가장 선명하고 빠르게 인식됩니다.
                  </p>

                  {/* Manual input row */}
                  <form onSubmit={handleManualSubmit} className="flex gap-2.5 items-center bg-[#1E1E1E] p-2.5 rounded-2xl border-2 border-[#2C2C2E] shadow-xl">
                    <Input
                      type="text"
                      placeholder="학번/QR 직접 입력 (예: 60101)"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      disabled={manualPending}
                      className="flex-1 bg-[#121212] border-[#2C2C2E] text-white text-base sm:text-lg placeholder:text-slate-500 h-13 sm:h-14 rounded-xl px-4 font-bold"
                    />
                    <Button
                      type="submit"
                      disabled={manualPending || !manualInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base sm:text-lg h-13 sm:h-14 px-6 sm:px-7 rounded-xl shadow-md"
                    >
                      입력
                    </Button>
                  </form>

                  {/* Stop Scan Button */}
                  <Button
                    onClick={() => setScanState("idle")}
                    variant="outline"
                    className="w-full border-2 border-[#2C2C2E] bg-[#1E1E1E] text-slate-200 hover:bg-[#2C2C2E] hover:text-white py-3.5 h-13 sm:h-14 rounded-2xl text-base sm:text-lg font-black gap-2.5 shadow-xl active:scale-[0.98] transition-all"
                  >
                    <EyeOff className="h-5 w-5" />
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
