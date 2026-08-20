"use client";

import { useState, useActionState } from "react";
import { resetPasswordWithPinAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validateUsername, validatePin } from "@/lib/auth-helpers";
import { KeyRound, User, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ResetPasswordClientPage() {
  const [state, formAction, isPending] = useActionState(resetPasswordWithPinAction, null);

  const [username, setUsername] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const usernameCheck = username ? validateUsername(username) : null;
  const pinCheck = recoveryPin ? validatePin(recoveryPin) : null;
  const passwordMatch = newPassword && confirmPassword ? newPassword === confirmPassword : null;

  if (state?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-800 dark:text-white select-none">
        <Card className="w-full max-w-md border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white shadow-xl rounded-2xl text-center p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">비밀번호 재설정 완료</h2>
            <p className="text-xs text-slate-500 dark:text-[#98989D] mt-1.5 leading-relaxed">
              새로운 비밀번호가 성공적으로 저장되었습니다.<br />
              변경된 정보로 로그인해 주세요.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-md text-xs gap-1.5 transition-colors"
          >
            <span>로그인 페이지로 이동</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-800 dark:text-white relative select-none">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white shadow-xl rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-blue-500"></div>

        <CardHeader className="space-y-2 text-center pb-5 pt-6 px-6">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shadow-xs mb-1">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            비밀번호 재설정
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
            가입 시 설정한 4자리 복구 PIN으로 새 비밀번호를 변경합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-[#3A1C1C] p-3 text-xs text-rose-700 dark:text-[#FF453A] animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold">{state.error}</span>
              </div>
            )}

            {/* 1. Admin Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                관리자 아이디
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="가입 시 등록한 아이디"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  required
                  disabled={isPending}
                  autoComplete="username"
                  className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              {usernameCheck && !usernameCheck.valid && (
                <p className="text-[11px] font-medium text-rose-500">{usernameCheck.error}</p>
              )}
            </div>

            {/* 2. 4-digit Recovery PIN */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="recovery_pin" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  4자리 복구 PIN
                </Label>
                <span className="text-[10px] text-slate-400">숫자 4자리</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <Input
                  id="recovery_pin"
                  name="recovery_pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="예: 1234"
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  disabled={isPending}
                  className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white font-mono tracking-widest placeholder-slate-400 rounded-xl h-11 text-sm font-bold focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              {pinCheck && !pinCheck.valid && (
                <p className="text-[11px] font-medium text-rose-500">{pinCheck.error}</p>
              )}
            </div>

            {/* 3. New Password & Confirm */}
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-[#2C2C2E]/60">
              <div className="space-y-1.5">
                <Label htmlFor="new_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  새 비밀번호
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isPending}
                    className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  새 비밀번호 확인
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="새 비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isPending}
                    className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            {passwordMatch === false && (
              <p className="text-[11px] font-medium text-rose-500">비밀번호가 일치하지 않습니다.</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending || (usernameCheck ? !usernameCheck.valid : false) || (pinCheck ? !pinCheck.valid : false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-md transition-all duration-200 text-xs gap-1.5 mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>비밀번호 변경 중...</span>
                </>
              ) : (
                <span>비밀번호 변경 및 완료</span>
              )}
            </Button>

            {/* Footer Navigation */}
            <div className="pt-2 text-center flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-[#98989D]">
              <Link
                href="/login"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ← 로그인 페이지로 돌아가기
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
