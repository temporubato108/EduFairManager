"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BoothData {
  event_id: string;
  name: string;
  description?: string;
  operator_id?: string | null;
}

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

/**
 * Fetch all active teachers for the operator assignment select box
 */
export async function getTeachersAction(): Promise<TeacherOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id, name, email")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

/**
 * Fetch all booths for a specific event with the operator (teacher) name joined
 */
export async function getBoothsAction(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booths")
    .select("*, operator:teachers(name)")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  
  // Format to flatten operator name for the frontend
  return (data || []).map((booth) => ({
    ...booth,
    operator_name: booth.operator ? (booth.operator as { name: string }).name : "미지정",
  }));
}

/**
 * Create a new booth
 */
export async function createBoothAction(data: BoothData) {
  const supabase = await createClient();
  const { data: newBooth, error } = await supabase
    .from("booths")
    .insert([data])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(newBooth.event_id, "create_booth", `부스 생성 완료: 이름='${newBooth.name}', 설명='${newBooth.description || ""}'`);

  revalidatePath("/booths");
  return { success: true, data: newBooth };
}

/**
 * Update an existing booth
 */
export async function updateBoothAction(id: string, data: Partial<BoothData>) {
  const supabase = await createClient();
  const { data: updatedBooth, error } = await supabase
    .from("booths")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(updatedBooth.event_id, "update_booth", `부스 수정 완료 (ID: ${id}): 이름='${updatedBooth.name}', 설명='${updatedBooth.description || ""}'`);

  revalidatePath("/booths");
  return { success: true, data: updatedBooth };
}

/**
 * Soft delete a booth
 */
export async function deleteBoothAction(id: string) {
  const supabase = await createClient();

  // Fetch details before soft delete to record event_id and name in logs
  const { data: targetBooth } = await supabase
    .from("booths")
    .select("event_id, name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("booths")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const { recordLogAction } = await import("@/app/logs/actions");
  await recordLogAction(
    targetBooth ? targetBooth.event_id : null,
    "delete_booth",
    `부스 삭제 완료: 이름='${targetBooth ? targetBooth.name : "알 수 없음"}' (ID: ${id})`
  );

  revalidatePath("/booths");
  return { success: true };
}

interface EventJoined {
  name: string;
  allow_double_participation: boolean;
}

interface OperatorJoined {
  name: string;
}

/**
 * Fetch booth details along with parent event policies, operator name, and participation counts
 */
export async function getBoothDetailAction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booths")
    .select("*, event:events(name, allow_double_participation), operator:teachers(name)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  // Fetch count of participations for this booth
  const { count, error: countError } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("booth_id", id);

  if (countError) {
    return { error: countError.message };
  }

  const eventData = data.event as unknown as EventJoined | null;
  const operatorData = data.operator as unknown as OperatorJoined | null;

  return {
    success: true,
    data: {
      id: data.id,
      event_id: data.event_id,
      name: data.name,
      description: data.description,
      operator_id: data.operator_id,
      created_at: data.created_at,
      event_name: eventData ? eventData.name : "알 수 없는 행사",
      allow_double_participation: eventData ? eventData.allow_double_participation : false,
      operator_name: operatorData ? operatorData.name : "미지정",
      participant_count: count || 0,
    },
  };
}
