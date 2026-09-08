"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type BiddingState = {
  tournamentStatus: string;
  currentPlayer: { id: string; member: { fullName: string; position: string | null }; status: string } | null;
  currentBidDeadline: string | null;
  startingBid: string;
  bidIncrement: string;
  highestBid: { amount: string; teamId: string; teamName: string } | null;
  teams: { id: string; teamName: string; ownerName: string; remainingBudget: string }[];
};

const POLL_MS = 2500;

export function LiveBidding({ tournamentId, myTeamId }: { tournamentId: string; myTeamId: string | null }) {
  const [state, setState] = useState<BiddingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bidding, setBidding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await apiFetch<BiddingState>(`/api/v1/tournaments/${tournamentId}/bidding/state`);
        if (!cancelled) setState(data);
      } catch {
        // transient poll failure — next tick will retry
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tournamentId]);

  // Drives the visible countdown between polls — the server clock (via
  // currentBidDeadline from the last poll) stays authoritative either way.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function bid(amount: number) {
    setBidding(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/tournaments/${tournamentId}/bids`, {
        method: "POST",
        body: JSON.stringify({ tournamentTeamId: myTeamId, amount, clientRequestId: requestIdRef.current }),
      });
      requestIdRef.current = crypto.randomUUID();
      const data = await apiFetch<BiddingState>(`/api/v1/tournaments/${tournamentId}/bidding/state`);
      setState(data);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setBidding(false);
    }
  }

  if (!state) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!state.currentPlayer) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          {state.tournamentStatus === "completed" ? "Bidding has finished." : "Bidding hasn't started yet."}
        </p>
      </Card>
    );
  }

  const minNext = state.highestBid ? Number(state.highestBid.amount) + Number(state.bidIncrement) : Number(state.startingBid);
  const secondsLeft = state.currentBidDeadline ? Math.max(0, Math.round((Date.parse(state.currentBidDeadline) - now) / 1000)) : 0;
  const myTeam = state.teams.find((t) => t.id === myTeamId);

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-sm text-muted-foreground">Now auctioning</p>
        <p className="text-xl font-semibold">{state.currentPlayer.member.fullName}</p>
        {state.currentPlayer.member.position && <p className="text-sm text-muted-foreground">{state.currentPlayer.member.position}</p>}
        <p className="mt-2 text-2xl font-bold text-primary">{secondsLeft}s</p>
        <p className="mt-2 text-sm">
          Highest bid: <span className="font-semibold">{state.highestBid ? `${state.highestBid.amount} (${state.highestBid.teamName})` : "None yet"}</span>
        </p>
      </Card>

      {myTeamId && myTeam && (
        <Card>
          <p className="mb-2 text-sm text-muted-foreground">Your budget: {myTeam.remainingBudget}</p>
          <div className="flex gap-2">
            <Button disabled={bidding || minNext > Number(myTeam.remainingBudget)} onClick={() => bid(minNext)}>
              {bidding ? "Bidding…" : `Bid ${minNext}`}
            </Button>
            <Button
              variant="secondary"
              disabled={bidding || minNext + Number(state.bidIncrement) > Number(myTeam.remainingBudget)}
              onClick={() => bid(minNext + Number(state.bidIncrement))}
            >
              Bid {minNext + Number(state.bidIncrement)}
            </Button>
          </div>
          {error && <p className="mt-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-medium">Teams</p>
        <div className="flex flex-col gap-1.5">
          {state.teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <span>
                {t.teamName} — {t.ownerName}
              </span>
              <span className="text-muted-foreground">{t.remainingBudget}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
