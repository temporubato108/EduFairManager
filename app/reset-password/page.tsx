import { Metadata } from "next";
import { ResetPasswordClientPage } from "./reset-client";

export const metadata: Metadata = {
  title: "비밀번호 재설정 - EduFair Manager",
  description: "4자리 복구 PIN을 이용한 관리자 비밀번호 재설정",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClientPage />;
}
