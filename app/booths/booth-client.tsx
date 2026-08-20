"use client";

import { useState, useTransition, useEffect } from "react";
import { jsPDF } from "jspdf";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  QrCode,
  AlertTriangle,
  Loader2,
  Download,
  Printer,
  Store,
  FileText,
  Camera,
  ExternalLink,
} from "lucide-react";
import {
  getBoothsAction,
  createBoothAction,
  updateBoothAction,
  deleteBoothAction,
} from "./actions";
import QRCode from "qrcode";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

interface Booth {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  operator_id: string | null;
  created_at: string;
  operator_name: string;
}

interface BoothClientPageProps {
  initialEvents: EventOption[];
  teachers: TeacherOption[];
}

export function BoothClientPage({ initialEvents, teachers }: BoothClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFetchPending, startFetchTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState<Booth | null>(null);
  const [viewingQrBooth, setViewingQrBooth] = useState<Booth | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // PDF Building State
  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");

  // Create/Edit Form States
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOperatorName, setFormOperatorName] = useState("");

  // Load selected event's default preference on start
  useEffect(() => {
    if (initialEvents.length > 0) {
      const firstEventId = initialEvents[0].id;
      setSelectedEventId(firstEventId);
      loadBooths(firstEventId);
    }
  }, [initialEvents]);

  // Load Booths
  const loadBooths = (eventId: string) => {
    startFetchTransition(async () => {
      try {
        const data = await getBoothsAction(eventId);
        setBooths(data);
      } catch (err) {
        const errorObj = err as Error;
        setErrorMessage(`부스 목록 로딩 실패: ${errorObj.message}`);
      }
    });
  };

  // Generate QR Code URL
  useEffect(() => {
    if (viewingQrBooth) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const boothUrl = `${origin}/kiosk?boothId=${viewingQrBooth.id}`;
      
      QRCode.toDataURL(boothUrl, { width: 700, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error("QR Code generation error", err);
          setErrorMessage("QR 코드를 생성하는 데 실패했습니다.");
        });
    } else {
      setQrCodeDataUrl("");
    }
  }, [viewingQrBooth]);

  // Handle Event Filter Change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    loadBooths(eventId);
  };

  // Reset Form
  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormOperatorName("");
    setErrorMessage(null);
  };

  // Open Edit Form
  const openEdit = (booth: Booth) => {
    setEditingBooth(booth);
    setFormName(booth.name);
    setFormDesc(booth.description || "");
    setFormOperatorName(booth.operator_name === "미지정" ? "" : booth.operator_name);
    setErrorMessage(null);
  };

  // Handle Create Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !formName) return;

    startTransition(async () => {
      const res = await createBoothAction({
        event_id: selectedEventId,
        name: formName,
        description: formDesc || undefined,
        operator_name: formOperatorName.trim() || undefined,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCreateOpen(false);
        resetForm();
        loadBooths(selectedEventId);
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooth || !formName) return;

    startTransition(async () => {
      const res = await updateBoothAction(editingBooth.id, {
        name: formName,
        description: formDesc || undefined,
        operator_name: formOperatorName.trim() || undefined,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingBooth(null);
        resetForm();
        loadBooths(selectedEventId);
      }
    });
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (!confirm("정말 이 부스를 삭제하시겠습니까? 부스 소속 기록 및 로그는 남지 않을 수 있습니다.")) return;

    startTransition(async () => {
      const res = await deleteBoothAction(id);
      if (res.error) {
        alert(`삭제 실패: ${res.error}`);
      } else {
        loadBooths(selectedEventId);
      }
    });
  };

  // Handle PNG Download
  const handleDownloadPng = () => {
    if (!qrCodeDataUrl || !viewingQrBooth) return;
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `booth_${viewingQrBooth.name.replace(/\s+/g, "_")}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print QR (Exact A4 Booth Sign template, matching whole PDF layout)
  const handlePrintQr = () => {
    if (!qrCodeDataUrl || !viewingQrBooth) return;

    const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
    const activeEventName = activeEvent?.name || "EduFair 행사";

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>부스 QR 안내판 - ${viewingQrBooth.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Segoe UI", Roboto, sans-serif;
              background: white;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 95vh;
            }
            .sign-frame {
              width: 100%;
              max-width: 186mm;
              height: 268mm;
              border: 3px solid #cbd5e1;
              border-radius: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow: hidden;
              background: #ffffff;
              box-sizing: border-box;
            }
            .top-banner {
              width: 100%;
              background: #0f172a;
              padding: 24px 20px 20px;
              text-align: center;
            }
            .event-name {
              font-size: 15px;
              font-weight: 700;
              color: #818cf8;
              margin-bottom: 6px;
            }
            .banner-title {
              font-size: 26px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: -0.5px;
            }
            .content-area {
              flex: 1;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-evenly;
              padding: 24px 30px 28px;
            }
            .booth-header {
              text-align: center;
            }
            .booth-name {
              font-size: 34px;
              font-weight: 900;
              color: #0f172a;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
              line-height: 1.2;
            }
            .operator-name {
              font-size: 18px;
              font-weight: 700;
              color: #64748b;
            }
            .qr-wrapper {
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              padding: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            }
            .qr-wrapper img {
              width: 105mm;
              height: 105mm;
              display: block;
            }
            .guide-box {
              width: 100%;
              background: #f8fafc;
              border: 1.5px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px 20px;
              text-align: center;
            }
            .guide-title {
              font-size: 17px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .guide-desc {
              font-size: 13px;
              color: #475569;
              line-height: 1.5;
            }
            @media print {
              body {
                min-height: auto;
                background: white;
              }
              .sign-frame {
                border: 3px solid #cbd5e1;
                height: 268mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="sign-frame">
            <div class="top-banner">
              <div class="event-name">${activeEventName}</div>
              <div class="banner-title">EduFair 부스 안내판</div>
            </div>
            <div class="content-area">
              <div class="booth-header">
                <h1 class="booth-name">${viewingQrBooth.name}</h1>
                <p class="operator-name">담당 교사: ${viewingQrBooth.operator_name || "미지정"}</p>
              </div>
              <div class="qr-wrapper">
                <img src="${qrCodeDataUrl}" />
              </div>
              <div class="guide-box">
                <div class="guide-title">📌 운영 교사 안내</div>
                <p class="guide-desc">
                  스마트폰 카메라로 이 QR 코드를 비추어 접속하면<br />
                  본 부스의 참여 기록 전용 키오스크 화면으로 자동 연결됩니다.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  // Advanced High-Definition Canvas-to-PDF Exporter using jsPDF for Booth Signs
  const handleExportBoothsPdf = async () => {
    if (booths.length === 0 || !selectedEventId) return;

    setPdfBuilding(true);
    setPdfStatus("PDF 문서 준비 중...");

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      // Canvas dimensions (2x scale for 300 DPI high-definition print)
      const canvasWidth = 1240;
      const canvasHeight = 1754;

      const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
      const activeEventName = activeEvent?.name || "행사";
      const cleanEventName = activeEvent ? activeEvent.name.replace(/\s+/g, "_") : "event";

      // Offscreen Canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("캔버스 렌더러를 초기화할 수 없습니다.");

      // Temporary offscreen canvas for QR rendering
      const qrCanvas = document.createElement("canvas");

      for (let i = 0; i < booths.length; i++) {
        const booth = booths[i];
        setPdfStatus(`부스 안내판 렌더링 중 (${i + 1}/${booths.length} 부스)...`);

        // 1. Clear background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Outer Border Frame
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 4;
        ctx.strokeRect(60, 60, canvasWidth - 120, canvasHeight - 120);

        // 3. Top Banner (Dark navy / slate)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(60, 60, canvasWidth - 120, 160);

        // Event Name
        ctx.fillStyle = "#818cf8";
        ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(activeEventName, canvasWidth / 2, 115);

        // Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
        ctx.fillText("EduFair 부스 안내판", canvasWidth / 2, 175);

        // 4. Booth Name (Large Centered)
        ctx.fillStyle = "#0f172a";
        const boothNameFontSize = booth.name.length > 12 ? 40 : 50;
        ctx.font = `bold ${boothNameFontSize}px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif`;
        ctx.fillText(String(booth.name || ""), canvasWidth / 2, 305);

        // 5. Operator Teacher Name
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
        ctx.fillText(`담당 교사: ${booth.operator_name || "미지정"}`, canvasWidth / 2, 365);

        // 6. Large QR Code (~108mm = 640px, +20mm larger)
        const kioskUrl = typeof window !== "undefined"
          ? `${window.location.origin}/kiosk?boothId=${booth.id}`
          : "";

        const qrDisplaySize = 640;
        const qrX = (canvasWidth - qrDisplaySize) / 2;
        const qrY = 415;

        await QRCode.toCanvas(qrCanvas, kioskUrl, {
          width: qrDisplaySize,
          margin: 1,
        });

        // QR Background box with subtle border
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - 10, qrY - 10, qrDisplaySize + 20, qrDisplaySize + 20);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.strokeRect(qrX - 10, qrY - 10, qrDisplaySize + 20, qrDisplaySize + 20);

        ctx.drawImage(qrCanvas, qrX, qrY, qrDisplaySize, qrDisplaySize);

        // 7. Bottom Guidance Box
        const guideY = 1110;
        const guideW = canvasWidth - 240;
        const guideX = 120;
        const guideH = 200;

        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(guideX, guideY, guideW, guideH);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(guideX, guideY, guideW, guideH);

        // Guide Title
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📌 운영 교사 안내", canvasWidth / 2, guideY + 48);

        // Guide Description lines
        ctx.fillStyle = "#475569";
        ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
        ctx.fillText("스마트폰 카메라로 이 QR 코드를 비추어 접속하면", canvasWidth / 2, guideY + 100);
        ctx.fillText("본 부스의 참여 기록 전용 키오스크 화면으로 자동 연결됩니다.", canvasWidth / 2, guideY + 140);

        // Add page to jsPDF
        if (i > 0) {
          doc.addPage();
        }
        const pageJpgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        doc.addImage(pageJpgDataUrl, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      setPdfStatus("PDF 파일 다운로드 중...");
      doc.save(`booths_qr_${cleanEventName}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Booth PDF generation error:", err);
      alert(`PDF 생성 중 오류가 발생했습니다: ${msg}`);
    } finally {
      setPdfBuilding(false);
      setPdfStatus("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Upper Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF]">부스 관리</h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              각 행사의 체험 부스를 등록하고 전용 QR 코드를 발급합니다.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            disabled={!selectedEventId || isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>새 부스 등록</span>
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            {isFetchPending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#98989D] mt-5">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>부스 정보를 불러오는 중...</span>
              </div>
            )}
            {selectedEventId && booths.length > 0 && (
              <Button
                onClick={handleExportBoothsPdf}
                disabled={pdfBuilding}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white font-bold gap-2 mt-5 sm:mt-auto ml-auto"
              >
                {pdfBuilding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>전체 부스 QR PDF 출력</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Status display for PDF generator */}
        {pdfBuilding && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-semibold">{pdfStatus}</p>
            <p className="text-[10px] text-slate-400">PDF 저장이 완료될 때까지 브라우저 창을 닫지 마세요.</p>
          </div>
        )}

        {/* Booth Table */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardContent className="p-0">
            {!selectedEventId ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Store className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">행사를 먼저 선택해주세요.</p>
              </div>
            ) : booths.length === 0 && !isFetchPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Store className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">이 행사에 등록된 부스가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="border-slate-200 dark:border-[#2C2C2E]">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2C2C2E]">
                    <TableHead className="w-[30%]">부스명</TableHead>
                    <TableHead className="w-[30%]">담당교사</TableHead>
                    <TableHead className="w-[20%]">부스 QR</TableHead>
                    <TableHead className="w-[20%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booths.map((booth) => (
                    <TableRow
                      key={booth.id}
                      className="border-slate-100 hover:bg-slate-50/50 dark:border-[#2C2C2E] dark:hover:bg-[#252525]"
                    >
                      <TableCell className="font-semibold text-slate-800 dark:text-white">
                        {booth.name}
                        {booth.description && (
                          <p className="text-xs font-normal text-slate-400 dark:text-[#98989D] mt-0.5">
                            {booth.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-[#98989D] text-sm">
                        {booth.operator_name === "미지정" ? (
                          <span className="text-amber-500 font-medium">교사 미지정</span>
                        ) : (
                          <span className="text-slate-800 dark:text-white font-medium">{booth.operator_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setViewingQrBooth(booth)}
                            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 px-2.5 rounded-full text-xs font-medium gap-1.5"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>QR 보기</span>
                          </Button>
                          <a
                            href={`/kiosk?boothId=${booth.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 transition-colors"
                            title="이 부스의 키오스크 스캐너 바로 열기"
                          >
                            <Camera className="h-3 w-3" />
                            <span>스캐너 열기</span>
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-[#98989D]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                            <DropdownMenuItem onClick={() => openEdit(booth)} className="gap-2 cursor-pointer dark:text-white dark:hover:bg-[#252525]">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>정보 수정</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(booth.id)}
                              className="gap-2 cursor-pointer text-rose-600 dark:text-[#FF453A] dark:hover:bg-[#3A1C1C]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>부스 삭제</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 1. Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>새 부스 등록</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                선택한 행사에 소속될 체험 부스를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="c-name" className="text-slate-600 dark:text-[#98989D]">부스명</Label>
                <Input
                  id="c-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 3D 프린터 부스"
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-desc" className="text-slate-600 dark:text-[#98989D]">상세 설명 (선택)</Label>
                <Input
                  id="c-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="부스 체험 주제 및 설명을 간략하게 기록하세요."
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-operator" className="text-slate-600 dark:text-[#98989D]">담당 운영교사 (선택)</Label>
                <Input
                  id="c-operator"
                  type="text"
                  placeholder="예: 홍길동"
                  value={formOperatorName}
                  onChange={(e) => setFormOperatorName(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                  className="text-slate-500 dark:text-[#98989D]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    "부스 생성"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Edit Dialog */}
        <Dialog open={editingBooth !== null} onOpenChange={(open) => !open && setEditingBooth(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>부스 정보 수정</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                선택한 부스의 설명 또는 담당 운영교사를 관리합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="e-name" className="text-slate-600 dark:text-[#98989D]">부스명</Label>
                <Input
                  id="e-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="e-desc" className="text-slate-600 dark:text-[#98989D]">상세 설명 (선택)</Label>
                <Input
                  id="e-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="e-operator" className="text-slate-600 dark:text-[#98989D]">담당 운영교사 (선택)</Label>
                <Input
                  id="e-operator"
                  type="text"
                  placeholder="예: 홍길동"
                  value={formOperatorName}
                  onChange={(e) => setFormOperatorName(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingBooth(null)}
                  disabled={isPending}
                  className="text-slate-500 dark:text-[#98989D]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "변경사항 저장"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. QR Code View Dialog */}
        <Dialog open={viewingQrBooth !== null} onOpenChange={(open) => !open && setViewingQrBooth(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-indigo-600 dark:text-indigo-400 text-xl font-bold tracking-tight">부스 QR 코드</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-[#98989D]">
                교사가 모바일로 이 QR 코드를 스캔하면 해당 부스의 운영화면으로 바로 자동 연결됩니다.
              </DialogDescription>
            </DialogHeader>

            {viewingQrBooth && (
              <div className="flex flex-col items-center justify-center p-2 sm:p-3 space-y-3">
                {/* Booth Sign Preview Container */}
                <div className="w-full max-w-[280px] bg-white rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-md overflow-hidden flex flex-col text-slate-800 text-center">
                  <div className="bg-[#0f172a] py-2 px-3 text-center">
                    <p className="text-[10px] font-bold text-indigo-400 truncate">
                      {initialEvents.find((e) => e.id === selectedEventId)?.name || "EduFair 행사"}
                    </p>
                    <p className="text-xs font-black text-white">EduFair 부스 안내판</p>
                  </div>
                  
                  <div className="pt-3 pb-1 space-y-0.5 px-3">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{viewingQrBooth.name}</h3>
                    <p className="text-xs font-bold text-slate-500">담당 교사: {viewingQrBooth.operator_name || "미지정"}</p>
                  </div>
                  
                  {/* QR Display area */}
                  <div className="px-3 py-1 flex items-center justify-center">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs inline-block">
                      {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt={`${viewingQrBooth.name} QR`} className="w-44 h-44 object-contain" />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center bg-slate-50">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="m-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-800">📌 운영 교사 안내</p>
                    <p className="text-slate-500 text-[9px] leading-relaxed">스마트폰 카메라로 스캔 시 키오스크 화면으로 자동 연결됩니다.</p>
                  </div>
                </div>

                <div className="w-full flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#98989D] justify-center bg-slate-50 dark:bg-[#121212] py-2 rounded-lg border border-slate-200 dark:border-[#2C2C2E] px-3 font-mono break-all">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex-shrink-0">LINK:</span>
                  <span>
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/kiosk?boothId=${viewingQrBooth.id}`
                      : ""}
                  </span>
                </div>

                {/* Quick open scanner */}
                <a
                  href={`/kiosk?boothId=${viewingQrBooth.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
                >
                  <Camera className="h-4 w-4" />
                  <span>이 부스 스캐너 바로 열기 (카메라 테스트)</span>
                </a>
              </div>
            )}

            <DialogFooter className="flex flex-row gap-2 justify-center pt-2 sm:justify-center">
              <Button
                variant="outline"
                onClick={handlePrintQr}
                disabled={!qrCodeDataUrl}
                className="flex-1 bg-slate-50 dark:bg-transparent border-slate-200 dark:border-[#2C2C2E] text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#2C2C2E] font-medium gap-1.5"
              >
                <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>QR 인쇄</span>
              </Button>
              <Button
                onClick={handleDownloadPng}
                disabled={!qrCodeDataUrl}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 font-bold gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span>PNG 다운로드</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
