"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";

type Announcement = {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  publishedAt: string;
  author: { fullName: string };
};

export function Announcements({ canPublish }: { canPublish: boolean }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("General");
  const [loading, setLoading] = useState(false);

  function load() {
    apiFetch<{ announcements: Announcement[] }>("/api/v1/announcements").then((d) => setItems(d.announcements));
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/v1/announcements", { method: "POST", body: JSON.stringify({ title, description, type }) });
      setTitle("");
      setDescription("");
      load();
    } finally {
      setLoading(false);
    }
  }

  if (!items) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      {canPublish && (
        <Card>
          <p className="mb-2 text-sm font-medium">New announcement</p>
          <form onSubmit={submit} className="flex flex-col gap-2">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-base">
              {["General", "Match", "Tournament", "Finance", "Urgent", "Event"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details…"
              rows={3}
              className="rounded-lg border border-border bg-card px-3 py-2.5 text-base"
              required
            />
            <Button type="submit" disabled={loading}>
              Publish
            </Button>
          </form>
        </Card>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        items.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{a.title}</p>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary">{a.type}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.author.fullName} · {new Date(a.publishedAt).toLocaleDateString()}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
