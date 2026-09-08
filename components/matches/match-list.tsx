"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";

type MatchSummary = {
  id: string;
  title: string;
  matchDate: string;
  venueName: string;
  maxPlayers: number;
  confirmedCount: number;
  status: string;
};

export function MatchList({ matches }: { matches: MatchSummary[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {matches.map((m) => (
        <Link key={m.id} href={`/matches/${m.id}`}>
          <Card className="flex items-center justify-between active:bg-muted">
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(m.matchDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {" · "}
                {m.venueName}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
              {m.confirmedCount}/{m.maxPlayers}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
