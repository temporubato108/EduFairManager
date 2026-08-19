import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StudentStampbookClientPage } from "./stampbook-client";

export default function StampbookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121212] text-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-[#98989D]">스탬프북 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <StudentStampbookClientPage />
    </Suspense>
  );
}
