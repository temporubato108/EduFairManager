import Link from "next/link";
import { ShieldCheck, ArrowLeft, School, Lock, FileText, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "개인정보 처리방침 | EduFair Manager",
  description: "에듀페어 매니저(EduFair Manager) 개인정보 처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인 화면으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        {/* Title Badge */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <ShieldCheck className="w-4 h-4" />
            <span>한국교육학술정보원(KERIS) 학습지원 SW 기준 준수</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            개인정보 처리방침
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            에듀페어 매니저(EduFair Manager)는 학교 교육활동 목적의 개인정보를 최소한으로 처리하며 안전하게 보호합니다.
          </p>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">최소 수집 원칙 준수</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              학생 주민번호, 생년월일, 연락처를 일절 수집하지 않으며 학번과 성명만으로 운영됩니다.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <School className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">학생 회원가입 제로</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              만 14세 미만 아동의 계정 생성이나 앱 설치 없이 QR 코드를 통한 즉시 참여를 지원합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">행사 종료 시 즉시 파기</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              학교 관리 교사가 행사 종료 후 언제든지 원클릭으로 학생 명단 및 스캔 기록을 완전 영구 파기할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm leading-relaxed text-sm">
          
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">1</span>
              제1조 (개인정보의 처리 목적)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              에듀페어 매니저(EduFair Manager, 이하 &apos;서비스&apos;)는 초·중·고등학교 축제, 진로체험의 날, 과학/동아리 박람회 등 
              <strong>학교 공식 교육행사의 부스 운영, 참여 기록 집계, 모바일 스탬프 날인 및 학교생활기록부 연계 통계 산출</strong>을 목적으로만 개인정보를 처리합니다. 
              수집된 정보는 명시된 교육활동 목적 이외의 용도로 일절 사용되지 않습니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">2</span>
              제2조 (처리하는 개인정보의 항목 및 최소 처리의 원칙)
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              본 서비스는 개인정보보호법 제16조에 따른 &apos;최소 수집 원칙&apos;을 엄격히 준수하며, 서비스 제공에 필수적인 최소한의 정보만을 처리합니다.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-2">
              <div>
                <strong className="text-slate-900 dark:text-white">1. 학생 정보 (행사 참여 대상):</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 dark:text-slate-300 pl-2">
                  <li><strong>필수 항목:</strong> 학년, 반, 번호(학번), 이름</li>
                  <li><strong>미수집 항목:</strong> 주민등록번호, 생년월일, 성별, 집 주소, 휴대전화번호, 위치정보 등 민감정보 일절 미수집</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <strong className="text-slate-900 dark:text-white">2. 교사/관리자 정보:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 dark:text-slate-300 pl-2">
                  <li><strong>필수 항목:</strong> 관리자 아이디, 암호화된 비밀번호, 소속 학교명, 교사명</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">3</span>
              제3조 (개인정보의 보유 및 이용 기간)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              1. 본 서비스는 학교 교육행사의 운영 및 통계 산출 기간 동안만 개인정보를 보유·이용합니다.<br />
              2. <strong>행사 종료 후 즉시 파기:</strong> 담당 교사는 행사 종료 즉시 [학생 관리] 및 [행사 관리] 메뉴에서 학생 명단과 참여 기록을 일괄 영구 삭제할 수 있습니다.<br />
              3. 학교의 별도 요청이 없는 경우, 당해 학년도 말(익년 2월 28일)에 이전 학년도의 모든 행사 참여 데이터는 일괄 영구 파기 처리됩니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">4</span>
              제4조 (만 14세 미만 아동의 개인정보 보호)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              1. 본 서비스는 만 14세 미만 아동의 개별 회원가입 절차를 일절 두지 않으며, 불필요한 개인 식별 정보의 입력을 요구하지 않습니다.<br />
              2. 초·중등학교의 교육과정 및 교내 행사를 위해 학교 관리교사가 학생 명단을 일괄 등록하여 식별용 QR 명찰을 교부하는 방식으로 운영되며, 이는 초·중등교육법 제23조 및 학교 교육계획에 의거하여 학교장의 승인 및 사전 가정통신/안내 절차에 따라 진행됩니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">5</span>
              제5조 (개인정보의 안전성 확보 조치)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              본 서비스는 개인정보의 분실, 도난, 유출, 위·변조 또는 훼손을 방지하기 위해 다음과 같은 기술적·관리적 보호대책을 강구하고 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-2">
              <li><strong>전송 구간 암호화:</strong> SSL/TLS(HTTPS) 표준 보안 통신망을 통해 데이터 송수신 구간을 상시 암호화합니다.</li>
              <li><strong>비밀번호 단방향 암호화:</strong> 교사 비밀번호는 최신 암호화 알고리즘으로 단방향 암호화되어 관리자도 원본을 확인할 수 없습니다.</li>
              <li><strong>행사 및 학교별 데이터 격리:</strong> Row Level Security(RLS) 및 멀티테넌트 접근 제어를 통해 타 학교 계정과의 데이터 접근을 원천 차단합니다.</li>
              <li><strong>침해사고 예방:</strong> 글로벌 엔터프라이즈 인프라를 통해 무단 접근 차단 및 실시간 감시 시스템을 유지합니다.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">6</span>
              제6조 (정보주체의 권리·의무 및 행사 방법)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              1. 학생 및 법정대리인은 언제든지 학교 관리교사를 통해 등록된 학생 개인정보의 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.<br />
              2. 학교 관리교사는 시스템 내 [학생 관리] 메뉴에서 언제든지 해당 학생의 정보를 즉시 수정하거나 완전히 삭제할 수 있으며, 삭제 시 연관된 참여 기록도 동반 파기됩니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">7</span>
              제7조 (개인정보의 제3자 제공에 관한 사항)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              본 서비스는 정보주체의 개인정보를 제1조에서 명시한 목적 범위 내에서만 처리하며, <strong>개인정보를 제3자에게 일절 제공하지 않습니다.</strong> 
              광고, 마케팅, 통계 판매 등 영리 목적의 활용은 기술적으로 완전히 배제되어 있습니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">8</span>
              제8조 (개인정보 처리의 위탁에 관한 사항)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              본 서비스는 안정적인 클라우드 컴퓨팅 및 데이터베이스 호스팅을 위하여 다음과 같이 전문 인프라 기업에 시스템 운영을 위탁하고 있습니다.
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-lg">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">수탁업체</th>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">위탁 업무 내용</th>
                    <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">보유 및 이용 기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Vercel Inc.</td>
                    <td className="p-2.5">웹 애플리케이션 프론트엔드 호스팅 및 전송 네트워크 제공</td>
                    <td className="p-2.5">서비스 계약 종료 또는 파기 시까지</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Supabase Inc.</td>
                    <td className="p-2.5">클라우드 데이터베이스 인프라 및 전송 데이터 암호화 보관</td>
                    <td className="p-2.5">서비스 계약 종료 또는 파기 시까지</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-black">9</span>
              제9조 (개인정보 보호책임자 및 담당 부서)
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-white">서비스명:</strong> 에듀페어 매니저 (EduFair Manager)</p>
              <p><strong className="text-slate-900 dark:text-white">시스템 관리자:</strong> 에듀페어 총괄 운영팀</p>
              <p><strong className="text-slate-900 dark:text-white">문의처:</strong> 시스템 내 설정 및 관리자 고객지원 창구</p>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
            본 개인정보 처리방침은 2026년 10월 6일부터 적용됩니다.
          </div>
        </div>
      </main>
    </div>
  );
}
