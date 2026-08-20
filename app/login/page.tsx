"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, User, Lock, Loader2, AlertCircle, ArrowRight, KeyRound } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-800 dark:text-white relative select-none">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white shadow-xl rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500"></div>

        <CardHeader className="space-y-2 text-center pb-5 pt-6 px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
            <School className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
              EduFair Manager
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-[#98989D] mt-1">
              학교 행사 관리 및 실시간 부스 운영 플랫폼
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-6 space-y-4">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-[#3A1C1C] p-3 text-xs text-rose-700 dark:text-[#FF453A] animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold">{state.error}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                아이디
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="아이디 또는 이메일 입력"
                  required
                  disabled={isPending}
                  autoComplete="username"
                  className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  비밀번호
                </Label>
                <Link
                  href="/reset-password"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="h-3 w-3" />
                  <span>비밀번호 재설정</span>
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  autoComplete="current-password"
                  className="pl-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-md transition-all duration-200 text-xs gap-1.5 mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>로그인 중...</span>
                </>
              ) : (
                <span>로그인</span>
              )}
            </Button>
          </form>

          {/* Signup Promotion Card Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#2C2C2E]/60 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-[#98989D]">
              처음 이용하시나요?
            </p>
            <Link
              href="/signup"
              className="flex items-center justify-center w-full bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold h-11 rounded-xl text-xs gap-1.5 transition-all shadow-xs"
            >
              <span>학교 계정 생성하기</span>
              <ArrowRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
