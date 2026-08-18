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
  QrCode,
  Printer,
  ExternalLink,
  Copy,
  Check,
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

const getStudentStampbookUrl = (qrCode: string) => {
  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://edufair.vercel.app";
  return `${origin}/stampbook?code=${qrCode}`;
};

function StudentQrThumbnail({ code, onClick }: { code: string; onClick: () => void }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(getStudentStampbookUrl(code), { width: 64, margin: 0 })
      .then((url) => setDataUrl(url))
      .catch(() => {});
  }, [code]);

  return (
    <div
      onClick={onClick}
      className="inline-flex items-center gap-2.5 cursor-pointer group"
      title="클릭하여 QR 확대 및 인쇄"
    >
      <div className="w-10 h-10 bg-white p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-cyan-400 dark:group-hover:border-[#00E5FF] transition-all flex items-center justify-center shadow-xs flex-shrink-0">
        {dataUrl ? (
          <img src={dataUrl} alt="Student QR" className="w-9 h-9" />
        ) : (
          <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
        )}
      </div>
      <Button
        variant="ghost"
        size="xs"
        className="text-[#00E5FF] group-hover:bg-cyan-950/30 group-hover:text-[#00D0EB] border border-[#00E5FF]/20 px-2 rounded-full text-xs font-medium gap-1 h-7 pointer-events-none"
      >
        <QrCode className="h-3 w-3" />
        <span>QR 확대</span>
      </Button>
    </div>
  );
}

