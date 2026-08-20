"use client";

import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Trash2,
  Moon,
  School,
  QrCode,
  Lock,
} from "lucide-react";
import { saveSettingsAction, changePasswordAction, SystemSettings } from "./actions";
import { isValidSchoolLogo, cleanSchoolName } from "@/lib/utils";
import { setCachedSettings } from "@/lib/cache";

interface SettingsClientPageProps {
  initialSettings: SystemSettings;
}

export function SettingsClientPage({ initialSettings }: SettingsClientPageProps) {
  const [schoolName, setSchoolName] = useState(cleanSchoolName(initialSettings.school_name));
  const [schoolLogo, setSchoolLogo] = useState(isValidSchoolLogo(initialSettings.school_logo) ? initialSettings.school_logo : "");
  const [imgError, setImgError] = useState(false);
  const [qrSize, setQrSize] = useState(initialSettings.qr_size);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(initialSettings.sound_effects_enabled);
  const [darkModeEnabled, setDarkModeEnabled] = useState(initialSettings.dark_mode_enabled);
  const [defaultAllowDoubleParticipation, setDefaultAllowDoubleParticipation] = useState(
    initialSettings.default_allow_double_participation
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload handler with client-side canvas optimization (supports any size/format)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("로고 파일은 이미지 양식(PNG, JPG, WebP, GIF 등)이어야 합니다.");
      return;
    }

    setErrorMessage(null);
    setImgError(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl || typeof rawDataUrl !== "string") return;

      // Automatically downscale and optimize image using canvas (max 256x256)
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png");
          setSchoolLogo(compressed);
        } else {
          setSchoolLogo(rawDataUrl);
        }
      };
      img.onerror = () => {
        setErrorMessage("이미지 로드에 실패했습니다. 다른 이미지 파일을 선택해주세요.");
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setSchoolLogo("");
    setImgError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: Partial<SystemSettings> = {
      school_name: schoolName,
      school_logo: schoolLogo,
      qr_size: qrSize,
      sound_effects_enabled: soundEffectsEnabled,
      dark_mode_enabled: darkModeEnabled,
      default_allow_double_participation: defaultAllowDoubleParticipation,
    };

    try {
      const res = await saveSettingsAction(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("시스템 설정이 성공적으로 업데이트되었습니다.");
        if (typeof window !== "undefined") {
          localStorage.setItem("edufair_school_name", schoolName);
          localStorage.setItem("edufair_school_logo", schoolLogo);
        }
        setCachedSettings({ schoolName, schoolLogo });
        // Auto scroll to top to see success alert
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const errorObj = err as Error;
      setErrorMessage(`저장 실패: ${errorObj.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("새 비밀번호는 최소 6자 이상이어야 합니다.");
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      setPasswordLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("new_password", newPassword);
    formData.append("confirm_password", confirmPassword);

    try {
      const res = await changePasswordAction(formData);
      if (res.error) {
        setPasswordError(res.error);
      } else {
        setPasswordSuccess("비밀번호가 성공적으로 변경되었습니다.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      const errorObj = err as Error;
      setPasswordError(`비밀번호 변경 실패: ${errorObj.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        
        {/* Header title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#FFFFFF] flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>시스템 기본 설정</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#98989D]">
            학교 정보, QR 프린터 레이아웃 규격, 현장 키오스크 효과음 상태 및 기본 행사 제한 규칙을 관리합니다.
          </p>
        </div>

        {/* Alerts display */}
        {successMessage && (
          <div className="text-xs text-[#32D74B] bg-[#1C3A27] px-3.5 py-3 rounded-xl border border-emerald-900/30 flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="text-xs text-[#FF453A] bg-[#3A1C1C] px-3.5 py-3 rounded-xl border border-red-900/30 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: School Profile info */}
          <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
            <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E]/60 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <School className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                학교 프로필 설정
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
                축제 메인 및 학생 화면 상단에 표시되는 타이틀을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="space-y-1.5">
                <Label htmlFor="school-name" className="text-xs text-slate-500 dark:text-[#98989D]">기본 학교명</Label>
                <Input
                  id="school-name"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="예: 미래초등학교"
                  required
                  className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500 dark:text-[#98989D]">학교 로고 이미지</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview avatar */}
                  <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col items-center justify-center overflow-hidden flex-shrink-0 relative shadow-sm">
                    {isValidSchoolLogo(schoolLogo) && !imgError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={schoolLogo}
                        alt="School Logo"
                        onError={() => setImgError(true)}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 text-center">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xs mb-1">
                          <School className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-tight">기본 로고</span>
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-transparent border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white font-semibold text-xs h-9 gap-1.5 flex-1 sm:flex-initial"
                      >
                        <Upload className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        <span>이미지 업로드</span>
                      </Button>
                      {schoolLogo && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleClearLogo}
                          className="text-rose-600 dark:text-[#FF453A] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-[#FF453A] font-semibold text-xs h-9 gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>기본값으로 초기화</span>
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-[#98989D]">
                      {schoolLogo
                        ? "사용자 지정 학교 로고가 등록되었습니다. 삭제 시 기본 로고로 자동 복구됩니다."
                        : "로고 이미지를 따로 업로드하지 않을 시, 기본 로고가 자동으로 적용됩니다."}
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Section 2: QR & Hardware configurations */}
          <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
            <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E]/60 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                출력 및 디바이스 환경 설정
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
                QR 카드 인쇄 사양과 키오스크 모듈의 튜닝 사양을 편집합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qr-size" className="text-xs text-slate-500 dark:text-[#98989D]">QR 코드 인쇄 크기 (px)</Label>
                  <Input
                    id="qr-size"
                    type="number"
                    min="100"
                    max="300"
                    value={qrSize}
                    onChange={(e) => setQrSize(e.target.value)}
                    required
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-[#98989D]">키오스크 태깅 효과음</Label>
                  <Select value={soundEffectsEnabled} onValueChange={(val) => val && setSoundEffectsEnabled(val)}>
                    <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9">
                      <SelectValue placeholder="효과음 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="true">🔊 효과음 활성화 (태그 성공 시 알림음)</SelectItem>
                      <SelectItem value="false">🔇 효과음 끄기 (무음 모드)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Section 3: Theme & Fairs Default policies */}
          <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
            <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E]/60 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                기본 시스템 정책 설정
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
                새로운 행사를 만들거나 관리자 페이지를 열 때의 기본 스타일 옵션을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-[#98989D]">어드민 디렉토리 다크모드</Label>
                  <Select value={darkModeEnabled} onValueChange={(val) => val && setDarkModeEnabled(val)}>
                    <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9">
                      <SelectValue placeholder="테마 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="true">🌙 다크 테마 기본 활성화</SelectItem>
                      <SelectItem value="false">☀️ 라이트 테마 설정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 dark:text-[#98989D]">신규 행사 기본 중복 참여 규칙</Label>
                  <Select
                    value={defaultAllowDoubleParticipation}
                    onValueChange={(val) => val && setDefaultAllowDoubleParticipation(val)}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9">
                      <SelectValue placeholder="규칙 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-[#2C2C2E] dark:text-white">
                      <SelectItem value="true">✅ 동일 부스 중복 참여 허용 (다회 스캔 가능)</SelectItem>
                      <SelectItem value="false">❌ 동일 부스 중복 참여 금지 (스캔 성공은 1회만 제한)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Form Actions footer */}
          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-extrabold text-xs h-10 px-6 rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>설정 저장 중...</span>
                </>
              ) : (
                "설정 저장하기"
              )}
            </Button>
          </div>

        </form>

        {/* Section 4: Change Password Card */}
        <Card className="border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E]">
          <CardHeader className="border-b border-slate-100 dark:border-[#2C2C2E]/60 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              비밀번호 변경
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
              현재 로그인된 관리자 계정의 비밀번호를 안전하게 변경합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordSuccess && (
                <div className="text-xs text-[#32D74B] bg-[#1C3A27] px-3.5 py-3 rounded-xl border border-emerald-900/30 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold">{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="text-xs text-[#FF453A] bg-[#3A1C1C] px-3.5 py-3 rounded-xl border border-red-900/30 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold">{passwordError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs text-slate-500 dark:text-[#98989D]">
                    새 비밀번호 (최소 6자)
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    required
                    minLength={6}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password" className="text-xs text-slate-500 dark:text-[#98989D]">
                    새 비밀번호 확인
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 재입력"
                    required
                    minLength={6}
                    className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-extrabold text-xs h-9 px-5 rounded-xl"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      <span>변경 중...</span>
                    </>
                  ) : (
                    "비밀번호 변경하기"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
