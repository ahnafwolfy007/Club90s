"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth/current-user-context";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function AppHeader() {
  const user = useCurrentUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <span className="text-sm font-semibold">CLUB 90s</span>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="text-sm text-muted-foreground">{user.fullName}</span>
        <button onClick={logout} disabled={loading} className="text-sm font-medium text-primary disabled:opacity-60">
          {loading ? "…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
