import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function EventsLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg" />
            <div className="h-4 w-60 bg-slate-200 dark:bg-[#2C2C2E] rounded-md" />
          </div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-[#2C2C2E] rounded-xl" />
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-[#2C2C2E] p-6 space-y-4">
          <div className="h-10 w-full bg-slate-100 dark:bg-[#2C2C2E] rounded-xl" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-50 dark:bg-[#121212] rounded-xl" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
