import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function StudentsLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg" />
            <div className="h-4 w-72 bg-slate-200 dark:bg-[#2C2C2E] rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-slate-200 dark:bg-[#2C2C2E] rounded-xl" />
            <div className="h-10 w-28 bg-slate-200 dark:bg-[#2C2C2E] rounded-xl" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="h-20 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-4 flex items-center justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-52 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
            <div className="h-10 w-44 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
          </div>
          <div className="h-10 w-44 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
        </div>

        {/* Students Table Skeleton */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6 space-y-4">
          <div className="h-10 w-full bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-50 dark:bg-[#121212] rounded-xl" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
