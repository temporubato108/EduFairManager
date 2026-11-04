"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Copy, Check, School, Camera, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuideModal({ open, onOpenChange }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<"admin" | "booth">("admin");
  const [copied, setCopied] = useState(false);

  const adminGuideText = `======================================================================
🎪 [에듀페어 매니저] 행사 총괄 담당 선생님 3단계 준비 가이드
======================================================================

1단계: 행사 개설 (1초 완성)
  ① 에듀페어 매니저 로그인 후 [행사 관리] 접속
  ② 상단의 [🚀 샘플 행사 1초 생성] 클릭 ➔ 표준 부스 6개 & 가상 학생 10명 자동 세팅!
  ③ 필요 시 행사명과 날짜를 수정하거나, [새 행사 등록]으로 우리 학교에 맞게 커스텀

2단계: 부스 운영 준비 & QR 출력
  ① [부스 관리] 메뉴에서 부스 이름과 담당 선생님 성함 입력
  ② 우측 상단 [부스 안내판 일괄 PDF 다운로드] 클릭
  ③ 출력된 A4 용지를 행사 당일 각 부스 책상/벽면에 부착하면 준비 끝!
     (부스 담당 선생님은 별도 앱 설치나 로그인 없이 이 QR만 찍으면 즉시 스캐너 작동)

3단계: 학생 QR 명찰 배포
  ① [학생 관리] ➔ [엑셀 서식 다운로드] 후 나이스(NEIS) 학번/이름 붙여넣기
  ② [엑셀 학생 업로드]로 전교생 명단 1초 등록
  ③ [전체 학생 QR PDF 출력] 클릭 ➔ A4 한 장당 12명씩 절취선이 들어간 목걸이 명찰 일괄 출력
======================================================================`;

  const boothGuideText = `======================================================================
📷 [에듀페어 매니저] 부스 운영 선생님 10초 현장 매뉴얼
======================================================================

Q. 앱을 깔아야 하나요?
A. 아닙니다! 별도 앱 설치나 회원가입/로그인이 일절 필요 없습니다.

[체험 진행 순서]
1. 부스 스캐너 켜기
   - 부스 책상에 부착된 [부스 전용 QR코드]를 선생님 개인 휴대폰 기본 카메라로 비춥니다.
   - 화면에 뜨는 링크를 누르면 즉시 '부스 스캐너' 카메라가 켜집니다.

2. 스탬프 찍어주기
   - 학생이 체험을 마치면 목걸이의 [학생 QR코드]를 화면에 비춥니다.
   - 0.2초 만에 "삑-" 소리와 함께 초록색 체크 화면이 뜨면 도장 날인 완료!
   * [확인] 버튼을 누를 필요 없이 3초 후 자동으로 다음 학생 스캔 대기 모드로 돌아갑니다.

3. 카메라 인식이 잘 안 될 때 (비상 조치)
   - 스캐너 화면 아래 [학번으로 직접 입력하기] 버튼을 누릅니다.
   - 학생 학번(예: 10101 또는 1-1-1)이나 이름을 입력하고 엔터를 치면 즉시 도장이 찍힙니다.

[💡 원활한 진행을 위한 팁]
- 카카오톡으로 열렸을 때는 우측 하단 [...] ➔ [Safari/기본 브라우저로 열기]를 눌러주세요.
- 다른 카메라 앱이나 인스타그램이 켜져 있으면 종료해 주세요.
======================================================================`;

  const handleCopy = () => {
    const textToCopy = activeTab === "admin" ? adminGuideText : boothGuideText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                  에듀페어 매니저 실전 사용 가이드
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  행사 준비 교사 및 현장 부스 운영 선생님을 위한 퀵 매뉴얼
                </p>
              </div>
            </div>
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs gap-1.5 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>가이드 복사</span>
                </>
              )}
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pt-3">
            <button
              onClick={() => {
                setActiveTab("admin");
                setCopied(false);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "admin"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <School className="w-3.5 h-3.5" />
              <span>행사 총괄 3단계 준비</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("booth");
                setCopied(false);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "booth"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>부스 운영 교사용 10초 퀵 매뉴얼</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
          {activeTab === "admin" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/60 dark:bg-indigo-950/20 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>1단계: 행사 개설 (1초 완성)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs pl-5.5">
                  [행사 관리] 상단의 <strong>[🚀 샘플 행사 1초 생성]</strong> 버튼을 누르면 인기 부스 6종과 학생 10명이 바로 세팅됩니다. 이름과 날짜를 학교 일정에 맞게 수정하세요.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px]">2</span>
                  <span>2단계: 부스 안내판 일괄 출력 & 부착</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs pl-5.5">
                  [부스 관리] ➔ 우측 상단 <strong>[부스 안내판 일괄 PDF 다운로드]</strong>를 클릭하여 출력한 뒤 각 부스 책상이나 벽면에 부착합니다. 부스 교사는 이 QR만 찍으면 즉시 스캐너가 열립니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px]">3</span>
                  <span>3단계: 학생 QR 명찰 배포</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs pl-5.5">
                  [학생 관리] ➔ <strong>[엑셀 학생 업로드]</strong>로 전교생 명단을 올린 후 <strong>[전체 학생 QR PDF 출력]</strong>을 누르면 A4 1장당 12명씩 절취선이 들어간 명찰 카드가 자동 인쇄됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                💡 부스 담당 선생님께 카카오톡이나 메신저로 복사해서 전달해 드릴 수 있는 핵심 안내문입니다.
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  1. 부스 스캐너 켜기 (앱 설치 ❌, 로그인 ❌)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 pl-3">
                  부스 책상에 부착된 [부스 전용 QR코드]를 스마트폰 기본 카메라로 비추면 바로 스캐너 화면이 실행됩니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  2. 학생 스탬프 찍어주기
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 pl-3">
                  학생이 체험을 마치면 목걸이의 [학생 QR코드]를 비춥니다. 0.2초 만에 &quot;삑-&quot; 소리와 함께 도장이 찍히며, 3초 후 자동으로 다음 학생 대기 모드로 돌아갑니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  3. 비상 조치 (카메라 인식이 잘 안 될 때)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 pl-3">
                  스캐너 화면 아래 <strong>[학번으로 직접 입력하기]</strong> 버튼을 누른 후 학번(예: 10101 또는 1-1-1)을 입력하면 즉시 도장을 찍어줄 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
