"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar (visible on md and up) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (collapsible drawer with smooth transition) */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex md:hidden transition-all duration-300",
          isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
        
        {/* Sidebar drawer content */}
        <div
          className={cn(
            "relative flex w-full max-w-xs flex-1 flex-col transition-transform duration-300 ease-in-out",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
