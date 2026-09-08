"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";

type BirthdayEntry = { id: string; fullName: string; month: number; day: number; daysAway: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Birthdays() {
  const [data, setData] = useState<{ today: BirthdayEntry[]; upcoming: BirthdayEntry[] } | null>(null);

  useEffect(() => {
    apiFetch<{ today: BirthdayEntry[]; upcoming: BirthdayEntry[] }>("/api/v1/members/birthdays").then(setData);
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-2 text-sm font-medium">Today 🎂</p>
        {data.today.length === 0 ? (
          <p className="text-sm text-muted-foreground">No birthdays today.</p>
        ) : (
          data.today.map((m) => (
            <p key={m.id} className="text-sm">
              {m.fullName}
            </p>
          ))
        )}
      </Card>
      <Card>
        <p className="mb-2 text-sm font-medium">Upcoming</p>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in the next 30 days.</p>
        ) : (
          data.upcoming.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.fullName}</span>
              <span className="text-muted-foreground">
                {MONTHS[m.month - 1]} {m.day}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
