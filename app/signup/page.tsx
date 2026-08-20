import { Metadata } from "next";
import { SignupClientPage } from "./signup-client";

export const metadata: Metadata = {
  title: "학교 관리자 회원가입 - EduFair Manager",
  description: "학교 축제 및 스탬프투어 운영을 위한 대표 관리자 계정 생성",
};

export default function SignupPage() {
  return <SignupClientPage />;
}
