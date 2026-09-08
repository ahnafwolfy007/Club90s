"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";

type Achievement = { id: string; title: string; description: string | null; eventName: string | null; year: number | null };

export function AchievementsSection() {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [title, setTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    apiFetch<{ achievements: Achievement[] }>("/api/v1/achievements").then((d) => setAchievements(d.achievements));
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/v1/achievements", {
        method: "POST",
        body: JSON.stringify({ title, eventName: eventName || undefined, year: year ? Number(year) : undefined }),
      });
      setTitle("");
      setEventName("");
      setYear("");
      load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <p className="mb-2 text-sm font-medium">Achievements</p>
      {achievements === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : achievements.length === 0 ? (
        <p className="mb-2 text-sm text-muted-foreground">No achievements yet.</p>
      ) : (
        <div className="mb-2 flex flex-col gap-1">
          {achievements.map((a) => (
            <p key={a.id} className="text-sm">
              🏆 {a.title} {a.eventName && `— ${a.eventName}`} {a.year && `(${a.year})`}
            </p>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <Input placeholder="Title (e.g. Top Scorer)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input placeholder="Event (optional)" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        <Input placeholder="Year (optional)" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={loading || !title.trim()}>
          Add achievement
        </Button>
      </form>
    </Card>
  );
}
