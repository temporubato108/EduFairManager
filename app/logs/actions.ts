"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface LogEntry {
  id: string;
  eventId: string | null;
  operatorId: string | null;
  actionType: string;
  details: string;
  createdAt: string;
  operatorName: string;
  operatorEmail: string;
}

interface TeacherJoined {
  name: string;
  email: string;
}

interface LogRow {
  id: string;
  event_id: string | null;
  operator_id?: string | null;
  user_id?: string | null;
  action_type?: string | null;
  action?: string | null;
  details?: string | null;
  created_at: string;
  operator: unknown;
}

/**
 * Write a new audit log record safely (never throws or blocks calling actions)
 */
export async function recordLogAction(eventId: string | null, actionType: string, details: string) {
  try {
    const authClient = await createClient();
    const adminClient = createAdminClient();

    // Get current logged-in user profile id if available
    let currentUserId: string | null = null;
    try {
      const { data: { user } } = await authClient.auth.getUser();
      currentUserId = user ? user.id : null;
    } catch {
      // unauthenticated
    }

    // Try inserting with operator_id & action_type first
    const { error: err1 } = await adminClient.from("logs").insert({
      event_id: eventId,
      operator_id: currentUserId,
      action_type: actionType,
      details: details,
    });

    if (err1) {
      // Fallback insert for user_id & action column names
      await adminClient.from("logs").insert({
        event_id: eventId,
        user_id: currentUserId,
        action: actionType,
        details: typeof details === "string" ? details : JSON.stringify(details),
      });
    }

    return { success: true };
  } catch (err) {
    const errorObj = err as Error;
    console.error("Log recording error (ignored to preserve main workflow):", errorObj.message);
    return { success: false, error: errorObj.message };
  }
}

/**
 * Retrieve log records based on event, action type, and search queries
 */
export async function getLogsAction(
  eventId: string | "all" | "null",
  actionType: string | "all",
  searchQuery = ""
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("logs")
      .select("id, event_id, operator_id, user_id, action_type, action, details, created_at, operator:teachers(name, email)");

    // Event Filter
    if (eventId === "null") {
      query = query.is("event_id", null);
    } else if (eventId !== "all" && eventId) {
      query = query.eq("event_id", eventId);
    }

    // Action Type Filter
    if (actionType !== "all" && actionType) {
      query = query.or(`action_type.eq.${actionType},action.eq.${actionType}`);
    }

    // Keyword Search on details
    if (searchQuery.trim()) {
      query = query.ilike("details", `%${searchQuery.trim()}%`);
    }

    // Sort by newest first
    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

    if (error) {
      // Fallback simpler query if join or or condition fails
      const { data: fallbackData } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      const rows = (fallbackData || []) as unknown as LogRow[];
      return {
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          eventId: r.event_id,
          operatorId: r.operator_id || r.user_id || null,
          actionType: r.action_type || r.action || "LOG",
          details: r.details || "",
          createdAt: r.created_at,
          operatorName: "시스템/자동",
          operatorEmail: "",
        })),
      };
    }

    const rows = (data || []) as unknown as LogRow[];

    const logs: LogEntry[] = rows.map((r) => {
      const operatorData = r.operator as unknown as TeacherJoined | null;
      return {
        id: r.id,
        eventId: r.event_id,
        operatorId: r.operator_id || r.user_id || null,
        actionType: r.action_type || r.action || "LOG",
        details: r.details || "",
        createdAt: r.created_at,
        operatorName: operatorData ? operatorData.name : "시스템/자동",
        operatorEmail: operatorData ? operatorData.email : "",
      };
    });

    return { success: true, data: logs };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
