"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

export function TournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numTeams, setNumTeams] = useState("4");
  const [format, setFormat] = useState("7v7");
  const [venue, setVenue] = useState("");
  const [startingBid, setStartingBid] = useState("50");
  const [bidIncrement, setBidIncrement] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { tournament } = await apiFetch<{ tournament: { id: string } }>("/api/v1/tournaments", {
        method: "POST",
        body: JSON.stringify({
          name,
          startDate,
          numTeams: Number(numTeams),
          format,
          venue: venue || undefined,
          startingBid: Number(startingBid),
          bidIncrement: Number(bidIncrement),
        }),
      });
      router.push(`/tournaments/${tournament.id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Start date">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </Field>
      <Field label="Number of teams">
        <Input type="number" min={2} value={numTeams} onChange={(e) => setNumTeams(e.target.value)} required />
      </Field>
      <Field label="Format">
        <Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="7v7" required />
      </Field>
      <Field label="Venue (optional)">
        <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
      </Field>
      <Field label="Starting bid">
        <Input type="number" min={0} value={startingBid} onChange={(e) => setStartingBid(e.target.value)} />
      </Field>
      <Field label="Bid increment">
        <Input type="number" min={1} value={bidIncrement} onChange={(e) => setBidIncrement(e.target.value)} />
      </Field>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create tournament"}
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
