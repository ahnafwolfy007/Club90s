"use client";

import { useState } from "react";
import { Feed } from "@/components/community/feed";
import { Announcements } from "@/components/community/announcements";
import { Birthdays } from "@/components/community/birthdays";

const TABS = ["Feed", "Announcements", "Birthdays"] as const;
type Tab = (typeof TABS)[number];

export function CommunityTabs({ canModerate, canPublish }: { canModerate: boolean; canPublish: boolean }) {
  const [tab, setTab] = useState<Tab>("Feed");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Feed" && <Feed canModerate={canModerate} />}
      {tab === "Announcements" && <Announcements canPublish={canPublish} />}
      {tab === "Birthdays" && <Birthdays />}
    </div>
  );
}
