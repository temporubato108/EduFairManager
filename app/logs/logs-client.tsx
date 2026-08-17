"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Shield,
} from "lucide-react";
import { getLogsAction, LogEntry } from "./actions";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface LogsClientPageProps {
  initialEvents: EventOption[];
}

export function LogsClientPage({ initialEvents }: LogsClientPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | "all" | "null">("all");
  const [selectedActionType, setSelectedActionType] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Logs function
  const fetchLogs = useCallback(async (eId: string, actionType: string, search: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getLogsAction(eId, actionType, search);
      if (res.error) {
        setErrorMessage(res.error);
        setLogs([]);
      } else if (res.data) {
        setLogs(res.data);
        setErrorMessage(null);
      }
    } catch (err) {
      const errorObj = err as Error;
      setErrorMessage(`로그를 로드하는 중 오류가 발생했습니다: ${errorObj.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(selectedEventId, selectedActionType, searchQuery, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, selectedActionType]);

  const handleManualRefresh = () => {
    fetchLogs(selectedEventId, selectedActionType, searchQuery, true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(selectedEventId, selectedActionType, searchQuery, true);
  };

  const handleExcelExport = () => {
    if (logs.length === 0) return;

    const rows = logs.map((l) => ({
      "일시": new Date(l.createdAt).toLocaleString("ko-KR"),
      "작업 유형": getActionTypeLabel(l.actionType),
      "작업 교사 (이메일)": l.operatorName + (l.operatorEmail ? ` (${l.operatorEmail})` : ""),
      "상세 내용": l.details,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "감사 로그 리스트");
    XLSX.writeFile(wb, `EduFair_감사로그_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case "login":
        return "로그인";
      case "create_event":
        return "행사 생성";
      case "update_event":
        return "행사 수정";
      case "delete_event":
        return "행사 삭제";
      case "duplicate_event":
        return "행사 복제";
      case "template_event":
        return "행사 템플릿 저장";
      case "create_booth":
        return "부스 생성";
      case "update_booth":
        return "부스 수정";
      case "delete_booth":
        return "부스 삭제";
      case "create_student":
        return "학생 생성";
      case "update_student":
        return "학생 수정";
      case "delete_student":
        return "학생 삭제";
      case "import_students":
        return "학생 일괄 등록";
      case "scan_success":
        return "QR 스캔 성공";
      case "scan_duplicate_error":
        return "중복 스캔 에러";
      case "scan_student_not_found":
        return "미등록 학생 스캔";
      case "scan_invalid_qr":
        return "비정상 QR 스캔";
      default:
        return type;
    }
  };

  const getActionBadgeColor = (type: string) => {
    if (type === "login") return "bg-blue-950/80 border-blue-800/30 text-blue-400";
    if (type.startsWith("create_")) return "bg-purple-950/80 border-purple-800/30 text-purple-400";
    if (type.startsWith("update_")) return "bg-amber-950/80 border-amber-800/30 text-amber-400";
    if (type.startsWith("delete_")) return "bg-rose-950/80 border-rose-800/30 text-rose-400";
    if (type === "scan_success") return "bg-emerald-950/80 border-emerald-800/30 text-emerald-400";
    if (type.startsWith("scan_")) return "bg-red-950/80 border-red-800/30 text-red-400";
    return "bg-slate-950 border-slate-800 text-slate-400";
  };

  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Upper title header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF] flex items-center gap-2">
              <Shield className="h-6 w-6 text-[#00E5FF]" />
              <span>시스템 감사 로그</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              운영 교사 로그인, CRUD 작업, 실시간 스캔 등의 모든 변경 이력을 실시간 모니터링합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <Button
                onClick={handleExcelExport}
                className="bg-[#32D74B] hover:bg-[#2bc443] text-black font-extrabold flex items-center gap-1.5 rounded-xl shadow-lg shadow-emerald-950/10 text-xs py-2 h-9"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>로그 내보내기</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              disabled={loading}
              className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-700 dark:text-white h-9 w-9"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#00E5FF]" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filter / Search Card controls */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="grid gap-4 sm:grid-cols-12 items-end">
              {/* Event filter dropdown */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-slate-500 dark:text-[#98989D] text-xs">대상 행사 선택</Label>
                <Select value={selectedEventId} onValueChange={(val) => val && setSelectedEventId(val)}>
                  <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                    <SelectItem value="all">전체 로그 조회</SelectItem>
                    <SelectItem value="null">시스템 로그 (행사 무관)</SelectItem>
                    {initialEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({event.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action type dropdown */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-slate-500 dark:text-[#98989D] text-xs">작업 유형 필터</Label>
                <Select value={selectedActionType} onValueChange={(val) => val && setSelectedActionType(val)}>
                  <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                    <SelectItem value="all">전체 작업</SelectItem>
                    <SelectItem value="login">교사 로그인</SelectItem>
                    <SelectItem value="create_event">행사 생성</SelectItem>
                    <SelectItem value="update_event">행사 수정</SelectItem>
                    <SelectItem value="delete_event">행사 삭제</SelectItem>
                    <SelectItem value="create_booth">부스 생성</SelectItem>
                    <SelectItem value="update_booth">부스 수정</SelectItem>
                    <SelectItem value="delete_booth">부스 삭제</SelectItem>
                    <SelectItem value="create_student">학생 추가</SelectItem>
                    <SelectItem value="update_student">학생 수정</SelectItem>
                    <SelectItem value="delete_student">학생 삭제</SelectItem>
                    <SelectItem value="import_students">학생 엑셀 업로드</SelectItem>
                    <SelectItem value="scan_success">스캔 완료 (도장 성공)</SelectItem>
                    <SelectItem value="scan_duplicate_error">중복 스캔 반려</SelectItem>
                    <SelectItem value="scan_student_not_found">미등록 학생 스캔</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text Search keywords query */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-slate-500 dark:text-[#98989D] text-xs">내용 검색 키워드</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="로그 정보 키워드 입력..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              {/* Search trigger button */}
              <div className="sm:col-span-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00E5FF] hover:bg-[#00D0EB] text-black font-extrabold text-xs h-9 rounded-xl"
                >
                  검색
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {errorMessage && (
          <div className="text-xs text-[#FF453A] bg-[#3A1C1C] px-3 py-2.5 rounded-xl border border-red-900/30 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Audit logs timeline table card */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardContent className="p-0">
            {loading && logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Loader2 className="h-10 w-10 animate-spin text-[#00E5FF] mb-3" />
                <p className="text-sm">감사 로그 목록을 가져오는 중...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Clock className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">수집된 감사 로그가 존재하지 않습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#2C2C2E] text-slate-400 uppercase bg-slate-50/50 dark:bg-[#121212]/30">
                      <th className="p-3 font-semibold w-[20%]">시간 (일시)</th>
                      <th className="p-3 font-semibold w-[20%]">작업 수행자</th>
                      <th className="p-3 font-semibold w-[15%]">작업 유형</th>
                      <th className="p-3 font-semibold w-[45%]">활동 내용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/40 text-slate-700 dark:text-slate-300">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#121212]/20">
                        <td className="p-3 font-mono text-slate-400 dark:text-[#98989D]">
                          {formatLogTime(log.createdAt)}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {log.operatorName}
                          </span>
                          {log.operatorEmail && (
                            <span className="text-[10px] text-slate-400 block sm:inline sm:ml-1.5 font-mono">
                              ({log.operatorEmail})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-wide uppercase",
                              getActionBadgeColor(log.actionType)
                            )}
                          >
                            {getActionTypeLabel(log.actionType)}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-200">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
