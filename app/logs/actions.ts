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
export async function recordLogAction(
  eventId: string | null,
  actionType: string,
  details: string,
  explicitUserId?: string | null
) {
  try {
    const authClient = await createClient();
    const adminClient = createAdminClient();

    let currentUserId: string | null = explicitUserId || null;
    if (!currentUserId) {
      try {
        const { data: { user } } = await authClient.auth.getUser();
        currentUserId = user ? user.id : null;
      } catch {
        // unauthenticated
      }
    }

    const payload = {
      event_id: eventId || null,
      user_id: currentUserId,
      action: actionType,
      details: typeof details === "string" ? details : JSON.stringify(details),
    };

    const { error } = await adminClient.from("logs").insert(payload);
    if (error) {
      console.error("Log recording error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorObj = err as Error;
    console.error("Log recording error (ignored to preserve main workflow):", errorObj.message);
    return { success: false, error: errorObj.message };
  }
}

/**
 * Retrieve log records based on event, action type, and search queries strictly isolated to the logged-in user
 */
export async function getLogsAction(
  eventId: string | "all" | "null",
  actionType: string | "all",
  searchQuery = ""
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: true, data: [] };

    const adminSupabase = createAdminClient();

    // 1. Fetch user's own events to determine accessible event IDs
    const { getEventsAction } = await import("@/app/events/actions");
    const userEvents = await getEventsAction();
    const userEventIds = userEvents.map((e) => e.id);

    // 2. Query logs using adminSupabase with exact database columns
    let query = adminSupabase
      .from("logs")
      .select("id, event_id, user_id, action, details, created_at");

    // Multi-tenant isolation:
    // A user can ONLY see:
    // - Logs where user_id = user.id (actions they performed)
    // - OR logs where event_id is one of their own events (userEventIds)
    if (eventId === "null") {
      query = query.is("event_id", null).eq("user_id", user.id);
    } else if (eventId !== "all" && eventId) {
      // Specific event selected: MUST belong to this user
      if (!userEventIds.includes(eventId)) {
        return { success: true, data: [] };
      }
      query = query.eq("event_id", eventId);
    } else {
      // eventId === "all"
      if (userEventIds.length > 0) {
        query = query.or(`event_id.in.(${userEventIds.join(",")}),user_id.eq.${user.id}`);
      } else {
        query = query.eq("user_id", user.id);
      }
    }

    // Action Type Filter
    if (actionType !== "all" && actionType) {
      query = query.eq("action", actionType);
    }

    // Keyword Search on details
    if (searchQuery.trim()) {
      query = query.ilike("details", `%${searchQuery.trim()}%`);
    }

    // Sort by newest first
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(300);

    if (error) {
      console.error("Logs query error:", error.message);
      return { success: false, error: error.message };
    }

    const logList = (rows || []) as unknown as {
      id: string;
      event_id: string | null;
      user_id: string | null;
      action: string;
      details: unknown;
      created_at: string;
    }[];

    // 3. Collect unique user IDs to map names & emails safely in memory
    const userIds = Array.from(
      new Set(
        logList
          .map((r) => r.user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const teacherMap: Record<string, { name: string; email: string }> = {};

    if (userIds.length > 0) {
      const { data: teacherProfiles } = await adminSupabase
        .from("teachers")
        .select("id, name, email")
        .in("id", userIds);

      (teacherProfiles || []).forEach((t) => {
        teacherMap[t.id] = { name: t.name, email: t.email };
      });
    }

    const currentUserName = user.user_metadata?.name || user.email?.split("@")[0] || "관리자";
    const currentUserEmail = user.email || "";

    const logs: LogEntry[] = logList.map((r) => {
      const opId = r.user_id || null;
      let opName = "시스템/자동";
      let opEmail = "";

      if (opId && teacherMap[opId]) {
        opName = teacherMap[opId].name;
        opEmail = teacherMap[opId].email;
      } else if (opId === user.id) {
        opName = currentUserName;
        opEmail = currentUserEmail;
      }

      let detailText = "";
      if (typeof r.details === "string") {
        detailText = r.details;
      } else if (r.details) {
        detailText = JSON.stringify(r.details);
      }

      return {
        id: r.id,
        eventId: r.event_id,
        operatorId: opId,
        actionType: r.action || "LOG",
        details: detailText,
        createdAt: r.created_at,
        operatorName: opName,
        operatorEmail: opEmail,
      };
    });

    return { success: true, data: logs };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message };
  }
}
