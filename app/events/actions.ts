"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseEventDetails, encodeEventDescription } from "@/lib/utils";

export interface EventData {
  name: string;
  description?: string;
  date: string;
  end_date?: string;
  status: "ready" | "progress" | "end";
  allow_double_participation: boolean;
  is_template: boolean;
}

/**
 * Fetch all events that are not soft-deleted and belong to the logged-in user
 */
export async function getEventsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Filter events belonging to current logged-in user (or legacy admin test account)
  const isLegacyAdmin = user.email === "admin@school.kr" || user.id === "1b6e4ab3-e40b-4ad2-80bc-063271019707";

  const userEvents = (data || [])
    .filter((e) => {
      const { owner_id } = parseEventDetails(e);
      if (owner_id) {
        return owner_id === user.id;
      }
      // If no owner_id tag exists, only show to legacy admin account
      return isLegacyAdmin;
    })
    .map((e) => {
      const { description, startDate, endDate, formattedDate } = parseEventDetails(e);
      return {
        ...e,
        date: formattedDate || startDate,
        start_date: startDate,
        end_date: endDate || startDate,
        description,
      };
    });

  return userEvents;
}

/**
 * Create a new event tagged with the creator's user_id and optional date range
 */
export async function createEventAction(data: EventData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const startDate = data.date ? data.date.split(" ~ ")[0].trim() : new Date().toISOString().split("T")[0];
  const endDate = data.end_date || (data.date?.includes(" ~ ") ? data.date.split(" ~ ")[1].trim() : null);

  const payload = {
    name: data.name,
    description: encodeEventDescription(
      data.description,
      user.id,
      endDate && endDate !== startDate ? endDate : null
    ),
    date: startDate,
    status: data.status,
    allow_double_participation: data.allow_double_participation,
    is_template: data.is_template,
  };

  const adminSupabase = createAdminClient();
  const { data: newEvent, error } = await adminSupabase
    .from("events")
    .insert([payload])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(newEvent.id, "create_event", `행사 생성 완료: 이름='${newEvent.name}', 날짜='${newEvent.date}'`);

  revalidatePath("/events");
  const { description, startDate: sDate, endDate: eDate, formattedDate } = parseEventDetails(newEvent);
  return {
    success: true,
    data: {
      ...newEvent,
      date: formattedDate || sDate,
      start_date: sDate,
      end_date: eDate || sDate,
      description,
    },
  };
}

/**
 * Update an existing event
 */
export async function updateEventAction(id: string, data: Partial<EventData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.allow_double_participation !== undefined) updatePayload.allow_double_participation = data.allow_double_participation;
  if (data.is_template !== undefined) updatePayload.is_template = data.is_template;

  let startDate: string | undefined = undefined;
  if (data.date !== undefined) {
    startDate = data.date.split(" ~ ")[0].trim();
    updatePayload.date = startDate;
  }

  if (data.description !== undefined || data.end_date !== undefined || data.date !== undefined) {
    const endDate = data.end_date !== undefined ? data.end_date : (data.date?.includes(" ~ ") ? data.date.split(" ~ ")[1].trim() : null);
    updatePayload.description = encodeEventDescription(
      data.description,
      user.id,
      endDate && endDate !== startDate ? endDate : null
    );
  }

  const adminSupabase = createAdminClient();
  const { data: updatedEvent, error } = await adminSupabase
    .from("events")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(id, "update_event", `행사 정보 수정 완료: 이름='${updatedEvent.name}', 상태='${updatedEvent.status}'`);

  revalidatePath("/events");
  const { description, startDate: sDate, endDate: eDate, formattedDate } = parseEventDetails(updatedEvent);
  return {
    success: true,
    data: {
      ...updatedEvent,
      date: formattedDate || sDate,
      start_date: sDate,
      end_date: eDate || sDate,
      description,
    },
  };
}

/**
 * Soft delete an event by setting its deleted_at timestamp
 */
export async function deleteEventAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(id, "delete_event", `행사 삭제 완료 (ID: ${id})`);

  revalidatePath("/events");
  return { success: true };
}

/**
 * Duplicate an event and all its associated booths
 */
