# 🎡 EduFair Manager (에듀페어 모바일 축제 관리 시스템)

EduFair Manager는 초·중·고등학교 축제 및 과학 행사에서 부스 운영, 참여 기록 태깅, 실시간 통계 모니터링, 그리고 학생용 디지털 스탬프북 및 랭킹 명예의 전당 보드를 모바일에 특화된 반응형 UI로 통합 관리할 수 있는 종합 축제 관리 웹 어플리케이션입니다.

---

## 🚀 주요 기능 (Key Features)

1. **🔐 로그인 및 권한 관리 (Supabase Auth & Middleware Guard)**:
   - 교사 계정별 역할 구분: `admin` (총괄 관리자), `operator` (부스 운영 교사).
   - 미인가 사용자 및 교사 등급별 접근 권한 미들웨어 가드 (`/kiosk` 및 `/login` 상호 이탈 제어).
   - 실제 로그인한 교사 프로필 이름과 역할을 실시간 연동하여 대시보드 헤더에 표출.

2. **📅 행사 관리 (Event CRUD, Templates & Duplication)**:
   - 행사 생성/수정/삭제 및 무제한 깊은 복제(Deep Copy) 기능.
   - 자주 열리는 규격의 행사를 `템플릿`으로 등록하여 재사용 가능.
   - 행사별 상태 관리 (`준비`, `진행`, `종료`) 및 중복 참여 제한(동일 부스 다회 참여 허용/금지) 정책 지정.

3. **🎪 부스 관리 및 QR 안내판 일괄 인쇄 (Booth CRUD & PDF Generator)**:
   - 행사별 체험 부스 개설, 담당 운영교사 매핑, 설명 편집.
   - **[A4 부스 안내판 일괄 PDF 다운로드]**: 개별 부스의 키오스크 스캐너 페이지로 직접 연결되는 대형 QR 안내문 포스터 일괄 빌드.

4. **🧑‍🎓 학생 명단 관리 및 QR 카드 일괄 인쇄 (Student CRUD & Excel Import)**:
   - 학년, 반, 번호, 이름이 포함된 엑셀 파일을 일괄 업로드하여 고속 학생 DB 등록.
   - **[학생 식별 QR 카드 PDF 다운로드]**: 한 장의 A4 용지에 3x4 격자(총 12칸) 절취선 가이드라인이 기미된 학생용 인식 태그 카드 일괄 빌드.

5. **📷 QR 키오스크 스캐너 운영 모드 (QR Kiosk Mode & Sound Effects)**:
   - 부스 입구에 거치하여 학생 QR 코드를 카메라로 신속 스캔.
   - 스캔 성공 시 삑(Beep) 효과음 재생 및 확인 모달 클릭 없이 **3초 알림 후 즉시 카메라 자동 재시작** 루프 구동.
   - 동일 QR 코드에 대해 2초간 재인식 방지 락(Lock) 설계.

6. **📈 관리자 라이브 대시보드 (Live Admin Dashboard)**:
   - 3초 주기 자동 폴링 기반 당일 라이브 4대 지표(전체 학생, 참가 학생, 참여 횟수, 평균 참여율) 집계.
   - 실시간 부스 순위 차트 및 초 단위 최신 스캔 활동 로그 타임라인 스트림 피드.

7. **📊 종합 통계 및 다중 시트 엑셀 출력 (Statistics & Recharts & SheetJS)**:
   - 전체 / 학년-학반별 / 부스별 / 학생별 4대 탭 통계 데이터 테이블 및 Recharts 수평 막대/파이 차트 시각화.
   - **[종합 엑셀 다운로드]**: 학교 보관용 `부스별 실적`, `학생별 현황`, `전체 원본 로그`를 3개의 탭으로 분리 구성한 통합문서 일괄 익스포트.

