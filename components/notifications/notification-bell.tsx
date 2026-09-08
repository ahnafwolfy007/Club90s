"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type Notification = { id: string; type: string; payload: Record<string, unknown>; readAt: string | null; createdAt: string };

function describe(n: Notification): string {
  switch (n.type) {
    case "waitlist_promoted":
      return `You're off the waitlist for "${n.payload.matchTitle}" — you're in!`;
    case "teams_published":
      return `Teams have been published for "${n.payload.matchTitle}".`;
    case "match_published":
      return `New match: "${n.payload.matchTitle}". RSVP now.`;
    case "payment_recorded":
      return `Payment recorded: ${n.payload.amount} for ${n.payload.category}.`;
    default:
      return n.type;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    apiFetch<{ notifications: Notification[]; unreadCount: number }>("/api/v1/notifications").then((d) => {
      setNotifications(d.notifications);
      setUnreadCount(d.unreadCount);
    });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
    }
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative rounded-full p-1.5" aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-danger-foreground">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
          {notifications.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="border-b border-border px-2 py-2 text-sm last:border-b-0">
                <p>{describe(n)}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
