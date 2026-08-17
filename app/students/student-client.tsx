"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Users,
  Download,
} from "lucide-react";
import {
  getStudentsAction,
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
  importStudentsAction,
  Student,
  StudentInput,
} from "./actions";
import * as XLSX from "xlsx";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface StudentClientPageProps {
  initialEvents: EventOption[];
}

export function StudentClientPage({ initialEvents }: StudentClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFetchPending, startFetchTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // PDF Building State
  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");

  // Create/Edit Form States
  const [formGrade, setFormGrade] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");

  // Excel Upload File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<StudentInput[]>([]);

  // Load selected event's default preference on start
  useEffect(() => {
    if (initialEvents.length > 0) {
      const firstEventId = initialEvents[0].id;
      setSelectedEventId(firstEventId);
      loadStudents(firstEventId);
    }
  }, [initialEvents]);

  // Load Students
  const loadStudents = (eventId: string) => {
    startFetchTransition(async () => {
      try {
        const data = await getStudentsAction(eventId);
        setStudents(data);
      } catch (err) {
        const errorObj = err as Error;
        setErrorMessage(`학생 목록 로딩 실패: ${errorObj.message}`);
      }
    });
  };

  // Handle Event Filter Change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    loadStudents(eventId);
  };

  // Reset Form
  const resetForm = () => {
    setFormGrade("");
    setFormClass("");
    setFormNumber("");
    setFormName("");
    setErrorMessage(null);
  };

  // Open Edit Form
  const openEdit = (student: Student) => {
    setEditingStudent(student);
    
    // Parse grade-class-number from db representation
    // format: e.g. "6학년 1반 23번"
    const match = student.student_number.match(/(\d+)학년\s*(\d+)반\s*(\d+)번/);
    if (match) {
      setFormGrade(match[1]);
      setFormClass(match[2]);
      setFormNumber(match[3]);
    } else {
      // Fallback
      setFormGrade("");
      setFormClass("");
      setFormNumber("");
    }
    setFormName(student.name);
    setErrorMessage(null);
  };

  // Format Helper
  const getFormattedNumber = (g: string, c: string, n: string) => {
    return `${g}학년 ${c}반 ${n}번`;
  };

  // Handle Create Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !formGrade || !formClass || !formNumber || !formName) return;

    startTransition(async () => {
      const formattedNum = getFormattedNumber(formGrade, formClass, formNumber);
      const res = await createStudentAction(selectedEventId, {
        student_number: formattedNum,
        name: formName,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCreateOpen(false);
        resetForm();
        loadStudents(selectedEventId);
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !formGrade || !formClass || !formNumber || !formName) return;

    startTransition(async () => {
      const formattedNum = getFormattedNumber(formGrade, formClass, formNumber);
      const res = await updateStudentAction(editingStudent.id, {
        student_number: formattedNum,
        name: formName,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingStudent(null);
        resetForm();
        loadStudents(selectedEventId);
      }
    });
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (!confirm("정말 이 학생을 삭제하시겠습니까? 학생의 모든 참여 이력 및 대장 기록이 유실될 수 있습니다.")) return;

    startTransition(async () => {
      const res = await deleteStudentAction(id);
      if (res.error) {
        alert(`삭제 실패: ${res.error}`);
      } else {
        loadStudents(selectedEventId);
      }
    });
  };

  // Handle File Selection and Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        if (rawJson.length === 0) {
          throw new Error("엑셀 파일에 학생 데이터가 존재하지 않습니다.");
        }

        const validStudents: StudentInput[] = [];
        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];
          // Normalize keys by removing spaces
          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach((k) => {
            const val = row[k];
            normalizedRow[k.replace(/\s+/g, "")] = val !== null && val !== undefined ? String(val) : "";
          });

          const grade = normalizedRow["학년"] || normalizedRow["Grade"] || "";
          const cls = normalizedRow["반"] || normalizedRow["Class"] || "";
          const num = normalizedRow["번호"] || normalizedRow["Number"] || "";
          const name = normalizedRow["이름"] || normalizedRow["Name"] || "";

          if (!grade || !cls || !num || !name) {
            throw new Error(`행 ${i + 2}: 필수 데이터(학년, 반, 번호, 이름)가 누락되었습니다.`);
          }

          validStudents.push({
            student_number: getFormattedNumber(
              grade.trim(),
              cls.trim(),
              num.trim()
            ),
            name: name.trim(),
          });
        }

        setParsedData(validStudents);
        setParsedCount(validStudents.length);
      } catch (err) {
        const errorObj = err as Error;
        setErrorMessage(errorObj.message);
        setUploadFile(null);
        setParsedCount(null);
        setParsedData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Import Submit
  const handleImportSubmit = () => {
    if (!selectedEventId || parsedData.length === 0) return;

    startTransition(async () => {
      const res = await importStudentsAction(selectedEventId, parsedData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsUploadOpen(false);
        setUploadFile(null);
        setParsedCount(null);
        setParsedData([]);
        loadStudents(selectedEventId);
      }
    });
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      { "학년": 1, "반": 1, "번호": 1, "이름": "김민수" },
      { "학년": 1, "반": 1, "번호": 2, "이름": "이영희" },
      { "학년": 2, "반": 1, "번호": 1, "이름": "박철수" },
      { "학년": 3, "반": 2, "번호": 15, "이름": "정수진" },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Auto-fit column widths
    ws["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }];
    
    XLSX.utils.book_append_sheet(wb, ws, "학생_업로드_양식");
    XLSX.writeFile(wb, "학생_업로드_양식.xlsx");
  };

  // Download Registered Students as Excel
  const handleDownloadStudentsExcel = () => {
    if (students.length === 0) {
      alert("다운로드할 학생 데이터가 없습니다.");
      return;
    }
    const rows = students.map((s) => {
      const match = s.student_number.match(/(\d+)학년\s*(\d+)반\s*(\d+)번/);
      return {
        "학년": match ? match[1] : "",
        "반": match ? match[2] : "",
        "번호": match ? match[3] : "",
        "이름": s.name,
        "학번/식별자": s.student_number,
        "QR식별코드": s.qr_code,
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 40 }];
    
    const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
    const cleanEventName = activeEvent ? activeEvent.name.replace(/\s+/g, "_") : "행사";
    XLSX.utils.book_append_sheet(wb, ws, "학생명단");
    XLSX.writeFile(wb, `학생명단_${cleanEventName}.xlsx`);
  };

  // Advanced PDF Exporter (with Custom TTF Font & 3x4 Grid Layout)
  const handleExportPdf = async () => {
    if (students.length === 0 || !selectedEventId) return;

    setPdfBuilding(true);
    setPdfStatus("한글 나눔고딕 폰트 불러오는 중...");

    try {
      // 1. Fetch custom Korean font (NanumGothic) from Google Fonts Gstatic
      const fontUrl = "https://fonts.gstatic.com/s/nanumgothic/v23/PN_oRfi-QwtS4YL5Z65EtlqMy5rs1As.ttf";
      const fontBytes = await fetch(fontUrl).then((res) => {
        if (!res.ok) throw new Error("한글 폰트 로드 실패");
        return res.arrayBuffer();
      });

      setPdfStatus("PDF 문서 초기화 중...");
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      const customFont = await pdfDoc.embedFont(fontBytes);

      // A4 dimensions: 595.28 x 841.89 points
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 20;

      // 3 Columns x 4 Rows Grid (12 Cards per page)
      const cols = 3;
      const rows = 4;
      const cardWidth = (pageWidth - margin * 2) / cols; // ~ 185pt
      const cardHeight = (pageHeight - margin * 2) / rows; // ~ 200pt
      const qrSize = 90;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const pageIdx = Math.floor(i / 12);
        const cardIdx = i % 12;

        // Add a new page if we exceed 12 cards on the current page
        if (i > 0 && cardIdx === 0) {
          setPdfStatus(`새 페이지 생성 중... (${pageIdx + 1}페이지)`);
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        }

        const col = cardIdx % cols;
        const row = Math.floor(cardIdx / cols);

        // Compute positioning (Origin 0,0 is at bottom-left in pdf-lib)
        const x = margin + col * cardWidth;
        const y = pageHeight - margin - (row + 1) * cardHeight;

        // Generate QR code data URL locally
        const qrDataUrl = await QRCode.toDataURL(student.qr_code, {
          margin: 1,
          width: 200,
        });
        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
        const qrImage = await pdfDoc.embedPng(qrBytes);

        setPdfStatus(`학생 QR 카드 그리는 중 (${i + 1}/${students.length})...`);

        // Draw Card Outer boundary
        currentPage.drawRectangle({
          x: x + 5,
          y: y + 5,
          width: cardWidth - 10,
          height: cardHeight - 10,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
          color: rgb(0.98, 0.98, 0.98),
        });

        // Draw cut guidance lines
        currentPage.drawRectangle({
          x: x,
          y: y,
          width: cardWidth,
          height: cardHeight,
          borderColor: rgb(0.9, 0.9, 0.9),
          borderWidth: 0.5,
        });

        // Draw QR Image
        currentPage.drawImage(qrImage, {
          x: x + cardWidth / 2 - qrSize / 2,
          y: y + 25,
          width: qrSize,
          height: qrSize,
        });

        // Draw Event Name
        const activeEventName = initialEvents.find((e) => e.id === selectedEventId)?.name || "행사";
        const trimmedEventName = activeEventName.length > 18 ? activeEventName.substring(0, 18) + "..." : activeEventName;
        currentPage.drawText(trimmedEventName, {
          x: x + 15,
          y: y + cardHeight - 25,
          size: 7,
          font: customFont,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Draw Student Name
        currentPage.drawText(student.name, {
          x: x + 15,
          y: y + cardHeight - 45,
          size: 13,
          font: customFont,
          color: rgb(0.1, 0.1, 0.1),
        });

        // Draw Student Number
        currentPage.drawText(student.student_number, {
          x: x + 15,
          y: y + cardHeight - 60,
          size: 8,
          font: customFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        // Draw compact signature/help text
        currentPage.drawText("EduFair 참여 QR", {
          x: x + cardWidth - 75,
          y: y + 12,
          size: 6.5,
          font: customFont,
          color: rgb(0.6, 0.6, 0.6),
        });
      }

      setPdfStatus("PDF 인코딩 및 빌드 마무리 중...");
      const pdfBytes = await pdfDoc.save();

      // Download file to browser
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
      const cleanEventName = activeEvent ? activeEvent.name.replace(/\s+/g, "_") : "event";
      link.download = `students_qr_${cleanEventName}.pdf`;
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF]">학생 관리</h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              행사 참여 대상 학생 명단을 구성하고 배포용 QR 코드를 출력합니다.
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="border-slate-200 dark:border-[#2C2C2E] dark:text-white dark:hover:bg-[#1E1E1E] font-semibold gap-2"
            >
              <Download className="h-4 w-4 text-indigo-500 dark:text-[#00E5FF]" />
              <span>엑셀 서식 다운로드</span>
            </Button>

            <Button
              onClick={handleDownloadStudentsExcel}
              disabled={!selectedEventId || students.length === 0}
              variant="outline"
              className="border-slate-200 dark:border-[#2C2C2E] dark:text-white dark:hover:bg-[#1E1E1E] font-semibold gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>엑셀 학생 다운로드</span>
            </Button>

            <Button
              onClick={() => setIsUploadOpen(true)}
              disabled={!selectedEventId || isPending}
              variant="outline"
              className="border-slate-200 dark:border-[#2C2C2E] dark:text-white dark:hover:bg-[#1E1E1E] font-semibold gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-500 dark:text-[#00E5FF]" />
              <span>엑셀 학생 업로드</span>
            </Button>
            
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              disabled={!selectedEventId || isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>학생 수동 등록</span>
            </Button>
          </div>
        </div>

        {/* Filter & PDF print bar */}
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

            {selectedEventId && students.length > 0 && (
              <Button
                onClick={handleExportPdf}
                disabled={pdfBuilding}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white dark:bg-[#32D74B] dark:hover:bg-[#28B83B] dark:text-black font-bold gap-2"
              >
                {pdfBuilding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>전체 학생 QR PDF 출력</span>
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

        {/* Students Table */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardContent className="p-0">
            {!selectedEventId ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Users className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">행사를 먼저 선택해주세요.</p>
              </div>
            ) : isFetchPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Loader2 className="h-10 w-10 animate-spin text-[#00E5FF] mb-3" />
                <p className="text-sm">학생 목록을 불러오는 중...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Users className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">이 행사에 등록된 학생이 없습니다. 학생 목록을 엑셀로 업로드해 보세요.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="border-slate-200 dark:border-[#2C2C2E]">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2C2C2E]">
                    <TableHead className="w-[40%]">학반정보 (학번)</TableHead>
                    <TableHead className="w-[30%]">이름</TableHead>
                    <TableHead className="w-[20%]">QR 식별값</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="border-slate-100 hover:bg-slate-50/50 dark:border-[#2C2C2E] dark:hover:bg-[#252525]"
                    >
                      <TableCell className="font-mono font-semibold text-slate-800 dark:text-white">
                        {student.student_number}
                      </TableCell>
                      <TableCell className="text-slate-800 dark:text-white font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 dark:text-[#98989D] text-xs">
                        {student.qr_code.substring(0, 15)}...
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-[#98989D]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                            <DropdownMenuItem onClick={() => openEdit(student)} className="gap-2 cursor-pointer dark:text-white dark:hover:bg-[#252525]">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>학생 수정</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(student.id)}
                              className="gap-2 cursor-pointer text-rose-600 dark:text-[#FF453A] dark:hover:bg-[#3A1C1C]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>삭제</span>
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
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>학생 수동 등록</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                학생 학반 정보와 이름 데이터를 수동으로 기록합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="c-grade" className="text-xs text-[#98989D]">학년</Label>
                  <Input
                    id="c-grade"
                    type="number"
                    min="1"
                    max="6"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-class" className="text-xs text-[#98989D]">반</Label>
                  <Input
                    id="c-class"
                    type="number"
                    min="1"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-number" className="text-xs text-[#98989D]">번호</Label>
                  <Input
                    id="c-number"
                    type="number"
                    min="1"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-name" className="text-slate-600 dark:text-[#98989D]">학생 이름</Label>
                <Input
                  id="c-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 김철수"
                  required
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    "등록"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Edit Dialog */}
        <Dialog open={editingStudent !== null} onOpenChange={(open) => !open && setEditingStudent(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>학생 정보 수정</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                학급 정보 또는 학생 이름을 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="e-grade" className="text-xs text-[#98989D]">학년</Label>
                  <Input
                    id="e-grade"
                    type="number"
                    min="1"
                    max="6"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-class" className="text-xs text-[#98989D]">반</Label>
                  <Input
                    id="e-class"
                    type="number"
                    min="1"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-number" className="text-xs text-[#98989D]">번호</Label>
                  <Input
                    id="e-number"
                    type="number"
                    min="1"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="e-name" className="text-slate-600 dark:text-[#98989D]">학생 이름</Label>
                <Input
                  id="e-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingStudent(null)}
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
                    "저장"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. Excel Upload Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={(open) => !open && setIsUploadOpen(false)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>학생 Excel 일괄 등록</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                [학년, 반, 번호, 이름] 열이 구성된 Excel 파일을 드롭하여 일괄 등록합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A] break-all">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-[#2C2C2E] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-600 dark:hover:border-[#00E5FF] bg-slate-50/50 dark:bg-[#121212]/50 transition duration-150"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                
                <FileSpreadsheet className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white break-all">{uploadFile.name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">엑셀 파일을 선택하거나 끌어다 놓으세요.</p>
                    <p className="text-xs text-slate-400 mt-1">학년, 반, 번호, 이름 형식의 시트여야 합니다.</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadTemplate();
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-[#00E5FF] underline font-semibold hover:opacity-80"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>양식 엑셀 서식 다운로드</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Parsed Students Count confirmation */}
              {parsedCount !== null && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-3 text-center text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                  총 {parsedCount}명의 학생 데이터를 확인했습니다. 등록하려면 업로드를 진행해 주세요.
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadFile(null);
                  setParsedCount(null);
                  setParsedData([]);
                }}
                disabled={isPending}
                className="text-slate-500 dark:text-[#98989D]"
              >
                취소
              </Button>
              <Button
                onClick={handleImportSubmit}
                disabled={isPending || parsedCount === null}
                className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>학생 대장 등록</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
