"use client";

import { useState, useActionState } from "react";
import { signupAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolSearch } from "@/components/ui/school-search";
import { validateUsername, validatePin } from "@/lib/auth-helpers";
import { School, User, Lock, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SignupClientPage() {
  const [state, formAction, isPending] = useActionState(signupAction, null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Live client-side validations
  const usernameCheck = username ? validateUsername(username) : null;
  const pinCheck = recoveryPin ? validatePin(recoveryPin) : null;
  const passwordMatch = password && confirmPassword ? password === confirmPassword : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-10 text-slate-800 dark:text-white relative select-none">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-lg border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white shadow-xl rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500"></div>

        <CardHeader className="space-y-2 text-center pb-5 pt-6 px-6">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 shadow-xs mb-1">
            <School className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            학교 관리자 회원가입
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-[#98989D]">
            일반 교사와 학생은 별도 가입 없이 QR 코드로 즉시 참여할 수 있습니다.
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

            {/* 1. School Name Auto-complete Search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>학교명 검색</span>
                <span className="text-[10px] text-slate-400 font-normal">타이핑 시 전국 학교 자동완성</span>
              </Label>
              <SchoolSearch
                name="school_name"
                value={schoolName}
                onChange={(name) => setSchoolName(name)}
                required
                disabled={isPending}
              />
            </div>

            {/* 2. Admin Username */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="username" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  관리자 아이디
                </Label>
                <span className="text-[10px] text-slate-400">4~20자 영문, 숫자, _ 허용 (한글 제외)</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="예: hanguk_admin 또는 korea2026"
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
              {usernameCheck && usernameCheck.valid && (
                <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 사용 가능한 아이디 형식입니다.
                </p>
              )}
            </div>

            {/* 3. Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  비밀번호
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isPending}
                    className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  비밀번호 확인
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="비밀번호 재입력"
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

            {/* 4. 4-digit Recovery PIN */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="recovery_pin" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                  <span>비상 복구 4자리 숫자 PIN</span>
                </Label>
                <span className="text-[10px] text-slate-400">숫자 4자리</span>
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
                className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white font-mono tracking-widest text-center placeholder-slate-400 rounded-xl h-11 text-base font-bold focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-[#98989D] leading-tight">
                💡 비밀번호 분실 시 복구에 사용되는 비상 핀코드입니다. 기억하기 쉬운 4자리 숫자를 입력해주세요.
              </p>
              {pinCheck && !pinCheck.valid && (
                <p className="text-[11px] font-medium text-rose-500">{pinCheck.error}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending || (usernameCheck ? !usernameCheck.valid : false) || (pinCheck ? !pinCheck.valid : false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-md transition-all duration-200 text-sm gap-2 mt-3"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>학교 계정 등록 중...</span>
                </>
              ) : (
                <>
                  <span>학교 관리자 계정 생성하기</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Footer Navigation */}
            <div className="pt-3 text-center flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-[#98989D]">
              <span>이미 계정이 있으신가요?</span>
              <Link
                href="/login"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                로그인하기
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
