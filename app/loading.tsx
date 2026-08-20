import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function RootLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-[#2C2C2E] rounded-md" />
          </div>
          <div className="h-10 w-28 bg-slate-200 dark:bg-[#2C2C2E] rounded-xl" />
        </div>

        {/* Filter bar */}
        <div className="h-20 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-4 flex items-center gap-4">
          <div className="h-10 w-60 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
        </div>

        {/* Metric cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6 space-y-3"
            >
              <div className="h-3 w-16 bg-slate-100 dark:bg-[#2C2C2E] rounded" />
              <div className="h-7 w-24 bg-slate-200 dark:bg-[#2C2C2E] rounded" />
            </div>
          ))}
        </div>

        {/* Panels */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 h-80 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
          <div className="lg:col-span-5 h-80 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6" />
        </div>
      </div>
    </DashboardLayout>
  );
}
