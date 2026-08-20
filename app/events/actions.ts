"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseEventDetails, encodeEventDescription } from "@/lib/utils";

export interface EventData {
  name: string;
  description?: string;
  date: string;
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
      const { description } = parseEventDetails(e);
      return {
        ...e,
        description,
      };
    });

  return userEvents;
}

/**
 * Create a new event tagged with the creator's user_id
 */
export async function createEventAction(data: EventData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    ...data,
    description: encodeEventDescription(data.description, user?.id || null),
  };

  const { data: newEvent, error } = await supabase
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
  const { description } = parseEventDetails(newEvent);
  return { success: true, data: { ...newEvent, description } };
}

/**
 * Update an existing event
 */
export async function updateEventAction(id: string, data: Partial<EventData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const updatePayload: Record<string, unknown> = { ...data };
  if (data.description !== undefined) {
    updatePayload.description = encodeEventDescription(data.description, user?.id || null);
  }

  const { data: updatedEvent, error } = await supabase
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
  const { description } = parseEventDetails(updatedEvent);
  return { success: true, data: { ...updatedEvent, description } };
}

/**
 * Soft delete an event by setting its deleted_at timestamp
 */
export async function deleteEventAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
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
export async function duplicateEventAction(id: string, newName: string, newDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Retrieve the source event details
  const { data: sourceEvent, error: sourceError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceError) {
    return { error: `원본 행사를 찾을 수 없습니다: ${sourceError.message}` };
  }

  const { description: sourceCleanDesc } = parseEventDetails(sourceEvent);

  // 2. Create the duplicated event (set default status to 'ready')
  const newEventData = {
    name: newName,
    description: encodeEventDescription(sourceCleanDesc, user?.id || null),
    date: newDate,
    status: "ready" as const,
    allow_double_participation: sourceEvent.allow_double_participation,
    is_template: false,
  };

  const { data: newEvent, error: createError } = await supabase
    .from("events")
    .insert([newEventData])
    .select()
    .single();

  if (createError) {
    return { error: `행사 생성 실패: ${createError.message}` };
  }

  // 3. Retrieve associated booths from the source event
  const { data: sourceBooths, error: boothsError } = await supabase
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

    const { error: insertBoothsError } = await supabase
      .from("booths")
      .insert(newBooths);

    if (insertBoothsError) {
      return { error: `부스 복제 실패: ${insertBoothsError.message}` };
    }
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(newEvent.id, "duplicate_event", `행사 복제 완료: 원본='${id}' -> 신규='${newEvent.name}'`);

  revalidatePath("/events");
  const { description } = parseEventDetails(newEvent);
  return { success: true, data: { ...newEvent, description } };
}

/**
 * Save an existing event as a template (clones event + booths and marks is_template=true)
 */
export async function saveAsTemplateAction(id: string, templateName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Retrieve the source event details
  const { data: sourceEvent, error: sourceError } = await supabase
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
    description: encodeEventDescription(sourceCleanDesc, user?.id || null),
    date: new Date().toISOString().split("T")[0],
    status: "ready" as const,
    allow_double_participation: sourceEvent.allow_double_participation,
    is_template: true,
  };

  const { data: templateEvent, error: createError } = await supabase
    .from("events")
    .insert([templateEventData])
    .select()
    .single();

  if (createError) {
    return { error: `템플릿 등록 실패: ${createError.message}` };
  }

  // 3. Retrieve associated booths from the source event
  const { data: sourceBooths, error: boothsError } = await supabase
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

    const { error: insertBoothsError } = await supabase
      .from("booths")
      .insert(newBooths);

    if (insertBoothsError) {
      return { error: `부스 템플릿 등록 실패: ${insertBoothsError.message}` };
    }
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(templateEvent.id, "template_event", `행사 템플릿 저장 완료: 원본='${id}' -> 템플릿='${templateEvent.name}'`);

  revalidatePath("/events");
  return { success: true, data: templateEvent };
}
