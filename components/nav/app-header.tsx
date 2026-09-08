"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth/current-user-context";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Logo } from "@/components/ui/logo";

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
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-gold bg-background/92 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <Logo size={26} className="shrink-0" />
        <span className="gold-gradient font-display text-base font-bold tracking-wide">CLUB 90s</span>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="hidden text-sm text-muted-foreground sm:inline">{user.fullName}</span>
        <button
          onClick={logout}
          disabled={loading}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-light disabled:opacity-60"
        >
          {loading ? "…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
