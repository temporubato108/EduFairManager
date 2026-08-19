"use client";

import { useState, useTransition, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { loadKoreanFontBytes, registerFontkitSafe } from "@/lib/font-helper";
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
  const [formOperatorId, setFormOperatorId] = useState<string>("unassigned");

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
      
      QRCode.toDataURL(boothUrl, { width: 300, margin: 2 })
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
    setFormOperatorId("unassigned");
    setErrorMessage(null);
  };

  // Open Edit Form
  const openEdit = (booth: Booth) => {
    setEditingBooth(booth);
    setFormName(booth.name);
    setFormDesc(booth.description || "");
    setFormOperatorId(booth.operator_id || "unassigned");
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
        operator_id: formOperatorId === "unassigned" ? null : formOperatorId,
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
        operator_id: formOperatorId === "unassigned" ? null : formOperatorId,
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

  // Handle Print QR
  const handlePrintQr = () => {
    if (!qrCodeDataUrl || !viewingQrBooth) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>부스 QR 인쇄 - ${viewingQrBooth.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              border: 2px solid #2C2C2E;
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
            }
            h1 {
              font-size: 28px;
              margin-bottom: 5px;
            }
            p {
              color: #555;
              font-size: 16px;
              margin-bottom: 30px;
            }
            img {
              width: 250px;
              height: 250px;
            }
            @media print {
              body { background: white; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${viewingQrBooth.name}</h1>
            <p>스캔하면 즉시 이 부스의 운영화면(Kiosk)으로 연결됩니다.</p>
            <img src="${qrCodeDataUrl}" />
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Advanced PDF Exporter for Booth Signs
  const handleExportBoothsPdf = async () => {
    if (booths.length === 0 || !selectedEventId) return;

    setPdfBuilding(true);
    setPdfStatus("한글 나눔고딕 폰트 불러오는 중...");

    try {
      const fontBytes = await loadKoreanFontBytes();

      setPdfStatus("PDF 문서 초기화 중...");
      const pdfDoc = await PDFDocument.create();
      registerFontkitSafe(pdfDoc);
      const customFont = await pdfDoc.embedFont(fontBytes);

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      for (let i = 0; i < booths.length; i++) {
        const booth = booths[i];
        setPdfStatus(`부스 QR 코드 생성 및 페이지 렌더링 중 (${i + 1}/${booths.length})...`);

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const kioskUrl = typeof window !== "undefined"
          ? `${window.location.origin}/kiosk?boothId=${booth.id}`
          : "";

        const qrDataUrl = await QRCode.toDataURL(kioskUrl, {
          margin: 1,
          width: 350,
        });

        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
        const qrImage = await pdfDoc.embedPng(qrBytes);

        // Draw Flyer UI
        page.drawRectangle({
          x: 40,
          y: pageHeight - 100,
          width: pageWidth - 80,
          height: 60,
          color: rgb(0.07, 0.07, 0.07),
        });

        const activeEventName = initialEvents.find((e) => e.id === selectedEventId)?.name || "행사";
        page.drawText(activeEventName, {
          x: 60,
          y: pageHeight - 65,
          size: 11,
          font: customFont,
          color: rgb(0.0, 0.9, 1.0),
        });

        page.drawText("EduFair 부스 안내판", {
          x: 60,
          y: pageHeight - 85,
          size: 15,
          font: customFont,
          color: rgb(1, 1, 1),
        });

        page.drawRectangle({
          x: 40,
          y: 60,
          width: pageWidth - 80,
          height: pageHeight - 160,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 2,
        });

        const boothNameSize = booth.name.length > 10 ? 24 : 32;
        const nameWidth = customFont.widthOfTextAtSize(booth.name, boothNameSize);
        page.drawText(booth.name, {
          x: pageWidth / 2 - nameWidth / 2,
          y: pageHeight - 170,
          size: boothNameSize,
          font: customFont,
          color: rgb(0.1, 0.1, 0.1),
        });

        const opText = `담당 교사: ${booth.operator_name || "미지정"}`;
        const opWidth = customFont.widthOfTextAtSize(opText, 14);
        page.drawText(opText, {
          x: pageWidth / 2 - opWidth / 2,
          y: pageHeight - 205,
          size: 14,
          font: customFont,
          color: rgb(0.4, 0.4, 0.4),
        });

        const qrSize = 260;
        page.drawImage(qrImage, {
          x: pageWidth / 2 - qrSize / 2,
          y: 190,
          width: qrSize,
          height: qrSize,
        });

        const footerTitle = "운영 교사 안내";
        const footerTitleWidth = customFont.widthOfTextAtSize(footerTitle, 13);
        page.drawText(footerTitle, {
          x: pageWidth / 2 - footerTitleWidth / 2,
          y: 140,
          size: 13,
          font: customFont,
          color: rgb(0.07, 0.07, 0.07),
        });

        const guideText1 = "스마트폰 카메라로 이 QR 코드를 비추어 접속하면";
        const guideText1Width = customFont.widthOfTextAtSize(guideText1, 10);
        page.drawText(guideText1, {
          x: pageWidth / 2 - guideText1Width / 2,
          y: 115,
          size: 10,
          font: customFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        const guideText2 = "본 부스의 참여 기록 전용 키오스크 화면으로 자동 연결됩니다.";
        const guideText2Width = customFont.widthOfTextAtSize(guideText2, 10);
        page.drawText(guideText2, {
          x: pageWidth / 2 - guideText2Width / 2,
          y: 95,
          size: 10,
          font: customFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      setPdfStatus("PDF 인코딩 및 빌드 마무리 중...");
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
      const cleanEventName = activeEvent ? activeEvent.name.replace(/\s+/g, "_") : "event";
      link.download = `booths_qr_${cleanEventName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다.");
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
              행사별로 운영될 부스를 지정하고 QR 코드를 출력합니다.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            disabled={!selectedEventId || isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>새 부스 등록</span>
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            {isFetchPending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#98989D] mt-5">
                <Loader2 className="h-4 w-4 animate-spin text-[#00E5FF]" />
                <span>부스 정보를 불러오는 중...</span>
              </div>
            )}
            {selectedEventId && booths.length > 0 && (
              <Button
                onClick={handleExportBoothsPdf}
                disabled={pdfBuilding}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white dark:bg-[#32D74B] dark:hover:bg-[#28B83B] dark:text-black font-bold gap-2 mt-5 sm:mt-auto ml-auto"
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
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-[#00E5FF]/20 dark:bg-cyan-950/20 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-[#00E5FF] mx-auto" />
            <p className="text-xs text-indigo-800 dark:text-[#00E5FF] font-semibold">{pdfStatus}</p>
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
                            className="text-[#00E5FF] hover:bg-cyan-950/20 hover:text-[#00D0EB] border border-[#00E5FF]/20 px-2.5 rounded-full text-xs font-medium gap-1.5"
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
                <Label htmlFor="c-desc" className="text-slate-600 dark:text-[#98989D]">상세 설명</Label>
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
                <Label htmlFor="c-operator" className="text-slate-600 dark:text-[#98989D]">담당 운영교사</Label>
                <Select value={formOperatorId} onValueChange={(val) => val && setFormOperatorId(val)} disabled={isPending}>
                  <SelectTrigger id="c-operator" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                    <SelectValue placeholder="담당 교사 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                    <SelectItem value="unassigned">담당 교사 없음 (미지정)</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold"
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
                <Label htmlFor="e-desc" className="text-slate-600 dark:text-[#98989D]">상세 설명</Label>
                <Input
                  id="e-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="e-operator" className="text-slate-600 dark:text-[#98989D]">담당 운영교사</Label>
                <Select value={formOperatorId} onValueChange={(val) => val && setFormOperatorId(val)} disabled={isPending}>
                  <SelectTrigger id="e-operator" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                    <SelectValue placeholder="담당 교사 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                    <SelectItem value="unassigned">담당 교사 없음 (미지정)</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold"
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
          <DialogContent className="border-[#2C2C2E] bg-[#1E1E1E] text-white max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-[#00E5FF] text-xl font-bold tracking-tight">부스 QR 코드</DialogTitle>
              <DialogDescription className="text-[#98989D]">
                교사가 모바일로 이 QR 코드를 스캔하면 해당 부스의 운영화면으로 바로 자동 연결됩니다.
              </DialogDescription>
            </DialogHeader>

            {viewingQrBooth && (
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <span className="text-lg font-bold text-white tracking-wide">{viewingQrBooth.name}</span>
                
                {/* QR Display area */}
                <div className="bg-white p-4 rounded-2xl border-4 border-[#00E5FF]">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt={`${viewingQrBooth.name} QR`} className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-[#121212]">
                      <Loader2 className="h-8 w-8 animate-spin text-[#00E5FF]" />
                    </div>
                  )}
                </div>

                <div className="w-full flex items-center gap-1.5 text-[11px] text-[#98989D] justify-center bg-[#121212] py-2 rounded-lg border border-[#2C2C2E] px-3 font-mono break-all">
                  <span className="text-[#00E5FF] font-semibold flex-shrink-0">LINK:</span>
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
                className="flex-1 bg-transparent border-[#2C2C2E] text-white hover:bg-[#2C2C2E] hover:text-white font-medium gap-1.5"
              >
                <Printer className="h-4 w-4 text-[#32D74B]" />
                <span>QR 인쇄</span>
              </Button>
              <Button
                onClick={handleDownloadPng}
                disabled={!qrCodeDataUrl}
                className="flex-1 bg-[#00E5FF] text-black hover:bg-[#00D0EB] font-bold gap-1.5"
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
