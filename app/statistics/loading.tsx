import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function StatisticsLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-[#2C2C2E] rounded-md" />
          </div>
        </div>

        <div className="h-20 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-4 flex items-center gap-4">
          <div className="h-10 w-60 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
        </div>

        {/* 3 Metric Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6 flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-[#2C2C2E]" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 bg-slate-100 dark:bg-[#2C2C2E] rounded" />
                <div className="h-6 w-24 bg-slate-200 dark:bg-[#2C2C2E] rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-96 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
          <div className="h-96 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
        </div>
      </div>
    </DashboardLayout>
  );
}
