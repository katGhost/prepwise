import { supabase } from "./lib/supabase";

export type Category = {
  category: string;
  limit_amount: number;
  spent_amount: number;
};

export type CategoryImpact = {
  category: string;
  limit_amount: number;
  spent_amount: number;
  remaining_before: number;
  projected_extra_spend: number;
  projected_remaining_after: number;
  pct_of_remaining_consumed: number;
  severity: "low" | "moderate" | "high";
  rationale: string;
  recommended_action: string;
};

export type InsightResponse = {
  event_type: "electricity" | "water";
  household_id: string;
  highest_severity: "low" | "moderate" | "high";
  impacts: CategoryImpact[];
  insight: { text: string; source: "cache" | "template" | "live" };
};

export type DisruptionEvent = {
  id: string;
  household_id: string;
  type: "electricity" | "water";
  status: string;
  created_at: string;
};

export type Notification = {
  id: string;
  household_id: string;
  message: string;
  source_area: string;
  read: boolean;
  created_at: string;
};

export type AreaOption = {
  id: string;
  name: string;
};

// auth header helper
async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// api calls — no id params anywhere
export const api = {
  getHousehold: async () => {
    const headers = await authHeaders();
    return fetch("/api/household/me", { headers }).then((r) =>
      json<{ id: string; name: string }>(r)
    );
  },

  getBudget: async () => {
    const headers = await authHeaders();
    return fetch("/api/household/me/budget", { headers }).then((r) =>
      json<{ household_id: string; categories: Category[] }>(r)
    );
  },

  listEvents: async () => {
    const headers = await authHeaders();
    return fetch("/api/events/me", { headers }).then((r) =>
      json<{ events: DisruptionEvent[] }>(r)
    );
  },

  triggerEvent: async (eventType: "electricity" | "water") => {
    const headers = await authHeaders();
    return fetch("/api/events/trigger", {
      method: "POST",
      headers,
      body: JSON.stringify({ event_type: eventType }),
    }).then((r) => json<DisruptionEvent>(r));
  },

  getInsight: async (eventType: "electricity" | "water") => {
    const headers = await authHeaders();
    return fetch("/api/insights", {
      method: "POST",
      headers,
      body: JSON.stringify({ event_type: eventType }),
    }).then((r) => json<InsightResponse>(r));
  },
   getAreas: async () => {
    return fetch("/api/areas/").then((r) =>
      json<{ areas: AreaOption[] }>(r)
    );
  },

  setArea: async (area_id: string) => {
    const headers = await authHeaders();
    return fetch("/api/areas/me", {
      method: "POST",
      headers,
      body: JSON.stringify({ area_id }),
    }).then((r) => json<{ ok: boolean; area_id: string }>(r));
  },

  getNotifications: async () => {
    const headers = await authHeaders();
    return fetch("/api/notifications/me", { headers }).then((r) =>
      json<{ notifications: Notification[]; unread: number }>(r)
    );
  },

  markNotificationsRead: async () => {
    const headers = await authHeaders();
    return fetch("/api/notifications/read", { method: "POST", headers }).then(
      (r) => json<{ ok: boolean }>(r)
    );
  },
};