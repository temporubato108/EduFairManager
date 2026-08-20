import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function SettingsLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-[#2C2C2E] rounded-md" />
        </div>

        <div className="space-y-6">
          <div className="h-56 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
          <div className="h-56 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
        </div>
      </div>
    </DashboardLayout>
  );
}