export async function duplicateEventAction(
  id: string,
  newName: string,
  newDate: string,
  newEndDate?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminSupabase = createAdminClient();

  // 1. Retrieve the source event details
  const { data: sourceEvent, error: sourceError } = await adminSupabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceError) {
    return { error: `원본 행사를 찾을 수 없습니다: ${sourceError.message}` };
  }

  const { description: sourceCleanDesc } = parseEventDetails(sourceEvent);

  const startDate = newDate ? newDate.split(" ~ ")[0].trim() : new Date().toISOString().split("T")[0];
  const endDate = newEndDate || (newDate?.includes(" ~ ") ? newDate.split(" ~ ")[1].trim() : null);

  // 2. Create the duplicated event (set default status to 'ready')
  const newEventData = {
    name: newName,
    description: encodeEventDescription(
      sourceCleanDesc,
      user.id,
      endDate && endDate !== startDate ? endDate : null
    ),
    date: startDate,
    status: "ready" as const,
    allow_double_participation: sourceEvent.allow_double_participation,
    is_template: false,
  };

  const { data: newEvent, error: createError } = await adminSupabase
    .from("events")
    .insert([newEventData])
    .select()
    .single();

  if (createError) {
    return { error: `행사 생성 실패: ${createError.message}` };
  }

  // 3. Retrieve associated booths from the source event
  const { data: sourceBooths, error: boothsError } = await adminSupabase
    .from("booths")
    .select("*")
    .eq("event_id", id)
    .is("deleted_at", null);

  if (boothsError) {
    return { error: `원본 부스를 불러올 수 없습니다: ${boothsError.message}` };
  }

  // 4. Duplicate the booths to the new event
  if (sourceBooths && sourceBooths.length > 0) {
    const newBooths = sourceBooths.map((booth) => ({
      event_id: newEvent.id,
      name: booth.name,
      description: booth.description,
      operator_id: booth.operator_id,
    }));

    const { error: insertBoothsError } = await adminSupabase
      .from("booths")
      .insert(newBooths);

    if (insertBoothsError) {
      return { error: `부스 복제 실패: ${insertBoothsError.message}` };
    }
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(newEvent.id, "duplicate_event", `행사 복제 완료: 원본='${id}' -> 신규='${newEvent.name}'`);

  revalidatePath("/events");
  const { description, startDate: sDate, endDate: eDate, formattedDate } = parseEventDetails(newEvent);
  return {
    success: true,
    data: {
      ...newEvent,
      date: formattedDate || sDate,
      start_date: sDate,
      end_date: eDate || sDate,
      description,
    },
  };
}

/**
 * Save an existing event as a template (clones event + booths and marks is_template=true)
 */
export async function saveAsTemplateAction(id: string, templateName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminSupabase = createAdminClient();

  // 1. Retrieve the source event details
  const { data: sourceEvent, error: sourceError } = await adminSupabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceError) {
    return { error: `원본 행사를 찾을 수 없습니다: ${sourceError.message}` };
  }

  const { description: sourceCleanDesc } = parseEventDetails(sourceEvent);

  // 2. Create the template event record
  const templateEventData = {
    name: templateName,
    description: encodeEventDescription(sourceCleanDesc, user.id),
    date: new Date().toISOString().split("T")[0],
    status: "ready" as const,
    allow_double_participation: sourceEvent.allow_double_participation,
    is_template: true,
  };

  const { data: templateEvent, error: createError } = await adminSupabase
    .from("events")
    .insert([templateEventData])
    .select()
    .single();

  if (createError) {
    return { error: `템플릿 등록 실패: ${createError.message}` };
  }

  // 3. Retrieve associated booths from the source event
  const { data: sourceBooths, error: boothsError } = await adminSupabase
    .from("booths")
    .select("*")
    .eq("event_id", id)
    .is("deleted_at", null);

  if (boothsError) {
    return { error: `원본 부스를 불러올 수 없습니다: ${boothsError.message}` };
  }

  // 4. Duplicate the booths to the template event
  if (sourceBooths && sourceBooths.length > 0) {
    const newBooths = sourceBooths.map((booth) => ({
      event_id: templateEvent.id,
      name: booth.name,
      description: booth.description,
      operator_id: booth.operator_id,
    }));

    const { error: insertBoothsError } = await adminSupabase
      .from("booths")
      .insert(newBooths);

    if (insertBoothsError) {
      return { error: `템플릿 부스 등록 실패: ${insertBoothsError.message}` };
    }
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(templateEvent.id, "template_event", `행사 템플릿 저장 완료: 원본='${id}' -> 템플릿='${templateEvent.name}'`);

  revalidatePath("/events");
  return { success: true, data: templateEvent };
}

