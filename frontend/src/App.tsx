import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  api,
  type Category,
  type DisruptionEvent,
  type InsightResponse,
  type Notification,
} from "./api";
import { resolveEvent } from "./api";
import { LoginScreen } from "./pages/LoginScreen";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* Auth listener */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  /* Load household data on login */
  useEffect(() => {
    if (!session) return;
    api.getBudget().then((b) => setCategories(b.categories));
    api.listEvents().then((e) => setEvents(e.events));
    api.getNotifications().then((n) => {
      setNotifications(n.notifications);
      setUnreadCount(n.unread);
    });
  }, [session]);

  /* Auth gate */
  if (!session) return <LoginScreen />;

  /* Handlers */
  async function handleTrigger(eventType: "electricity" | "water") {
    setLoading(true);
    try {
      const event = await api.triggerEvent(eventType);
      setEvents((prev) => [event, ...prev]);
      const result = await api.getInsight(eventType);
      setInsight(result);
    } finally {
      setLoading(false);
    }
  }

  
  async function handleMarkNotificationsRead() {
    await api.markNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const handleResolve = async (eventId: string) => {
    if (!session) return;
    try {
        const updated = await resolveEvent(session, eventId);
        setEvents((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
        );
    } catch (err) {
        console.error("Resolve failed", err);
    }
    };

  async function handleSignOut() {
    await supabase.auth.signOut();
    setInsight(null);
    setCategories([]);
    setEvents([]);
    setNotifications([]);
    setUnreadCount(0);
  }

  const impactByCategory = new Map(
    insight?.impacts.map((i) => [i.category, i]) ?? []
  );

  /* Render */
  return (
    <>
        <header className="dashboard-header">
            <a href="/" className="dashboard-brand" aria-label="PrepWise home">
                <span>prep</span>
                <span className="dashboard-brand-green">Wise</span>
                <span className="dashboard-brand-dot" />
            </a>

            <div className="header-actions">
                <span className={`status-chip ${insight ? "alert" : ""}`}>
                    {insight
                    ? `${insight.event_type.toUpperCase()} ACTIVE`
                    : "ALL NORMAL"}
                </span>
                <button
                    type="button"
                    className="icon-button"
                    aria-label="Sign out"
                    onClick={handleSignOut}
                >
                    <i className="ti ti-logout" />
                </button>
            </div>
        </header>

        <Dashboard
            categories={categories}
            impactByCategory={impactByCategory}
            events={events}
            insight={insight}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            loading={loading}
            onTrigger={handleTrigger}
            onResolve={handleResolve}
        />
    </>
  );
}