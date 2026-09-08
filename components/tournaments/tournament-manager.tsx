"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type MemberOption = { id: string; fullName: string };
type PoolPlayer = { id: string; status: string; member: { fullName: string } };
type BidTeam = { id: string; teamName: string; remainingBudget: string; ownerMember: { fullName: string } };

export function TournamentManager({
  tournamentId,
  members,
  pool,
  teams,
}: {
  tournamentId: string;
  members: MemberOption[];
  pool: PoolPlayer[];
  teams: BidTeam[];
}) {
  const router = useRouter();
  const pooledIds = new Set(pool.map((p) => p.member.fullName));
  const [selected, setSelected] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [ownerId, setOwnerId] = useState(members[0]?.id ?? "");
  const [budget, setBudget] = useState("1000");
  const [minSquad, setMinSquad] = useState("5");
  const [maxSquad, setMaxSquad] = useState("11");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addPlayers() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/tournaments/${tournamentId}/players`, {
        method: "POST",
        body: JSON.stringify({ memberIds: selected }),
      });
      setSelected([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/api/v1/tournaments/${tournamentId}/teams`, {
        method: "POST",
        body: JSON.stringify({
          teamName,
          ownerMemberId: ownerId,
          startingBudget: Number(budget),
          minSquad: Number(minSquad),
          maxSquad: Number(maxSquad),
        }),
      });
      setTeamName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startBidding() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/tournaments/${tournamentId}/bidding/start`, { method: "POST" });
      router.push(`/tournaments/${tournamentId}/bidding`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <Card>
        <p className="mb-2 text-sm font-medium">Player pool ({pool.length})</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {pool.map((p) => (
            <span key={p.id} className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {p.member.fullName} · {p.status}
            </span>
          ))}
        </div>
        <div className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border">
          {members
            .filter((m) => !pooledIds.has(m.fullName))
            .map((m) => (
              <label key={m.id} className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => setSelected((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]))}
                />
                {m.fullName}
              </label>
            ))}
        </div>
        <Button variant="secondary" className="mt-2" disabled={selected.length === 0 || loading} onClick={addPlayers}>
          Add {selected.length || ""} to pool
        </Button>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Bidding teams ({teams.length})</p>
        <div className="mb-3 flex flex-col gap-1.5">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <span>
                {t.teamName} — {t.ownerMember.fullName}
              </span>
              <span className="text-muted-foreground">{t.remainingBudget}</span>
            </div>
          ))}
        </div>
        <form onSubmit={addTeam} className="flex flex-col gap-2">
          <Input placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-base">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input type="number" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <Input type="number" placeholder="Min squad" value={minSquad} onChange={(e) => setMinSquad(e.target.value)} />
            <Input type="number" placeholder="Max squad" value={maxSquad} onChange={(e) => setMaxSquad(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>
            Add team
          </Button>
        </form>
      </Card>

      <Button disabled={loading || pool.length === 0 || teams.length === 0} onClick={startBidding}>
        Start bidding
      </Button>
    </div>
  );
}
