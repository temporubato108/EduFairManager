const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Dependency-free .env.local parser
let supabaseUrl = "";
let supabaseServiceKey = "";

try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    envFile.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const [key, ...valParts] = trimmed.split("=");
      if (key && valParts.length > 0) {
        const val = valParts.join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key.trim() === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = val;
        if (key.trim() === "SUPABASE_SERVICE_ROLE_KEY") supabaseServiceKey = val;
      }
    });
  }
} catch (e) {
  console.error(".env.local 파일을 파싱하는 중 오류가 발생했습니다:", e.message);
}

if (!supabaseUrl || supabaseUrl.includes("placeholder-project") || !supabaseServiceKey || supabaseServiceKey.includes("placeholder")) {
  console.error("\n[오류] .env.local 파일에 실제 Supabase URL과 Service Role Key를 설정해 주세요.");
  console.log("위치: c:\\AntigravityWorkspace\\EduFairManager\\.env.local\n");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  const email = "admin@school.kr";
  const password = "password123!";
  const name = "관리자교사";

  console.log(`\n[안내] 관리자 계정 생성 시도 중... 이메일: ${email}`);

  // 1. Create User in auth.users via admin API
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      console.log("[안내] 이미 Auth에 가입된 계정입니다. 데이터베이스 프로필 연결을 진행합니다.");
    } else {
      console.error("[오류] Auth 계정 생성 실패:", authError.message);
      return;
    }
  }

  // Get user id (if created now, or fetch if already existed)
  let userId = authUser?.user?.id;
  if (!userId) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("[오류] 유저 목록 조회 실패:", listError.message);
      return;
    }
    const existingUser = users.users.find((u) => u.email === email);
    if (existingUser) {
      userId = existingUser.id;
    }
  }

  if (!userId) {
    console.error("[오류] 사용자 UID를 가져올 수 없습니다.");
    return;
  }

  // 2. Insert into teachers profile table
  const { error: dbError } = await supabase
    .from("teachers")
    .upsert({
      id: userId,
      email,
      name,
      role: "admin",
    }, { onConflict: "id" });

  if (dbError) {
    console.error("[오류] teachers 테이블 데이터 매핑 실패:", dbError.message);
  } else {
    console.log(`\n========================================`);
    console.log(`🎉 관리자 계정 생성 및 매핑 완료!`);
    console.log(`----------------------------------------`);
    console.log(`로그인 이메일: ${email}`);
    console.log(`로그인 비밀번호: ${password}`);
    console.log(`========================================`);
    console.log(`로컬 서버(/login)에서 위 계정으로 로그인해 주세요.\n`);
  }
}

createAdmin();