export function StudentClientPage({ initialEvents }: StudentClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [students, setStudents] = useState<Student[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFetchPending, startFetchTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingQrStudent, setViewingQrStudent] = useState<Student | null>(null);
  const [studentQrDataUrl, setStudentQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  
  // PDF Building State
  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");

  // Edit Form States (Single student edit)
  const [formGrade, setFormGrade] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");

  // Manual Batch Registration Form States
  const [manualGrade, setManualGrade] = useState("1");
  const [manualClass, setManualClass] = useState("1");
  const [manualCount, setManualCount] = useState(5);
  const [manualRows, setManualRows] = useState<{ number: number; name: string }[]>([
    { number: 1, name: "" },
    { number: 2, name: "" },
    { number: 3, name: "" },
    { number: 4, name: "" },
    { number: 5, name: "" },
  ]);

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

  // Generate QR Code for viewingQrStudent (encodes full Stampbook URL)
  useEffect(() => {
    if (viewingQrStudent) {
      QRCode.toDataURL(getStudentStampbookUrl(viewingQrStudent.qr_code), {
        margin: 2,
        width: 320,
      })
        .then((url) => setStudentQrDataUrl(url))
        .catch(() => setStudentQrDataUrl(""));
    } else {
      setStudentQrDataUrl("");
      setCopiedLink(false);
    }
  }, [viewingQrStudent]);

  // Helper: Extract class label (e.g. "1학년 2반") from student_number
  const getClassLabel = (studentNumber: string) => {
    if (!studentNumber) return "기타";
    const koreanMatch = studentNumber.match(/(\d+)\s*학년\s*(\d+)\s*반/);
    if (koreanMatch) {
      return `${koreanMatch[1]}학년 ${koreanMatch[2]}반`;
    }
    const dashMatch = studentNumber.match(/^(\d+)[-_](\d+)[-_](\d+)$/);
    if (dashMatch) {
      return `${parseInt(dashMatch[1])}학년 ${parseInt(dashMatch[2])}반`;
    }
    if (/^\d{5}$/.test(studentNumber)) {
      const g = parseInt(studentNumber[0]);
      const c = parseInt(studentNumber.substring(1, 3));
      return `${g}학년 ${c}반`;
    }
    if (/^\d{4}$/.test(studentNumber)) {
      const g = parseInt(studentNumber[0]);
      const c = parseInt(studentNumber[1]);
      return `${g}학년 ${c}반`;
    }
    return "기타 학급";
  };

  // Collect sorted unique class list
  const classList = Array.from(new Set(students.map((s) => getClassLabel(s.student_number))))
    .filter(Boolean)
    .sort((a, b) => {
      const matchA = a.match(/(\d+)학년\s*(\d+)반/);
      const matchB = b.match(/(\d+)학년\s*(\d+)반/);
      if (matchA && matchB) {
        const gradeDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
        if (gradeDiff !== 0) return gradeDiff;
        return parseInt(matchA[2]) - parseInt(matchB[2]);
      }
      return a.localeCompare(b);
    });

  // Filtered student list by class
  const filteredStudents = selectedClass === "ALL"
    ? students
    : students.filter((s) => getClassLabel(s.student_number) === selectedClass);

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
    setSelectedClass("ALL");
    loadStudents(eventId);
  };

  // Reset Edit Form
  const resetEditForm = () => {
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

  // Format Helper
  const getFormattedNumber = (g: string, c: string, n: string) => {
    return `${g}학년 ${c}반 ${n}번`;
  };

  // Manual Batch Registration Row Helpers
  const handleManualCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(60, count || 1));
    setManualCount(safeCount);
    setManualRows((prev) => {
      const newRows: { number: number; name: string }[] = [];
      for (let i = 1; i <= safeCount; i++) {
        const existing = prev.find((r) => r.number === i);
        newRows.push({
          number: i,
          name: existing ? existing.name : "",
        });
      }
      return newRows;
    });
  };

  const updateManualRowName = (index: number, name: string) => {
    setManualRows((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], name };
      }
      return updated;
    });
  };

  const updateManualRowNumber = (index: number, num: number) => {
    setManualRows((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], number: num };
      }
      return updated;
    });
  };

  const handleAppendManualRow = () => {
    setManualRows((prev) => {
      const nextNum = prev.length > 0 ? Math.max(...prev.map((r) => r.number)) + 1 : 1;
      const updated = [...prev, { number: nextNum, name: "" }];
      setManualCount(updated.length);
      return updated;
    });
  };

  const handleDeleteManualRow = (index: number) => {
    setManualRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setManualCount(updated.length);
      return updated;
    });
  };

  // Handle Manual Batch Submit
  const handleManualBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    if (!manualGrade || !manualClass) {
      setErrorMessage("학년과 반을 올바르게 입력해주세요.");
      return;
    }

    const validRows = manualRows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      setErrorMessage("최소 1명 이상의 학생 이름을 입력해주세요.");
      return;
    }

    const studentsToInsert: StudentInput[] = validRows.map((r) => ({
      student_number: getFormattedNumber(manualGrade.trim(), manualClass.trim(), String(r.number).trim()),
      name: r.name.trim(),
    }));

    startTransition(async () => {
      const res = await importStudentsAction(selectedEventId, studentsToInsert);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCreateOpen(false);
        setErrorMessage(null);
        // Reset manual rows to initial 5
        setManualRows([
          { number: 1, name: "" },
          { number: 2, name: "" },
          { number: 3, name: "" },
          { number: 4, name: "" },
          { number: 5, name: "" },
        ]);
        setManualCount(5);
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
        resetEditForm();
        loadStudents(selectedEventId);
      }
    });
  };

  // Handle Single Student QR Print
  const handlePrintStudentQr = () => {
    if (!studentQrDataUrl || !viewingQrStudent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${viewingQrStudent.student_number} ${viewingQrStudent.name} QR</title>
            <style>
              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { border: 2px solid #000; padding: 20px; text-align: center; border-radius: 12px; }
              img { width: 220px; height: 220px; }
              h2 { margin: 10px 0 5px; font-size: 20px; }
              p { margin: 0; font-size: 14px; color: #555; }
            </style>
          </head>
          <body onload="window.print();window.close();">
            <div class="card">
              <img src="${studentQrDataUrl}" />
              <h2>${viewingQrStudent.name}</h2>
              <p>${viewingQrStudent.student_number}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Handle Single Student QR Download PNG
  const handleDownloadStudentPng = () => {
    if (!studentQrDataUrl || !viewingQrStudent) return;
    const a = document.createElement("a");
    a.href = studentQrDataUrl;
    a.download = `QR_${viewingQrStudent.student_number}_${viewingQrStudent.name}.png`;
    a.click();
  };

  // Handle Copy Stampbook Link
  const handleCopyStampbookLink = () => {
    if (!viewingQrStudent || typeof window === "undefined") return;
    const stampbookUrl = `${window.location.origin}/stampbook?code=${viewingQrStudent.qr_code}`;
    navigator.clipboard.writeText(stampbookUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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

        // Generate QR code data URL locally (encodes full Stampbook URL)
        const qrDataUrl = await QRCode.toDataURL(getStudentStampbookUrl(student.qr_code), {
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
                setErrorMessage(null);
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Event Select */}
              <div className="w-full sm:w-60 space-y-1">
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

              {/* Class Select Filter */}
              <div className="w-full sm:w-48 space-y-1">
                <Label className="text-slate-500 dark:text-[#98989D] text-xs">학급 선택</Label>
                <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "ALL")}>
                  <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white">
                    <SelectValue placeholder="전체 학급" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                    <SelectItem value="ALL">전체 학급 ({students.length}명)</SelectItem>
                    {classList.map((cls) => {
                      const count = students.filter((s) => getClassLabel(s.student_number) === cls).length;
                      return (
                        <SelectItem key={cls} value={cls}>
                          {cls} ({count}명)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedEventId && filteredStudents.length > 0 && (
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
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Users className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">
                  {selectedClass !== "ALL"
                    ? `${selectedClass}에 등록된 학생이 없습니다.`
                    : "이 행사에 등록된 학생이 없습니다. 학생 목록을 엑셀로 업로드해 보세요."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="border-slate-200 dark:border-[#2C2C2E]">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2C2C2E]">
                    <TableHead className="w-[35%]">학반정보 (학번)</TableHead>
                    <TableHead className="w-[30%]">이름</TableHead>
                    <TableHead className="w-[25%]">학생 QR</TableHead>
                    <TableHead className="w-[10%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
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
                      <TableCell>
                        <StudentQrThumbnail
                          code={student.qr_code}
                          onClick={() => setViewingQrStudent(student)}
                        />
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

        {/* 1. Create Dialog: Manual Batch Registration */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">학생 수동 등록 (학급별 일괄)</DialogTitle>
              <DialogDescription className="dark:text-[#98989D] text-xs">
                학년과 반, 인원수를 입력하면 번호별 이름 입력창이 자동으로 구성됩니다.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleManualBatchSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Grade, Class, Count controls */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-[#121212] p-3 rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
                <div className="space-y-1">
                  <Label htmlFor="m-grade" className="text-xs font-semibold text-slate-600 dark:text-[#98989D]">학년</Label>
                  <Input
                    id="m-grade"
                    type="number"
                    min="1"
                    max="6"
                    value={manualGrade}
                    onChange={(e) => setManualGrade(e.target.value)}
                    required
                    disabled={isPending}
                    placeholder="예: 1"
                    className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-class" className="text-xs font-semibold text-slate-600 dark:text-[#98989D]">반</Label>
                  <Input
                    id="m-class"
                    type="number"
                    min="1"
                    max="30"
                    value={manualClass}
                    onChange={(e) => setManualClass(e.target.value)}
                    required
                    disabled={isPending}
                    placeholder="예: 2"
                    className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-count" className="text-xs font-semibold text-slate-600 dark:text-[#98989D]">인원수</Label>
                  <Input
                    id="m-count"
                    type="number"
                    min="1"
                    max="60"
                    value={manualCount}
                    onChange={(e) => handleManualCountChange(parseInt(e.target.value) || 1)}
                    required
                    disabled={isPending}
                    placeholder="예: 5"
                    className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E]"
                  />
                </div>
              </div>

              {/* Dynamic Students Number & Name List */}
              <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1 border border-slate-100 dark:border-[#2C2C2E] p-2 rounded-xl">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-[#98989D] px-2">
                  <span>번호</span>
                  <span className="flex-1 px-4">학생 이름</span>
                  <span className="w-8"></span>
                </div>

                {manualRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-16 flex-shrink-0">
                      <Input
                        type="number"
                        min="1"
                        value={row.number}
                        onChange={(e) => updateManualRowNumber(idx, parseInt(e.target.value) || idx + 1)}
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-center text-xs font-mono h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateManualRowName(idx, e.target.value)}
                        placeholder={`이름 (예: ${manualGrade}학년 ${manualClass}반 ${row.number}번)`}
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-xs h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteManualRow(idx)}
                      disabled={isPending || manualRows.length <= 1}
                      className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex-shrink-0"
                      title="행 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAppendManualRow}
                  disabled={isPending}
                  className="border-dashed border-slate-300 dark:border-[#2C2C2E] text-xs text-slate-600 dark:text-slate-300 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>+ 1명 추가</span>
                </Button>
                <span className="text-xs text-slate-500 dark:text-[#98989D] font-medium">
                  입력된 학생: <strong className="text-indigo-600 dark:text-[#00E5FF]">{manualRows.filter((r) => r.name.trim().length > 0).length}</strong> / {manualRows.length}명
                </span>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-[#2C2C2E]">
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00D0EB] dark:text-black font-semibold gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>등록 중...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{manualRows.filter((r) => r.name.trim().length > 0).length}명 일괄 등록</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 1-1. Single Student QR View Modal */}
        <Dialog open={viewingQrStudent !== null} onOpenChange={(open) => !open && setViewingQrStudent(null)}>
          <DialogContent className="border-[#2C2C2E] bg-[#1E1E1E] text-white max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-[#00E5FF] text-xl font-bold tracking-tight">학생 QR 코드</DialogTitle>
              <DialogDescription className="text-[#98989D]">
                학생용 참여 식별 태그 및 디지털 스탬프북 접속 QR입니다.
              </DialogDescription>
            </DialogHeader>

            {viewingQrStudent && (
              <div className="flex flex-col items-center justify-center p-4 space-y-4">
                <div className="space-y-0.5 text-center">
                  <h3 className="text-lg font-bold text-white tracking-wide">{viewingQrStudent.name}</h3>
                  <p className="text-xs text-[#00E5FF] font-mono">{viewingQrStudent.student_number}</p>
                </div>
                
                {/* QR Display area */}
                <div className="bg-white p-3 rounded-2xl border-4 border-[#00E5FF] shadow-lg shadow-cyan-950/30">
                  {studentQrDataUrl ? (
                    <img src={studentQrDataUrl} alt={`${viewingQrStudent.name} QR`} className="w-52 h-52" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-[#121212]">
                      <Loader2 className="h-8 w-8 animate-spin text-[#00E5FF]" />
                    </div>
                  )}
                </div>

                {/* Direct Stampbook Link */}
                <div className="w-full flex items-center gap-1 text-[10px] text-[#98989D] justify-between bg-[#121212] py-2 px-3 rounded-lg border border-[#2C2C2E]">
                  <span className="font-mono truncate max-w-[200px]">
                    /stampbook?code={viewingQrStudent.qr_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStampbookLink}
                    className="text-[#00E5FF] hover:underline font-semibold flex items-center gap-1 flex-shrink-0"
                  >
                    {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedLink ? "복사됨" : "링크 복사"}</span>
                  </button>
                </div>

                {/* Open Student Stampbook in new tab */}
                <a
                  href={`/stampbook?code=${viewingQrStudent.qr_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>이 학생의 스탬프북 열기 (미리보기)</span>
                </a>
              </div>
            )}

            <DialogFooter className="flex flex-row gap-2 justify-center pt-2 sm:justify-center">
              <Button
                variant="outline"
                onClick={handlePrintStudentQr}
                disabled={!studentQrDataUrl}
                className="flex-1 bg-transparent border-[#2C2C2E] text-white hover:bg-[#2C2C2E] hover:text-white font-medium gap-1.5"
              >
                <Printer className="h-4 w-4 text-[#32D74B]" />
                <span>QR 인쇄</span>
              </Button>
              <Button
                onClick={handleDownloadStudentPng}
                disabled={!studentQrDataUrl}
                className="flex-1 bg-[#00E5FF] text-black hover:bg-[#00D0EB] font-bold gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span>PNG 저장</span>
              </Button>
            </DialogFooter>
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
