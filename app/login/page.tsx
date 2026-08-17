"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 py-12 text-white">
      <Card className="w-full max-w-md border-[#2C2C2E] bg-[#1E1E1E] text-white shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950 text-[#00E5FF] border border-cyan-800/30">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">EduFair Manager</CardTitle>
          <CardDescription className="text-[#98989D]">
            행사 관리자 또는 부스 운영교사 계정으로 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="flex items-center gap-3 rounded-lg border border-[#FF453A]/30 bg-[#3A1C1C] p-3 text-sm text-[#FF453A] animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#98989D]">
                이메일
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teacher@school.es.kr"
                required
                disabled={isPending}
                className="border-[#2C2C2E] bg-[#121212] text-white placeholder-slate-700 focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:border-[#00E5FF] focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#98989D]">
                비밀번호
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="border-[#2C2C2E] bg-[#121212] text-white placeholder-slate-700 focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:border-[#00E5FF] focus-visible:ring-offset-0"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#00E5FF] text-black hover:bg-[#00B4D8] hover:text-black font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
