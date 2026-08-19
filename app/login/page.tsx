"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-800 dark:text-white relative">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-white shadow-xl rounded-2xl">
        <CardHeader className="space-y-2.5 text-center pb-6">
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
        
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-[#3A1C1C] p-3 text-xs text-rose-700 dark:text-[#FF453A] animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold">{state.error}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-600 dark:text-[#98989D]">
                이메일
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teacher@school.es.kr"
                required
                disabled={isPending}
                className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-[#98989D]">
                비밀번호
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl h-10 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:text-white font-bold h-11 rounded-xl shadow-md transition-all duration-200 text-xs gap-1.5 mt-2"
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

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400 dark:text-[#98989D]">
                부스 운영 교사 및 행사 총괄 관리자 전용 로그인
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
