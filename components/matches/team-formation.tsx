"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Player = { id: string; fullName: string; position: string | null };
type TeamDraft = { name: string; memberIds: string[]; goalkeeperMemberId: string | null };

export function TeamFormation({
  matchId,
  players,
  initialTeams,
}: {
  matchId: string;
  players: Player[];
  initialTeams: TeamDraft[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamDraft[]>(
    initialTeams.length > 0 ? initialTeams : [
      { name: "Team A", memberIds: [], goalkeeperMemberId: null },
      { name: "Team B", memberIds: [], goalkeeperMemberId: null },
    ],
  );
  const [activeTeam, setActiveTeam] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"draft" | "publish" | null>(null);

  const assignedIds = new Set(teams.flatMap((t) => t.memberIds));
  const pool = players.filter((p) => !assignedIds.has(p.id));

  function assignToActiveTeam(playerId: string) {
    setTeams((prev) =>
      prev.map((t, i) => {
        const withoutPlayer = { ...t, memberIds: t.memberIds.filter((id) => id !== playerId) };
        if (i !== activeTeam) return withoutPlayer;
        return { ...withoutPlayer, memberIds: [...withoutPlayer.memberIds, playerId] };
      }),
    );
  }

  function unassign(playerId: string) {
    setTeams((prev) => prev.map((t) => ({ ...t, memberIds: t.memberIds.filter((id) => id !== playerId) })));
  }

  function toggleGoalkeeper(teamIndex: number, playerId: string) {
    setTeams((prev) =>
      prev.map((t, i) =>
        i === teamIndex ? { ...t, goalkeeperMemberId: t.goalkeeperMemberId === playerId ? null : playerId } : t,
      ),
    );
  }

  function shuffle() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const next: TeamDraft[] = teams.map((t) => ({ ...t, memberIds: [], goalkeeperMemberId: null }));
    shuffled.forEach((p, i) => {
      next[i % next.length].memberIds.push(p.id);
    });
    setTeams(next);
  }

  function addTeam() {
    setTeams((prev) => [...prev, { name: `Team ${String.fromCharCode(65 + prev.length)}`, memberIds: [], goalkeeperMemberId: null }]);
  }

  async function save(status: "draft" | "published") {
    setLoading(status === "draft" ? "draft" : "publish");
    setError(null);
    try {
      await apiFetch(`/api/v1/matches/${matchId}/teams`, {
        method: "POST",
        body: JSON.stringify({ teams, status }),
      });
      router.push(`/matches/${matchId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tap a team, then tap players to assign them.</p>
        <button onClick={shuffle} className="text-sm font-medium text-primary">
          Shuffle
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {teams.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTeam(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTeam === i ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            {t.name} ({t.memberIds.length})
          </button>
        ))}
        <button onClick={addTeam} className="rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground">
          + Add team
        </button>
      </div>

      {teams.map((t, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-3">
          <p className="mb-2 text-sm font-semibold">{t.name}</p>
          {t.memberIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {t.memberIds.map((id) => {
                const player = players.find((p) => p.id === id);
                if (!player) return null;
                const isGk = t.goalkeeperMemberId === id;
                return (
                  <div key={id} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm">
                    <button onClick={() => unassign(id)}>{player.fullName}</button>
                    <button
                      onClick={() => toggleGoalkeeper(i, id)}
                      className={isGk ? "text-primary" : "text-muted-foreground"}
                      title="Toggle goalkeeper"
                    >
                      GK
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div>
        <p className="mb-2 text-sm font-medium">Unassigned ({pool.length})</p>
        <div className="flex flex-wrap gap-2">
          {pool.map((p) => (
            <button
              key={p.id}
              onClick={() => assignToActiveTeam(p.id)}
              className="rounded-full bg-muted px-3 py-1.5 text-sm"
            >
              {p.fullName}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => save("draft")} disabled={loading !== null}>
          {loading === "draft" ? "Saving…" : "Save draft"}
        </Button>
        <Button onClick={() => save("published")} disabled={loading !== null}>
          {loading === "publish" ? "Publishing…" : "Publish teams"}
        </Button>
      </div>
    </div>
  );
}
