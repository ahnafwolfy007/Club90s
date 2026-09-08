"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Election = {
  id: string;
  title: string;
  sectorName: string;
  startAt: string;
  endAt: string;
  status: string;
  candidates: { id: string; fullName: string }[];
  eligible: boolean;
  hasVoted: boolean;
  winningCandidateId: string | null;
};

export function ElectionList() {
  const [elections, setElections] = useState<Election[] | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<{ elections: Election[] }>("/api/v1/elections").then((data) => setElections(data.elections));
  }

  useEffect(load, []);

  async function vote(electionId: string, candidateId: string) {
    setVoting(candidateId);
    setError(null);
    try {
      await apiFetch(`/api/v1/elections/${electionId}/vote`, { method: "POST", body: JSON.stringify({ candidateId }) });
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setVoting(null);
    }
  }

  const [now] = useState(() => Date.now());

  if (!elections) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (elections.length === 0) return <p className="text-sm text-muted-foreground">No elections yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {elections.map((e) => {
        const isOpen = e.status === "open" && now >= Date.parse(e.startAt) && now <= Date.parse(e.endAt);
        return (
          <Card key={e.id}>
            <p className="font-medium">{e.title}</p>
            <p className="mb-2 text-sm text-muted-foreground">
              {e.sectorName} · {Date.parse(e.endAt) > now ? "Voting open until " : "Closed "}
              {new Date(e.endAt).toLocaleDateString()}
            </p>
            {!e.eligible ? (
              <p className="text-sm text-muted-foreground">You are not eligible to vote in this election.</p>
            ) : e.hasVoted ? (
              <p className="text-sm text-success">Your vote has been recorded. Thank you.</p>
            ) : isOpen ? (
              <div className="flex flex-col gap-2">
                {e.candidates.map((c) => (
                  <Button key={c.id} variant="secondary" disabled={voting !== null} onClick={() => vote(e.id, c.id)}>
                    {voting === c.id ? "Voting…" : `Vote for ${c.fullName}`}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Voting isn&rsquo;t open right now.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
