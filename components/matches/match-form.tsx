"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type MatchFormInitial = {
  id: string;
  title: string;
  matchDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  venueName: string;
  venueAddress: string;
  fee: string;
  maxPlayers: string;
  rsvpDeadline: string; // datetime-local value
};

export function MatchForm({ initial }: { initial?: MatchFormInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [matchDate, setMatchDate] = useState(initial?.matchDate ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [venueName, setVenueName] = useState(initial?.venueName ?? "");
  const [venueAddress, setVenueAddress] = useState(initial?.venueAddress ?? "");
  const [fee, setFee] = useState(initial?.fee ?? "");
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers ?? "14");
  const [rsvpDeadline, setRsvpDeadline] = useState(initial?.rsvpDeadline ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title,
        matchDate,
        startTime: new Date(`${matchDate}T${startTime}`).toISOString(),
        venueName,
        venueAddress: venueAddress || undefined,
        fee: fee ? Number(fee) : undefined,
        maxPlayers: Number(maxPlayers),
        rsvpDeadline: new Date(rsvpDeadline).toISOString(),
      };
      const matchId = initial
        ? initial.id
        : (await apiFetch<{ match: { id: string } }>("/api/v1/matches", { method: "POST", body: JSON.stringify(payload) })).match.id;
      if (initial) {
        await apiFetch(`/api/v1/matches/${initial.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      router.push(`/matches/${matchId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday Night Match" required />
      </Field>
      <Field label="Match date">
        <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
      </Field>
      <Field label="Start time">
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
      </Field>
      <Field label="Venue name">
        <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} required />
      </Field>
      <Field label="Venue address (optional)">
        <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
      </Field>
      <Field label="Match fee (optional)">
        <Input type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
      </Field>
      <Field label="Max players">
        <Input type="number" min={2} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required />
      </Field>
      <Field label="RSVP deadline">
        <Input type="datetime-local" value={rsvpDeadline} onChange={(e) => setRsvpDeadline(e.target.value)} required />
      </Field>
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : initial ? "Save changes" : "Create match"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
