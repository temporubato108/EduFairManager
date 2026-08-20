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
  UserPlus,
  Sparkles,
  Wand2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStudentsAction,
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
  importStudentsAction,
  Student,
  StudentInput,
} from "./actions";
import { getSettingsAction } from "@/app/settings/actions";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface StudentClientPageProps {
  initialEvents: EventOption[];
  initialSchoolLogo?: string;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const getStudentStampbookUrl = (qrCode: string) => {
  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://edufair.vercel.app";
  return `${origin}/stampbook?code=${qrCode}`;
};

/**
 * Generates a high-quality standard QR code data URL (100% recognition rate).
 */
async function generateQrDataUrl(
  text: string,
  size: number = 600
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.warn("QR generation fallback:", err);
    return "";
  }
}

function StudentQrThumbnail({
  code,
  onClick,
}: {
  code: string;
  onClick: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    generateQrDataUrl(getStudentStampbookUrl(code), 120)
      .then((url) => setDataUrl(url))
      .catch(() => {});
  }, [code]);

  return (
    <div
      onClick={onClick}
      className="inline-flex items-center gap-2.5 cursor-pointer group"
      title="클릭하여 QR 확대 및 인쇄"
    >
      <div className="w-10 h-10 bg-white p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-all flex items-center justify-center shadow-xs flex-shrink-0">
        {dataUrl ? (
          <img src={dataUrl} alt="Student QR" className="w-9 h-9 object-contain" />
        ) : (
          <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
        )}
      </div>
      <Button
        variant="ghost"
        size="xs"
        className="text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 px-2 rounded-full text-xs font-medium gap-1 h-7 pointer-events-none"
      >
        <QrCode className="h-3 w-3" />
        <span>QR 확대</span>
      </Button>
    </div>
  );
}

