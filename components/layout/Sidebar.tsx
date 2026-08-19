"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Store,
  Users,
  QrCode,
  BarChart3,
  FileText,
  Settings,
  X,
  School,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useTransition } from "react";
import { logoutAction } from "@/app/login/actions";
import { supabase } from "@/lib/supabase/client";

import { getCachedSettings, setCachedSettings } from "@/lib/cache";

import { isValidSchoolLogo, cleanSchoolName } from "@/lib/utils";

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "행사 관리", href: "/events", icon: Calendar },
  { name: "부스 관리", href: "/booths", icon: Store },
  { name: "학생 관리", href: "/students", icon: Users },
  { name: "실시간 통계", href: "/statistics", icon: BarChart3 },
  { name: "로그 기록", href: "/logs", icon: FileText },
  { name: "시스템 설정", href: "/settings", icon: Settings },
];

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const cached = getCachedSettings();
  const [schoolName, setSchoolName] = useState(cached ? cleanSchoolName(cached.schoolName) : "EduFair Admin");
  const [schoolLogo, setSchoolLogo] = useState(cached && isValidSchoolLogo(cached.schoolLogo) ? cached.schoolLogo : "");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const existing = getCachedSettings();
      if (existing) {
        setSchoolName(cleanSchoolName(existing.schoolName));
        setSchoolLogo(isValidSchoolLogo(existing.schoolLogo) ? existing.schoolLogo : "");
        return;
      }

      try {
        const { data } = await supabase
          .from("settings")
          .select("key, value");
        if (data) {
          const nameRow = data.find((r) => r.key === "school_name");
          const logoRow = data.find((r) => r.key === "school_logo");
          const name = cleanSchoolName(nameRow?.value || "EduFair Admin");
          
          let rawLogo = logoRow?.value;
          if (typeof rawLogo === "string") {
            try {
              if ((rawLogo.startsWith('"') && rawLogo.endsWith('"')) || rawLogo.startsWith('{') || rawLogo.startsWith('[')) {
                rawLogo = JSON.parse(rawLogo);
              }
            } catch {
              // raw
            }
          }
          const validLogo = isValidSchoolLogo(rawLogo) ? String(rawLogo).trim() : "";

          setSchoolName(name);
          setSchoolLogo(validLogo);
          setCachedSettings({ schoolName: name, schoolLogo: validLogo });
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSettings();
  }, []);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const showCustomLogo = !imgError && isValidSchoolLogo(schoolLogo);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50">
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          {showCustomLogo ? (
            <img
              src={schoolLogo}
              alt="School Logo"
              onError={() => setImgError(true)}
              className="h-8 w-8 object-contain rounded-lg"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-xs">
              <School className="h-4.5 w-4.5" />
            </div>
          )}
          <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
            {cleanSchoolName(schoolName)}
          </span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400 scale-105"
                    : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <Button
          variant="ghost"
          disabled={isPending}
          className="w-full justify-start gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
          onClick={handleLogout}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
          ) : (
            <LogOut className="h-4 w-4 text-rose-500" />
          )}
          <span>로그아웃</span>
        </Button>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          EduFair Manager v1.0.0
        </p>
      </div>
    </aside>
  );
}