8. **📱 학생 디지털 스탬프북 및 리더보드 (Student Stampbook & Hall of Fame)**:
   - 모바일 디바이스에 최적화된 반응형 뷰. URL `?code=eventId:studentId` 매핑 접속 지원.
   - 완주 비율 게이지 바 표시 및 도장 뱃지 그리드 (체험 완료 시 네온 그린 체크와 완료 시각 기재, 미체험 시 반투명 점선 자물쇠 잠금).
   - **[5초 자동 실시간 갱신 & 아르페지오 소리 알림]**: 현장에서 교사가 QR을 찍어주면 학생 화면에서 5초 주기로 스탬프가 자동 적립되며 주파수 아르페지오 축하 효과음이 흘러나옵니다.
   - **[명예의 전당]**: 누적 스탬프가 많은 Top 10 학생 명단을 동률 기준에 맞춰 리스트업하고, 본인 랭킹이 있으면 네온 시안 테두리로 강조하여 몰입감 유도.

9. **🛡️ 감사 로그 시스템 (Live Audit Logs & Export)**:
   - 로그인, 행사/부스/학생 CRUD, 부스 템플릿 복제, 키오스크 태그(성공/실패) 등의 모든 관리 행동을 책임 교사 계정과 결합해 영구 기록.
   - 감사용 로그 엑셀 다운로드 지원.

10. **⚙️ 시스템 환경 설정 (Administration Settings)**:
    - 학교명 및 학교 로고 이미지(Base64 문자열 직렬화로 DB 보관) 업로드 및 전역 레이아웃 실시간 동기화.
    - 기본 QR 인쇄 크기(px), 키오스크 효과음 기본 상태 설정 및 신규 행사 중복 참여 기본 정책 지정.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: Next.js 15.0 (App Router), React 19, TypeScript, TailwindCSS, Lucide Icons, Shadcn UI
- **Backend & Database**: Supabase (Auth, PostgreSQL DB, Row Level Security)
- **Libraries**:
  - `pdf-lib` & `@pdf-lib/fontkit` (한글 나눔고딕 폰트 적용 QR PDF 빌더)
  - `xlsx` (SheetJS 다중 시트 엑셀 다운로드)
  - `recharts` (실시간 통계 데이터 시각화 차트)
  - `html5-qrcode` (HTML5 모바일 웹 브라우저 카메라 QR 스캔 라이브러리)

---

## ⚙️ 로컬 개발 환경 설정 (Local Development)

### 1. 환경 변수 구성
프로젝트 루트 폴더에 `.env.local` 파일을 생성하고 아래 Supabase 접속 정보를 할당합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. 패키지 설치 및 개발 서버 실행
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev
```
서버 실행 후 브라우저에서 `http://localhost:3000`으로 접속할 수 있습니다.

---

## 🗄️ 데이터베이스 스키마 및 SQL 임포트

Supabase 대시보드의 **SQL Editor**에 프로젝트 루트에 제공된 `supabase_schema.sql` 소스코드를 붙여넣고 실행해 주십시오.

### 테이블 명세 및 필수 RLS 설정
- **`events`**: 행사 기본 정보, 상태, 템플릿 설정, 중복참여 설정 보관.
- **`teachers`**: 교사 목록 및 역할(`admin`/`operator`) 관리.
- **`booths`**: 체험 부스 명세 및 담당 교사 매핑.
- **`students`**: 학년/반/번호 학번 정보 및 QR 태그 키(UUID) 보관.
- **`participations`**: 스캔 성공 완료 도장 이력 보관.
- **`logs`**: 시스템 보안 감사 조작 기록 보관.
- **`settings`**: 학교명, 학교 로고 Base64 등 전역 설정 보관.

### 초기 관리자 계정 생성 가이드
Supabase SQL을 적용한 뒤, **Supabase Auth** 메뉴에서 `admin@school.kr` 등 관리자 교사 계정을 가입시킨 후 `teachers` 테이블의 `role` 컬럼 값을 `"admin"`으로 지정해야 감사자 화면 진입이 활성화됩니다.
