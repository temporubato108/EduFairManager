"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Printer, Download, Sparkles, CheckCircle2, School, Calendar, Star } from "lucide-react";

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentNumber: string;
  eventName: string;
  completedCount: number;
  totalBooths: number;
}

export function CertificateModal({
  open,
  onOpenChange,
  studentName,
  studentNumber,
  eventName,
  completedCount,
  totalBooths,
}: CertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const todayKorean = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-amber-200/60 dark:border-amber-900/40 bg-slate-900 text-white p-0 overflow-hidden rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-b border-white/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-amber-300">
                디지털 축제 완주 인증서
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                축제 미션을 성공적으로 완주한 학생에게 수여됩니다.
              </p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-bold text-xs gap-1.5 h-8 px-2.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄 / 캡처</span>
          </Button>
        </DialogHeader>

        {/* Certificate Card Printable Area */}
        <div className="p-5 sm:p-7 bg-slate-950 flex flex-col items-center">
          <div
            ref={certificateRef}
            className="w-full relative rounded-2xl bg-gradient-to-b from-amber-50 via-white to-amber-50/60 text-slate-900 p-6 sm:p-8 border-4 border-double border-amber-400/80 shadow-2xl flex flex-col items-center text-center space-y-4 overflow-hidden"
          >
            {/* Background luxury watermark ornament */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              <Award className="w-80 h-80 text-amber-900" />
            </div>

            {/* Top Emblem */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white mb-1">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-black tracking-widest text-amber-700 uppercase">
                CERTIFICATE OF COMPLETION
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 font-serif">
                체 험 완 주 인 증 서
              </h2>
            </div>

            {/* Recipient Box */}
            <div className="w-full py-3 border-y border-amber-200/80 space-y-1 my-2 bg-amber-50/50 rounded-lg">
              <p className="text-xs text-slate-500 font-semibold">{studentNumber}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{studentName}</p>
            </div>

            {/* Citation Statement */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-sm font-medium">
              위 학생은 <strong>&apos;{eventName}&apos;</strong>의 다양한 체험 부스에 열정적으로 참여하여 
              총 <strong>{completedCount}개</strong>의 스탬프 미션을 훌륭히 완주하였으므로 이 인증서를 수여합니다.
            </p>

            {/* Achievement Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>미션 달성률: {Math.round((completedCount / (totalBooths || 1)) * 100)}% 완주</span>
            </div>

            {/* Date & Official Seal Stamp */}
            <div className="w-full pt-4 flex items-end justify-between text-left">
              <div className="space-y-0.5">
                <p className="text-[11px] text-slate-500 font-semibold">발급일자</p>
                <p className="text-xs font-bold text-slate-800">{todayKorean}</p>
                <p className="text-[10px] text-slate-400 mt-1">에듀페어 모바일 축제 관리 시스템</p>
              </div>

              {/* Red Official Hanko Seal Stamp */}
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-red-600/80 flex items-center justify-center text-red-600 font-black text-xs leading-none rotate-[-6deg] shadow-xs bg-red-50/40 p-1">
                  <div className="w-13 h-13 rounded-full border border-red-600/80 flex flex-col items-center justify-center text-[10px] font-bold">
                    <span>에듀페어</span>
                    <span className="text-[8px] font-normal">인증직인</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            💡 화면을 길게 누르거나 스마트폰 화면 캡처로 갤러리에 저장하실 수 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
