"use client";

import { useState, useTransition, useEffect } from "react";
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
  Calendar,
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Save,
  Trash2,
  Play,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  duplicateEventAction,
  saveAsTemplateAction,
} from "./actions";
import { cn } from "@/lib/utils";

// Interface matching the schema
interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: "ready" | "progress" | "end";
  allow_double_participation: boolean;
  is_template: boolean;
}

interface EventClientPageProps {
  initialEvents: Event[];
}

export function EventClientPage({ initialEvents }: EventClientPageProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [activeTab, setActiveTab] = useState<"active" | "template">("active");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state with server-side props
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [duplicatingEvent, setDuplicatingEvent] = useState<Event | null>(null);
  const [templatingEvent, setTemplatingEvent] = useState<Event | null>(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState<"ready" | "progress" | "end">("ready");
  const [formDouble, setFormDouble] = useState("false");
  const [formIsTemplate, setFormIsTemplate] = useState(false);

  // Form states for Duplicate
  const [dupName, setDupName] = useState("");
  const [dupDate, setDupDate] = useState("");

  // Form states for Template
  const [tplName, setTplName] = useState("");

  // Reset Create Form
  const resetCreateForm = () => {
    setFormName("");
    setFormDesc("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("ready");
    setFormDouble("false");
    setFormIsTemplate(false);
    setErrorMessage(null);
  };

  // Open Edit Dialog
  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setFormName(event.name);
    setFormDesc(event.description || "");
    setFormDate(event.date);
    setFormStatus(event.status);
    setFormDouble(event.allow_double_participation ? "true" : "false");
    setFormIsTemplate(event.is_template);
    setErrorMessage(null);
  };

  // Open Duplicate Dialog
  const openDuplicate = (event: Event) => {
    setDuplicatingEvent(event);
    setDupName(`${event.name} (복제)`);
    setDupDate(new Date().toISOString().split("T")[0]);
    setErrorMessage(null);
  };

  // Open Save as Template Dialog
  const openTemplating = (event: Event) => {
    setTemplatingEvent(event);
    setTplName(`${event.name} 템플릿`);
    setErrorMessage(null);
  };

  // Handle Create Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDate) return;

    startTransition(async () => {
      const res = await createEventAction({
        name: formName,
        description: formDesc || undefined,
        date: formDate,
        status: formStatus,
        allow_double_participation: formDouble === "true",
        is_template: formIsTemplate,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCreateOpen(false);
        resetCreateForm();
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !formName || !formDate) return;

    startTransition(async () => {
      const res = await updateEventAction(editingEvent.id, {
        name: formName,
        description: formDesc || undefined,
        date: formDate,
        status: formStatus,
        allow_double_participation: formDouble === "true",
        is_template: formIsTemplate,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingEvent(null);
      }
    });
  };

  // Handle Duplicate Submit
  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingEvent || !dupName || !dupDate) return;

    startTransition(async () => {
      const res = await duplicateEventAction(duplicatingEvent.id, dupName, dupDate);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setDuplicatingEvent(null);
      }
    });
  };

  // Handle Save as Template Submit
  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templatingEvent || !tplName) return;

    startTransition(async () => {
      const res = await saveAsTemplateAction(templatingEvent.id, tplName);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setTemplatingEvent(null);
        setActiveTab("template"); // Move to template tab to see it
      }
    });
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (!confirm("정말 이 행사를 삭제하시겠습니까? 관련 데이터가 복구되지 않을 수 있습니다.")) return;

    startTransition(async () => {
      const res = await deleteEventAction(id);
      if (res.error) {
        alert(`삭제 실패: ${res.error}`);
      }
    });
  };

  // Filter events by tab selection
  const filteredEvents = events.filter((e) =>
    activeTab === "template" ? e.is_template : !e.is_template
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Upper Dashboard header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF]">행사 관리</h1>
            <p className="text-sm text-slate-500 dark:text-[#98989D]">
              학교 행사 및 템플릿을 등록하고 제어합니다.
            </p>
          </div>
          <Button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-semibold gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>새 행사 등록</span>
          </Button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 dark:border-[#2C2C2E]">
          <button
            onClick={() => setActiveTab("active")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all duration-200",
              activeTab === "active"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-[#98989D] dark:hover:text-white"
            )}
          >
            진행/예정 행사
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all duration-200",
              activeTab === "template"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-[#98989D] dark:hover:text-white"
            )}
          >
            행사 템플릿
          </button>
        </div>

        {/* Events Table Listing */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardContent className="p-0">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#98989D]">
                <Calendar className="h-10 w-10 text-slate-300 dark:text-[#2C2C2E] mb-3" />
                <p className="text-sm">등록된 행사가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="border-slate-200 dark:border-[#2C2C2E]">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2C2C2E]">
                    <TableHead className="w-[30%]">행사명</TableHead>
                    <TableHead className="w-[20%]">날짜</TableHead>
                    <TableHead className="w-[15%]">상태</TableHead>
                    <TableHead className="w-[20%]">중복참여</TableHead>
                    <TableHead className="w-[15%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="border-slate-100 hover:bg-slate-50/50 dark:border-[#2C2C2E] dark:hover:bg-[#252525]"
                    >
                      <TableCell className="font-semibold text-slate-800 dark:text-white">
                        {event.name}
                        {event.description && (
                          <p className="text-xs font-normal text-slate-400 dark:text-[#98989D] mt-0.5">
                            {event.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 dark:text-[#98989D]">
                        {event.date}
                      </TableCell>
                      <TableCell>
                        {!event.is_template ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              event.status === "progress"
                                && "bg-emerald-100 text-emerald-800 dark:bg-[#1C3A27] dark:text-[#32D74B]",
                              event.status === "ready"
                                && "bg-amber-100 text-amber-800 dark:bg-[#3A2D1C] dark:text-amber-400",
                              event.status === "end"
                                && "bg-slate-100 text-slate-800 dark:bg-[#2C2C2E] dark:text-slate-400"
                            )}
                          >
                            {event.status === "progress" && <Play className="h-3 w-3 animate-pulse" />}
                            {event.status === "progress" && "진행 중"}
                            {event.status === "ready" && "준비"}
                            {event.status === "end" && "종료"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                            <Sparkles className="h-3 w-3" />
                            템플릿
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-[#98989D]">
                        {event.allow_double_participation ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">허용</span>
                        ) : (
                          <span>금지</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-[#98989D]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
                            <DropdownMenuItem onClick={() => openEdit(event)} className="gap-2 cursor-pointer dark:text-white dark:hover:bg-[#252525]">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>정보 수정</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDuplicate(event)} className="gap-2 cursor-pointer dark:text-white dark:hover:bg-[#252525]">
                              <Copy className="h-3.5 w-3.5" />
                              <span>행사 복제</span>
                            </DropdownMenuItem>
                            {!event.is_template && (
                              <DropdownMenuItem onClick={() => openTemplating(event)} className="gap-2 cursor-pointer dark:text-white dark:hover:bg-[#252525]">
                               <Save className="h-3.5 w-3.5" />
                                <span>템플릿으로 저장</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(event.id)}
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
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>새 행사 등록</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                새로운 학년 행사 또는 스페셜 페어를 생성합니다.
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
                <Label htmlFor="c-name" className="text-slate-600 dark:text-[#98989D]">행사명</Label>
                <Input
                  id="c-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 2026학년도 디지털 페어"
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
                  placeholder="행사에 대한 짧은 설명을 기록하세요."
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-date" className="text-slate-600 dark:text-[#98989D]">날짜</Label>
                  <Input
                    id="c-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-status" className="text-slate-600 dark:text-[#98989D]">초기 상태</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(val) => val && setFormStatus(val as "ready" | "progress" | "end")}
                    disabled={isPending}
                  >
                    <SelectTrigger id="c-status" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="ready">준비</SelectItem>
                      <SelectItem value="progress">진행 중</SelectItem>
                      <SelectItem value="end">종료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="c-double" className="text-slate-600 dark:text-[#98989D]">중복 참여 정책</Label>
                  <Select value={formDouble} onValueChange={(val) => val && setFormDouble(val)} disabled={isPending}>
                    <SelectTrigger id="c-double" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="false">금지 (기본값)</SelectItem>
                      <SelectItem value="true">허용 (자유 체험)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6 pl-2">
                  <input
                    id="c-template"
                    type="checkbox"
                    checked={formIsTemplate}
                    onChange={(e) => setFormIsTemplate(e.target.checked)}
                    disabled={isPending}
                    className="w-4 h-4 accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
                  />
                  <Label htmlFor="c-template" className="text-slate-700 dark:text-[#FFFFFF] cursor-pointer">
                    템플릿으로 등록
                  </Label>
                </div>
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
                    "등록"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Edit Dialog */}
        <Dialog open={editingEvent !== null} onOpenChange={(open) => !open && setEditingEvent(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>행사 정보 수정</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                선택한 행사의 명칭 및 운영 정책을 변경합니다.
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
                <Label htmlFor="e-name" className="text-slate-600 dark:text-[#98989D]">행사명</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="e-date" className="text-slate-600 dark:text-[#98989D]">날짜</Label>
                  <Input
                    id="e-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    disabled={isPending}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-status" className="text-slate-600 dark:text-[#98989D]">행사 상태</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(val) => val && setFormStatus(val as "ready" | "progress" | "end")}
                    disabled={isPending}
                  >
                    <SelectTrigger id="e-status" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="ready">준비</SelectItem>
                      <SelectItem value="progress">진행 중</SelectItem>
                      <SelectItem value="end">종료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="e-double" className="text-slate-600 dark:text-[#98989D]">중복 참여 정책</Label>
                  <Select value={formDouble} onValueChange={(val) => val && setFormDouble(val)} disabled={isPending}>
                    <SelectTrigger id="e-double" className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="false">금지</SelectItem>
                      <SelectItem value="true">허용</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6 pl-2">
                  <input
                    id="e-template"
                    type="checkbox"
                    checked={formIsTemplate}
                    onChange={(e) => setFormIsTemplate(e.target.checked)}
                    disabled={isPending}
                    className="w-4 h-4 accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
                  />
                  <Label htmlFor="e-template" className="text-slate-700 dark:text-[#FFFFFF] cursor-pointer">
                    템플릿으로 등록
                  </Label>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingEvent(null)}
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

        {/* 3. Duplicate Dialog */}
        <Dialog open={duplicatingEvent !== null} onOpenChange={(open) => !open && setDuplicatingEvent(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>행사 복제</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                기존 행사 설정 및 등록된 체험 부스들을 새 행사로 일괄 복사합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDuplicateSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="d-name" className="text-slate-600 dark:text-[#98989D]">새 행사명</Label>
                <Input
                  id="d-name"
                  value={dupName}
                  onChange={(e) => setDupName(e.target.value)}
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="d-date" className="text-slate-600 dark:text-[#98989D]">개최 날짜</Label>
                <Input
                  id="d-date"
                  type="date"
                  value={dupDate}
                  onChange={(e) => setDupDate(e.target.value)}
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] font-mono"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDuplicatingEvent(null)}
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
                      복제 중...
                    </>
                  ) : (
                    "복제 생성"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. Save as Template Dialog */}
        <Dialog open={templatingEvent !== null} onOpenChange={(open) => !open && setTemplatingEvent(null)}>
          <DialogContent className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>템플릿으로 저장</DialogTitle>
              <DialogDescription className="dark:text-[#98989D]">
                이 행사의 부스 구조를 복사하여 다음 행사에 재사용 가능한 템플릿으로 저장합니다. (학생 참여 내역은 복사되지 않습니다)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-xs text-[#FF453A]">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="t-name" className="text-slate-600 dark:text-[#98989D]">템플릿 이름</Label>
                <Input
                  id="t-name"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  required
                  disabled={isPending}
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E]"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setTemplatingEvent(null)}
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
                    "템플릿 저장"
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
