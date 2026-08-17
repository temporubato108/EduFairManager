"use client";

import { useState, useEffect } from "react";
import { Calendar, User, Menu, LogOut, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { logoutAction } from "@/app/login/actions";
import { supabase } from "@/lib/supabase/client";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [userName, setUserName] = useState("교사");
  const [role, setRole] = useState("부스 운영교사");

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teacher } = await supabase
            .from("teachers")
            .select("name, role")
            .eq("id", user.id)
            .single();
          if (teacher) {
            setUserName(teacher.name);
            setRole(teacher.role === "admin" ? "관리자" : "부스 운영교사");
          } else {
            setUserName(user.email || "교사");
            setRole(user.user_metadata?.role === "admin" ? "관리자" : "부스 운영교사");
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadUser();
  }, []);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const currentDate = new Date().toLocaleDateString("ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Side: Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:gap-3">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              EduFair Manager
            </span>
            <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 md:block" />
            <div className="hidden items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 md:flex">
              <Calendar className="h-3.5 w-3.5" />
              <span>{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Info & Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50/50 py-1 pl-2 pr-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{userName}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{role}</span>
            </div>
          </div>
          
          <span className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          
          <ThemeToggle />

          <span className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isPending}
            className="w-9 h-9 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
            title="로그아웃"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