/**
 * Generate a complete, ready-to-test sample event with 6 booths and 10 students
 */
export async function createSampleEventAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. Create sample event
  const eventDesc = `<!--owner:${user.id}--><!--end_date:${today}-->에듀페어 매니저 기능 테스트 및 시연을 위해 자동 생성된 표준 샘플 행사입니다.`;
  const { data: sampleEvent, error: eventError } = await adminSupabase
    .from("events")
    .insert([
      {
        name: "2026 에듀페어 체험전 (샘플)",
        description: eventDesc,
        date: today,
        status: "progress",
        allow_double_participation: true,
        is_template: false,
      },
    ])
    .select()
    .single();

  if (eventError || !sampleEvent) {
    return { error: `샘플 행사 생성 실패: ${eventError?.message || "알 수 없는 오류"}` };
  }

  // 2. Insert 6 popular booths
  const sampleBooths = [
    {
      event_id: sampleEvent.id,
      name: "🚁 드론 정밀 조종 챌린지",
      description: "<!--operator:정보부장-->장애물 링을 통과하여 정밀 착륙 지점에 안착하는 비행 미션",
    },
    {
      event_id: sampleEvent.id,
      name: "🤖 인공지능 로봇 코딩 체험",
      description: "<!--operator:수학선생님-->블록 코딩으로 자율주행 알고리즘을 설계하고 라인트레이서 레이싱 대결",
    },
    {
      event_id: sampleEvent.id,
      name: "🎨 3D 펜 나만의 키링 공작소",
      description: "<!--operator:미술선생님-->친환경 PLA 필라멘트를 이용해 나만의 캐릭터 입체 키링 제작",
    },
    {
      event_id: sampleEvent.id,
      name: "🥽 VR 우주 탐사 가상현실 어트랙션",
      description: "<!--operator:과학선생님-->HMD 가상현실 장비를 착용하고 우주정거장과 달 표면 탐사",
    },
    {
      event_id: sampleEvent.id,
      name: "🧪 신비한 화학 반응 실험실",
      description: "<!--operator:물리선생님-->드라이아이스 안개 대포와 자외선 형광 슬라임 만들기 반응 체험",
    },
    {
      event_id: sampleEvent.id,
      name: "🎭 페이스 페인팅 & 캐리커처",
      description: "<!--operator:동아리회장-->축제 기분을 만끽하는 캐릭터 페이스 페인팅 및 1분 크로키 캐리커처",
    },
  ];

  await adminSupabase.from("booths").insert(sampleBooths);

  // 3. Insert 10 sample students
  const sampleStudents = [
    { event_id: sampleEvent.id, student_number: "1-1-1", name: "김체험" },
    { event_id: sampleEvent.id, student_number: "1-1-2", name: "이디지털" },
    { event_id: sampleEvent.id, student_number: "1-1-3", name: "박드론" },
    { event_id: sampleEvent.id, student_number: "1-2-1", name: "최코딩" },
    { event_id: sampleEvent.id, student_number: "1-2-2", name: "정로봇" },
    { event_id: sampleEvent.id, student_number: "2-1-1", name: "강메타" },
    { event_id: sampleEvent.id, student_number: "2-1-2", name: "조가상" },
    { event_id: sampleEvent.id, student_number: "2-2-1", name: "윤인공" },
    { event_id: sampleEvent.id, student_number: "3-1-1", name: "장지능" },
    { event_id: sampleEvent.id, student_number: "3-1-2", name: "한미래" },
  ];

  await adminSupabase.from("students").insert(sampleStudents);

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(sampleEvent.id, "create_event", "원클릭 샘플 행사 자동 생성 (부스 6개, 학생 10명 등록)");

  revalidatePath("/events");
  revalidatePath("/booths");
  revalidatePath("/students");
  return { success: true, data: sampleEvent };
}