export function StudentClientPage({ initialEvents, initialSchoolLogo }: StudentClientPageProps) {
  const [schoolLogo, setSchoolLogo] = useState<string>(initialSchoolLogo || "");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [students, setStudents] = useState<Student[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isFetchPending, startFetchTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const PAGE_SIZE = 30;

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
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
  const [formRawNumber, setFormRawNumber] = useState("");
  const [isRawNumberMode, setIsRawNumberMode] = useState(false);

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

  // Guest Registration Form States
  const [guestTab, setGuestTab] = useState<"batch" | "single">("batch");
  const [guestSingleAffiliation, setGuestSingleAffiliation] = useState("외부");
  const [guestSingleNumber, setGuestSingleNumber] = useState("1");
  const [guestSingleName, setGuestSingleName] = useState("");

  const [guestBatchAffiliation, setGuestBatchAffiliation] = useState("외부");
  const [guestBatchStartNum, setGuestBatchStartNum] = useState(1);
  const [guestBatchCount, setGuestBatchCount] = useState(10);
  const [guestBatchNameMode, setGuestBatchNameMode] = useState<"auto" | "custom">("auto");
  const [guestBatchPrefix, setGuestBatchPrefix] = useState("외부참가자");
  const [guestBatchCustomNames, setGuestBatchCustomNames] = useState("");

  // Excel Upload File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<StudentInput[]>([]);

  // Reset pagination on class or event change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedEventId]);

  // Load selected event's default preference on start & load settings if missing
  useEffect(() => {
    if (initialEvents.length > 0) {
      const firstEventId = initialEvents[0].id;
      setSelectedEventId(firstEventId);
      loadStudents(firstEventId);
    }
  }, [initialEvents]);

  useEffect(() => {
    if (!schoolLogo) {
      getSettingsAction().then((s) => {
        if (s.school_logo) setSchoolLogo(s.school_logo);
      }).catch(() => {});
    }
  }, [schoolLogo]);

  // Generate QR Code for viewingQrStudent (encodes full Stampbook URL in HD)
  useEffect(() => {
    if (viewingQrStudent) {
      generateQrDataUrl(getStudentStampbookUrl(viewingQrStudent.qr_code), 800)
        .then((url) => setStudentQrDataUrl(url))
        .catch(() => setStudentQrDataUrl(""));
    } else {
      setStudentQrDataUrl("");
      setCopiedLink(false);
    }
  }, [viewingQrStudent]);

  // Helper: Extract class label (e.g. "1학년 2반", "[외부] 용산초", "[외부] 유치원 다솜반") from student_number
  const getClassLabel = (studentNumber: string) => {
    if (!studentNumber) return "기타";
    if (studentNumber.startsWith("[외부]")) {
      const after = studentNumber.replace(/^\[외부\]\s*/, "").trim();
      const matchText = after.match(/^([^0-9]+)/);
      const org = matchText && matchText[1] ? matchText[1].trim() : "";
      return org ? `[외부] ${org}` : "[외부] 일반";
    }
    if (studentNumber.includes("외부") || studentNumber.includes("게스트")) {
      return "[외부] 일반";
    }
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

  // Helper: Parse student number for natural ordering
  const parseStudentNumber = (numStr: string) => {
    if (!numStr) return { isExternal: false, affiliation: "", grade: 999, classNum: 999, number: 999 };

    if (numStr.startsWith("[외부]") || numStr.includes("외부") || numStr.includes("게스트")) {
      let affiliation = "일반";
      if (numStr.startsWith("[외부]")) {
        const after = numStr.replace(/^\[외부\]\s*/, "").trim();
        const matchText = after.match(/^([^0-9]+)/);
        if (matchText && matchText[1].trim()) {
          affiliation = matchText[1].trim();
        }
      } else {
        const matchBracket = numStr.match(/\[([^\]]+)\]/);
        if (matchBracket && matchBracket[1].trim()) {
          affiliation = matchBracket[1].trim();
        }
      }

      const matchNum = numStr.match(/(\d+)\s*번?/);
      const num = matchNum ? parseInt(matchNum[1], 10) : 0;
      return { isExternal: true, affiliation, grade: 999, classNum: 999, number: num };
    }

    const matchKorean = numStr.match(/(\d+)\s*학년\s*(\d+)\s*반(?:\s*(\d+)\s*번)?/);
    if (matchKorean) {
      return {
        isExternal: false,
        affiliation: "",
        grade: parseInt(matchKorean[1], 10),
        classNum: parseInt(matchKorean[2], 10),
        number: matchKorean[3] ? parseInt(matchKorean[3], 10) : 0,
      };
    }

    const matchDash = numStr.match(/^(\d+)[-_](\d+)[-_](\d+)$/);
    if (matchDash) {
      return {
        isExternal: false,
        affiliation: "",
        grade: parseInt(matchDash[1], 10),
        classNum: parseInt(matchDash[2], 10),
        number: parseInt(matchDash[3], 10),
      };
    }

    if (/^\d{5}$/.test(numStr)) {
      return {
        isExternal: false,
        affiliation: "",
        grade: parseInt(numStr[0], 10),
        classNum: parseInt(numStr.substring(1, 3), 10),
        number: parseInt(numStr.substring(3, 5), 10),
      };
    }

    if (/^\d{4}$/.test(numStr)) {
      return {
        isExternal: false,
        affiliation: "",
        grade: parseInt(numStr[0], 10),
        classNum: parseInt(numStr.substring(1, 2), 10),
        number: parseInt(numStr.substring(2, 4), 10),
      };
    }

    const nums = numStr.match(/\d+/g);
    if (nums && nums.length >= 3) {
      return {
        isExternal: false,
        affiliation: "",
        grade: parseInt(nums[0], 10),
        classNum: parseInt(nums[1], 10),
        number: parseInt(nums[2], 10),
      };
    }

    return { isExternal: false, affiliation: "", grade: 999, classNum: 999, number: 999 };
  };

  const sortStudents = (list: Student[]) => {
    return [...list].sort((a, b) => {
      const pA = parseStudentNumber(a.student_number);
      const pB = parseStudentNumber(b.student_number);

      // 1. Regular students come before external participants
      if (pA.isExternal !== pB.isExternal) {
        return pA.isExternal ? 1 : -1;
      }

      // 2. Both external: group by Affiliation first, then Number
      if (pA.isExternal && pB.isExternal) {
        const affDiff = pA.affiliation.localeCompare(pB.affiliation, "ko");
        if (affDiff !== 0) return affDiff;
        if (pA.number !== pB.number) return pA.number - pB.number;
        return a.name.localeCompare(b.name, "ko");
      }

      // 3. Both regular: Grade -> Class -> Number
      if (pA.grade !== pB.grade) return pA.grade - pB.grade;
      if (pA.classNum !== pB.classNum) return pA.classNum - pB.classNum;
      if (pA.number !== pB.number) return pA.number - pB.number;
      return a.name.localeCompare(b.name, "ko");
    });
  };

  // Collect sorted unique class list
  const classList = Array.from(new Set(students.map((s) => getClassLabel(s.student_number))))
    .filter(Boolean)
    .sort((a, b) => {
      const isExtA = a.startsWith("[외부]");
      const isExtB = b.startsWith("[외부]");
      if (isExtA && !isExtB) return 1;
      if (!isExtA && isExtB) return -1;
      if (isExtA && isExtB) return a.localeCompare(b, "ko");

      const matchA = a.match(/(\d+)학년\s*(\d+)반/);
      const matchB = b.match(/(\d+)학년\s*(\d+)반/);
      if (matchA && matchB) {
        const gradeDiff = parseInt(matchA[1]) - parseInt(matchB[1]);
        if (gradeDiff !== 0) return gradeDiff;
        return parseInt(matchA[2]) - parseInt(matchB[2]);
      }
      return a.localeCompare(b, "ko");
    });

  // Filtered and sorted student list
  const filteredStudents = sortStudents(
    selectedClass === "ALL"
      ? students
      : students.filter((s) => getClassLabel(s.student_number) === selectedClass)
  );

  // Load Students
  const loadStudents = (eventId: string) => {
    startFetchTransition(async () => {
      try {
        const data = await getStudentsAction(eventId);
        setStudents(sortStudents(data));
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
    setFormRawNumber("");
    setIsRawNumberMode(false);
    setErrorMessage(null);
  };

  // Open Edit Form
  const openEdit = (student: Student) => {
    setEditingStudent(student);
    
    // Parse grade-class-number from db representation (e.g. "6학년 1반 23번")
    const match = student.student_number.match(/(\d+)학년\s*(\d+)반\s*(\d+)번/);
    if (match) {
      setIsRawNumberMode(false);
      setFormGrade(match[1]);
      setFormClass(match[2]);
      setFormNumber(match[3]);
      setFormRawNumber(student.student_number);
    } else {
      // External or custom format (e.g. "[외부] 1번", "[외부] 경운유치원 1번")
      setIsRawNumberMode(true);
      setFormGrade("");
      setFormClass("");
      setFormNumber("");
      setFormRawNumber(student.student_number);
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

  // Handle Guest / External Student Registration Submit
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    let studentsToInsert: StudentInput[] = [];

    if (guestTab === "single") {
      const aff = guestSingleAffiliation.trim();
      const num = guestSingleNumber.trim() || "1";
      const name = guestSingleName.trim();

      if (!name) {
        setErrorMessage("참가자 이름을 입력해주세요.");
        return;
      }

      const formattedNum = aff && aff !== "외부" ? `[외부] ${aff} ${num}번` : `[외부] ${num}번`;
      studentsToInsert = [{
        student_number: formattedNum,
        name: name,
      }];
    } else {
      const aff = guestBatchAffiliation.trim();
      const start = Math.max(1, guestBatchStartNum || 1);
      const count = Math.max(1, Math.min(200, guestBatchCount || 1));

      if (guestBatchNameMode === "custom") {
        const names = guestBatchCustomNames
          .split("\n")
          .map((n) => n.trim())
          .filter(Boolean);

        if (names.length === 0) {
          setErrorMessage("최소 1명 이상의 이름을 입력해주세요.");
          return;
        }

        studentsToInsert = names.map((name, idx) => {
          const num = start + idx;
          const formattedNum = aff && aff !== "외부" ? `[외부] ${aff} ${num}번` : `[외부] ${num}번`;
          return {
            student_number: formattedNum,
            name: name,
          };
        });
      } else {
        const prefix = guestBatchPrefix.trim() || "외부참가자";
        for (let i = 0; i < count; i++) {
          const num = start + i;
          const formattedNum = aff && aff !== "외부" ? `[외부] ${aff} ${num}번` : `[외부] ${num}번`;
          studentsToInsert.push({
            student_number: formattedNum,
            name: `${prefix} ${num}`,
          });
        }
      }
    }

    if (studentsToInsert.length === 0) {
      setErrorMessage("등록할 외부 학생 데이터가 없습니다.");
      return;
    }

    startTransition(async () => {
      const res = await importStudentsAction(selectedEventId, studentsToInsert);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsGuestOpen(false);
        setErrorMessage(null);
        setGuestSingleName("");
        setGuestBatchCustomNames("");
        loadStudents(selectedEventId);
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !formName) return;

    let formattedNum = "";
    if (isRawNumberMode) {
      if (!formRawNumber.trim()) {
        setErrorMessage("학번 또는 식별 표기를 입력해주세요.");
        return;
      }
      formattedNum = formRawNumber.trim();
    } else {
      if (!formGrade || !formClass || !formNumber) {
        setErrorMessage("학년, 반, 번호를 모두 입력해주세요.");
        return;
      }
      formattedNum = getFormattedNumber(formGrade, formClass, formNumber);
    }

    startTransition(async () => {
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

  // Handle Single Student QR Print (Exact 92mm x 120mm template, matching whole PDF layout)
  const handlePrintStudentQr = () => {
    if (!studentQrDataUrl || !viewingQrStudent) return;

    const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
    const activeEventName = activeEvent?.name || "행사";

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
          <title>${viewingQrStudent.student_number} ${viewingQrStudent.name} QR 인쇄</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              background: white;
              color: black;
            }
            /* Exactly 92mm x 120mm card cut guide */
            .cut-guide {
              width: 92mm;
              height: 120mm;
              border: 1px dashed #94a3b8;
              padding: 3.5mm;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }
            .card-inner {
              width: 100%;
              height: 100%;
              border: 1.5px solid #cbd5e1;
              border-radius: 12px;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow: hidden;
              position: relative;
              box-sizing: border-box;
            }
            .header-banner {
              width: 100%;
              background: #f8fafc !important;
              background-color: #f8fafc !important;
              border-bottom: 1.5px solid #e2e8f0;
              padding: 5px 8px;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .school-logo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 14mm;
              padding-top: 2mm;
              margin-bottom: 1mm;
            }
            .school-logo-img {
              max-height: 12mm;
              max-width: 45mm;
              object-fit: contain;
            }
            .school-logo-spacer {
              height: 4mm;
            }
            .qr-container {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              border: 1.5px solid #e2e8f0;
              border-radius: 8px;
              padding: 3px;
              margin: 1mm 0 2mm 0;
            }
            .qr-container img {
              width: 54mm;
              height: 54mm;
              display: block;
            }
            .student-info {
              text-align: center;
              margin-top: 1mm;
              margin-bottom: 2mm;
            }
            .student-number {
              font-size: 12px;
              font-weight: 700;
              color: #4f46e5;
              margin-bottom: 1px;
            }
            .student-name {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
              line-height: 1.2;
            }
            .footer-guide {
              margin-top: auto;
              padding-bottom: 5px;
              text-align: center;
            }
            .footer-tip {
              font-size: 8.5px;
              font-weight: 700;
              color: #64748b;
              margin-bottom: 1px;
            }
            .footer-brand {
              font-size: 7.5px;
              color: #94a3b8;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                background: white !important;
                min-height: auto;
              }
              .cut-guide {
                border: 1px dashed #94a3b8 !important;
              }
              .header-banner {
                background: #f8fafc !important;
                background-color: #f8fafc !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="cut-guide">
            <div class="card-inner">
              <div class="header-banner">${activeEventName}</div>
              ${schoolLogo && schoolLogo.trim().length > 10 ? `
                <div class="school-logo-container">
                  <img src="${schoolLogo}" class="school-logo-img" alt="학교 로고" />
                </div>
              ` : `
                <div class="school-logo-spacer"></div>
              `}
              <div class="qr-container">
                <img src="${studentQrDataUrl}" />
              </div>
              <div class="student-info">
                <div class="student-number">${viewingQrStudent.student_number}</div>
                <div class="student-name">${viewingQrStudent.name}</div>
              </div>
              <div class="footer-guide">
                <p class="footer-tip">💡 부스 방문 시 위 QR코드를 보여주세요</p>
                <p class="footer-brand">EduFair 스마트 스탬프투어</p>
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
  const processFile = (file: File) => {
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
          const name = normalizedRow["이름"] || normalizedRow["성명"] || normalizedRow["Name"] || "";

          if (!name) {
            continue;
          }

          if (!grade || !cls || !num) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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

  // High-Definition Canvas-to-PDF Exporter using jsPDF (2x2 Grid, 4 Cards per A4 Page, Exactly 92mm x 120mm per Student)
  const handleExportPdf = async () => {
    const targetStudents = filteredStudents.length > 0 ? filteredStudents : students;
    if (targetStudents.length === 0 || !selectedEventId) return;

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

      // High-resolution 300 DPI A4 Canvas (2480 x 3508 px)
      // Exactly 92mm x 120mm card per student (2 columns x 2 rows = 4 cards per page)
      const canvasWidth = 2480;
      const canvasHeight = 3508;

      const pxPerMmX = canvasWidth / 210; // 11.8095 px/mm
      const pxPerMmY = canvasHeight / 297; // 11.8114 px/mm

      const cardWidth = 92 * pxPerMmX; // exactly 92mm (~1086.48px)
      const cardHeight = 120 * pxPerMmY; // exactly 120mm (~1417.37px)

      const cols = 2;
      const rows = 2;
      const marginX = (canvasWidth - cardWidth * cols) / 2; // ~153.5px (~13.0mm margin)
      const marginY = (canvasHeight - cardHeight * rows) / 2; // ~336.6px (~28.5mm margin)

      const itemsPerPage = cols * rows; // 4
      const totalPages = Math.ceil(targetStudents.length / itemsPerPage);

      const activeEvent = initialEvents.find((e) => e.id === selectedEventId);
      const activeEventName = activeEvent?.name || "행사";
      const cleanEventName = activeEvent ? activeEvent.name.replace(/\s+/g, "_") : "event";

      // Pre-load school logo image once if registered
      let schoolLogoImg: HTMLImageElement | null = null;
      if (schoolLogo && schoolLogo.trim().length > 10) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Logo load failed"));
            img.src = schoolLogo;
          });
          schoolLogoImg = img;
        } catch {
          schoolLogoImg = null;
        }
      }

      // Offscreen Canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("캔버스 렌더러를 초기화할 수 없습니다.");

      // Temporary offscreen canvas for QR rendering
      const qrCanvas = document.createElement("canvas");

      for (let p = 0; p < totalPages; p++) {
        setPdfStatus(`학생 명찰 페이지 렌더링 중 (${p + 1}/${totalPages} 페이지)...`);

        // Clear canvas with pure white
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const pageStudents = targetStudents.slice(p * itemsPerPage, (p + 1) * itemsPerPage);

        for (let i = 0; i < pageStudents.length; i++) {
          const student = pageStudents[i];
          const col = i % cols;
          const row = Math.floor(i / cols);

          const x = marginX + col * cardWidth;
          const y = marginY + row * cardHeight;

          // 1. Draw outer dotted cut-guide line (exactly 92mm x 120mm)
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.strokeRect(x, y, cardWidth, cardHeight);
          ctx.setLineDash([]); // Reset dash

          // Inner card area with 3.5mm padding
          const padding = 40;
          const innerX = x + padding;
          const innerY = y + padding;
          const innerW = cardWidth - padding * 2;
          const innerH = cardHeight - padding * 2;

          // 2. Draw card solid border & crisp white background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(innerX, innerY, innerW, innerH);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 3;
          ctx.strokeRect(innerX, innerY, innerW, innerH);

          // 3. Top Banner (Event Header)
          const headerHeight = 110;
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(innerX + 3, innerY + 3, innerW - 6, headerHeight);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(innerX, innerY + headerHeight);
          ctx.lineTo(innerX + innerW, innerY + headerHeight);
          ctx.stroke();

          ctx.fillStyle = "#475569";
          ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
          ctx.textAlign = "center";
          const trimmedEvent = activeEventName.length > 22 ? activeEventName.substring(0, 22) + "..." : activeEventName;
          ctx.fillText(trimmedEvent, innerX + innerW / 2, innerY + 68);

          // 4. School Logo Area (Above QR Code)
          let qrY = innerY + headerHeight + 35;
          if (schoolLogoImg) {
            const logoMaxW = 460;
            const logoMaxH = 120;
            const aspect = (schoolLogoImg.width || 1) / (schoolLogoImg.height || 1);
            let lw = logoMaxW;
            let lh = lw / aspect;
            if (lh > logoMaxH) {
              lh = logoMaxH;
              lw = lh * aspect;
            }
            const lx = innerX + (innerW - lw) / 2;
            const ly = innerY + headerHeight + 15 + (120 - lh) / 2;
            ctx.drawImage(schoolLogoImg, lx, ly, lw, lh);
            qrY = innerY + headerHeight + 155;
          }

          // 5. Generate and draw Pure HD QR Code (~55mm x 55mm = 650px)
          const qrDisplaySize = 650;
          const qrX = innerX + (innerW - qrDisplaySize) / 2;

          qrCanvas.width = qrDisplaySize;
          qrCanvas.height = qrDisplaySize;

          await QRCode.toCanvas(qrCanvas, getStudentStampbookUrl(student.qr_code), {
            width: qrDisplaySize,
            margin: 1,
            errorCorrectionLevel: "M",
          });

          // QR Code container box
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(qrX - 8, qrY - 8, qrDisplaySize + 16, qrDisplaySize + 16);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 3;
          ctx.strokeRect(qrX - 8, qrY - 8, qrDisplaySize + 16, qrDisplaySize + 16);

          ctx.drawImage(qrCanvas, qrX, qrY, qrDisplaySize, qrDisplaySize);

          // 6. Student Info (Below QR Code)
          const studentNumY = qrY + qrDisplaySize + 55;
          ctx.fillStyle = "#4f46e5";
          ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(student.student_number || ""), innerX + innerW / 2, studentNumY);

          const studentNameY = studentNumY + 68;
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 70px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(student.name || ""), innerX + innerW / 2, studentNameY);

          // 7. Footer Guide text
          ctx.fillStyle = "#64748b";
          ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("💡 부스 방문 시 위 QR코드를 보여주세요", innerX + innerW / 2, innerY + innerH - 65);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif";
          ctx.fillText("EduFair 스마트 스탬프투어", innerX + innerW / 2, innerY + innerH - 25);
        }

        // Add page to jsPDF
        if (p > 0) {
          doc.addPage();
        }
        const pageJpgDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(pageJpgDataUrl, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      setPdfStatus("PDF 파일 다운로드 중...");
      doc.save(`students_qr_92x120_${cleanEventName}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("PDF generation error:", err);
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
              <Download className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span>엑셀 서식 다운로드</span>
            </Button>

            <Button
              onClick={() => setIsUploadOpen(true)}
              disabled={!selectedEventId || isPending}
              variant="outline"
              className="border-slate-200 dark:border-[#2C2C2E] dark:text-white dark:hover:bg-[#1E1E1E] font-semibold gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span>엑셀 학생 업로드</span>
            </Button>

            <Button
              onClick={() => {
                setErrorMessage(null);
                setIsGuestOpen(true);
              }}
              disabled={!selectedEventId || isPending}
              variant="outline"
              className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold gap-2"
            >
              <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>외부 학생 등록</span>
            </Button>
            
            <Button
              onClick={() => {
                setErrorMessage(null);
                setIsCreateOpen(true);
              }}
              disabled={!selectedEventId || isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold gap-2"
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
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white font-bold gap-2"
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
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-semibold">{pdfStatus}</p>
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
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-3" />
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
            ) : (() => {
              const totalStudentPages = Math.ceil(filteredStudents.length / PAGE_SIZE) || 1;
              const paginatedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              return (
                <>
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
                      {paginatedStudents.map((student) => (
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

                  {/* Pagination Bar */}
                  {totalStudentPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-[#2C2C2E] bg-slate-50/50 dark:bg-[#181818]">
                      <div className="text-xs text-slate-500 dark:text-[#98989D]">
                        총 <strong className="text-slate-800 dark:text-white font-semibold">{filteredStudents.length}</strong>명 중{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}
                        </span>
                        명 표시 (페이지당 30명)
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-8 px-2 text-xs border-slate-200 dark:border-[#2C2C2E]"
                          title="첫 페이지"
                        >
                          <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-8 px-2.5 text-xs gap-1 border-slate-200 dark:border-[#2C2C2E]"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">이전</span>
                        </Button>

                        <div className="flex items-center gap-1 mx-1">
                          {getPageNumbers(currentPage, totalStudentPages).map((p, idx) =>
                            p === "..." ? (
                              <span key={`dots-${idx}`} className="px-1 text-xs text-slate-400">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={p}
                                variant={currentPage === p ? "default" : "outline"}
                                size="xs"
                                onClick={() => setCurrentPage(Number(p))}
                                className={`h-8 w-8 text-xs font-semibold ${
                                  currentPage === p
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500"
                                    : "border-slate-200 dark:border-[#2C2C2E] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252525]"
                                }`}
                              >
                                {p}
                              </Button>
                            )
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setCurrentPage((p) => Math.min(totalStudentPages, p + 1))}
                          disabled={currentPage === totalStudentPages}
                          className="h-8 px-2.5 text-xs gap-1 border-slate-200 dark:border-[#2C2C2E]"
                        >
                          <span className="hidden sm:inline">다음</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setCurrentPage(totalStudentPages)}
                          disabled={currentPage === totalStudentPages}
                          className="h-8 px-2 text-xs border-slate-200 dark:border-[#2C2C2E]"
                          title="마지막 페이지"
                        >
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
                  입력된 학생: <strong className="text-indigo-600 dark:text-indigo-400">{manualRows.filter((r) => r.name.trim().length > 0).length}</strong> / {manualRows.length}명
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold gap-1.5"
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
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-indigo-600 dark:text-indigo-400 text-xl font-bold tracking-tight">학생 QR 코드</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-[#98989D]">
                학생용 참여 식별 태그 및 디지털 스탬프북 접속 QR입니다.
              </DialogDescription>
            </DialogHeader>

            {viewingQrStudent && (
              <div className="flex flex-col items-center justify-center p-2 sm:p-3 space-y-3">
                {/* 92x120mm Card Preview Container */}
                <div className="w-full max-w-[260px] bg-white rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-md overflow-hidden flex flex-col text-slate-800 text-center">
                  <div className="bg-slate-100 border-b border-slate-200 py-1.5 px-3 text-[11px] font-bold text-slate-600 truncate">
                    {initialEvents.find((e) => e.id === selectedEventId)?.name || "EduFair 행사"}
                  </div>

                  {/* School Logo above QR */}
                  {schoolLogo && schoolLogo.trim().length > 10 ? (
                    <div className="pt-2 px-3 flex items-center justify-center">
                      <img src={schoolLogo} alt="학교 로고" className="max-h-7 max-w-[140px] object-contain" />
                    </div>
                  ) : (
                    <div className="pt-1" />
                  )}
                  
                  {/* QR Display area */}
                  <div className="px-3 py-1.5 flex items-center justify-center">
                    <div className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs inline-block">
                      {studentQrDataUrl ? (
                        <img src={studentQrDataUrl} alt={`${viewingQrStudent.name} QR`} className="w-36 h-36 object-contain" />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center bg-slate-50">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student Info below QR */}
                  <div className="pt-1 pb-2 space-y-0.5">
                    <p className="text-xs font-bold text-indigo-600 font-mono">{viewingQrStudent.student_number}</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{viewingQrStudent.name}</h3>
                  </div>

                  <div className="py-2 px-1 text-[9px] text-slate-500 space-y-0.5 mt-auto border-t border-slate-100">
                    <p className="font-bold text-slate-600">💡 부스 방문 시 위 QR코드를 보여주세요</p>
                    <p className="text-slate-400">EduFair 스마트 스탬프투어</p>
                  </div>
                </div>

                {/* Direct Stampbook Link */}
                <div className="w-full flex items-center gap-1 text-[10px] text-slate-500 dark:text-[#98989D] justify-between bg-slate-50 dark:bg-[#121212] py-2 px-3 rounded-lg border border-slate-200 dark:border-[#2C2C2E]">
                  <span className="font-mono truncate max-w-[200px]">
                    /stampbook?code={viewingQrStudent.qr_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStampbookLink}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 flex-shrink-0"
                  >
                    {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedLink ? "복사됨" : "링크 복사"}</span>
                  </button>
                </div>

                {/* Open Student Stampbook in new tab */}
                <a
                  href={`/stampbook?code=${viewingQrStudent.qr_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/20"
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
                className="flex-1 bg-slate-50 dark:bg-transparent border-slate-200 dark:border-[#2C2C2E] text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#2C2C2E] font-medium gap-1.5"
              >
                <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>QR 인쇄</span>
              </Button>
              <Button
                onClick={handleDownloadStudentPng}
                disabled={!studentQrDataUrl}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 font-bold gap-1.5"
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

              {isRawNumberMode ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="e-raw" className="text-xs text-[#98989D]">학번 / 식별 표기</Label>
                    <button
                      type="button"
                      onClick={() => setIsRawNumberMode(false)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      재학생 형식으로 전환
                    </button>
                  </div>
                  <Input
                    id="e-raw"
                    value={formRawNumber}
                    onChange={(e) => setFormRawNumber(e.target.value)}
                    placeholder="예: [외부] 1번, [외부] 경운유치원 1번"
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[#98989D]">학급 및 번호</Label>
                    <button
                      type="button"
                      onClick={() => setIsRawNumberMode(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      외부/직접 표기로 전환
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="e-grade" className="text-[10px] text-slate-400">학년</Label>
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
                      <Label htmlFor="e-class" className="text-[10px] text-slate-400">반</Label>
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
                      <Label htmlFor="e-number" className="text-[10px] text-slate-400">번호</Label>
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
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="e-name" className="text-slate-600 dark:text-[#98989D]">학생 / 참가자 이름</Label>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold"
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
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleFileDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                  uploadFile
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10"
                    : "border-slate-200 dark:border-[#2C2C2E] hover:border-indigo-500 bg-slate-50/50 dark:bg-[#121212]"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <FileSpreadsheet
                  className={cn(
                    "h-10 w-10",
                    uploadFile ? "text-emerald-500" : "text-slate-400"
                  )}
                />

                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{uploadFile.name}</p>
                    <p className="text-xs text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      엑셀 파일을 여기로 드래그하거나 클릭하여 선택
                    </p>
                    <p className="text-xs text-slate-400">지원 형식: .xlsx, .xls, .csv</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadTemplate();
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold hover:opacity-80"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold gap-2"
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

        {/* 4. Guest / External Student Registration Dialog */}
        <Dialog open={isGuestOpen} onOpenChange={setIsGuestOpen}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">외부 학생 / 게스트 등록</DialogTitle>
                  <DialogDescription className="dark:text-[#98989D] text-xs">
                    타교 학생, 유치원생, 체험단, 방문객 등 외부 참가자를 등록하고 QR 코드를 발급합니다.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setGuestTab("batch")}
                className={cn(
                  "py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  guestTab === "batch"
                    ? "bg-white dark:bg-[#2C2C2E] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>현장 게스트 일괄 발급</span>
              </button>
              <button
                type="button"
                onClick={() => setGuestTab("single")}
                className={cn(
                  "py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  guestTab === "single"
                    ? "bg-white dark:bg-[#2C2C2E] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>개별 직접 등록</span>
              </button>
            </div>

            <form onSubmit={handleGuestSubmit} className="space-y-4 flex-1 overflow-y-auto pt-1">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {guestTab === "batch" ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-[#98989D]">소속 / 구분</Label>
                      <Input
                        value={guestBatchAffiliation}
                        onChange={(e) => setGuestBatchAffiliation(e.target.value)}
                        placeholder="예: 외부, 경운유치원"
                        required
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-[#98989D]">시작 번호</Label>
                      <Input
                        type="number"
                        min="1"
                        value={guestBatchStartNum}
                        onChange={(e) => setGuestBatchStartNum(parseInt(e.target.value) || 1)}
                        required
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-[#98989D]">발급 인원수</Label>
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={guestBatchCount}
                        onChange={(e) => setGuestBatchCount(parseInt(e.target.value) || 1)}
                        required
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                      />
                    </div>
                  </div>

                  {/* Name Generation Mode */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">이름 생성 방식</Label>
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="guestNameMode"
                            checked={guestBatchNameMode === "auto"}
                            onChange={() => setGuestBatchNameMode("auto")}
                            className="accent-emerald-600"
                          />
                          <span>순번 자동 이름</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="guestNameMode"
                            checked={guestBatchNameMode === "custom"}
                            onChange={() => setGuestBatchNameMode("custom")}
                            className="accent-emerald-600"
                          />
                          <span>명단 직접 붙여넣기</span>
                        </label>
                      </div>
                    </div>

                    {guestBatchNameMode === "auto" ? (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">이름 접두사</Label>
                        <Input
                          value={guestBatchPrefix}
                          onChange={(e) => setGuestBatchPrefix(e.target.value)}
                          placeholder="예: 외부참가자, 게스트"
                          disabled={isPending}
                          className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">이름 목록 (줄바꿈으로 구분)</Label>
                        <textarea
                          value={guestBatchCustomNames}
                          onChange={(e) => setGuestBatchCustomNames(e.target.value)}
                          placeholder={"김철수\n이영희\n박민준"}
                          rows={4}
                          disabled={isPending}
                          className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2C2C2E] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Live Preview Box */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>발급 미리보기</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-mono">
                      {guestBatchAffiliation.trim() && guestBatchAffiliation.trim() !== "외부"
                        ? `[외부] ${guestBatchAffiliation.trim()} ${guestBatchStartNum}번`
                        : `[외부] ${guestBatchStartNum}번`}{" "}
                      ~{" "}
                      {guestBatchAffiliation.trim() && guestBatchAffiliation.trim() !== "외부"
                        ? `[외부] ${guestBatchAffiliation.trim()} ${guestBatchStartNum + (guestBatchNameMode === "custom" ? (guestBatchCustomNames.split("\n").filter((n) => n.trim()).length || 1) : guestBatchCount) - 1}번`
                        : `[외부] ${guestBatchStartNum + (guestBatchNameMode === "custom" ? (guestBatchCustomNames.split("\n").filter((n) => n.trim()).length || 1) : guestBatchCount) - 1}번`}{" "}
                      (총 {guestBatchNameMode === "custom" ? guestBatchCustomNames.split("\n").filter((n) => n.trim()).length : guestBatchCount}명)
                    </p>
                  </div>
                </div>
              ) : (
                /* Single Registration Form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-[#98989D]">소속 / 구분</Label>
                      <Input
                        value={guestSingleAffiliation}
                        onChange={(e) => setGuestSingleAffiliation(e.target.value)}
                        placeholder="예: 외부, 경운유치원, 인근초"
                        required
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-[#98989D]">식별 번호</Label>
                      <Input
                        value={guestSingleNumber}
                        onChange={(e) => setGuestSingleNumber(e.target.value)}
                        placeholder="예: 1"
                        required
                        disabled={isPending}
                        className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 dark:text-[#98989D]">참가자 이름</Label>
                    <Input
                      value={guestSingleName}
                      onChange={(e) => setGuestSingleName(e.target.value)}
                      placeholder="예: 김민수"
                      required
                      disabled={isPending}
                      className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                    />
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>등록 미리보기</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-mono font-medium">
                      {guestSingleAffiliation.trim() && guestSingleAffiliation.trim() !== "외부"
                        ? `[외부] ${guestSingleAffiliation.trim()} ${guestSingleNumber.trim()}번`
                        : `[외부] ${guestSingleNumber.trim()}번`}{" "}
                      - {guestSingleName.trim() || "(이름 입력 대기)"}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-[#2C2C2E]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsGuestOpen(false)}
                  disabled={isPending}
                  className="text-slate-500 dark:text-[#98989D]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>등록 중...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>외부 학생 등록 완료</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
