"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type MemberOption = { id: string; fullName: string };
type Sector = { id: string; name: string };
type ElectionRow = {
  id: string;
  title: string;
  sectorName: string;
  endAt: string;
  status: string;
  winningCandidateId: string | null;
};

export function ElectionManager({
  members,
  sectors,
  elections,
}: {
  members: MemberOption[];
  sectors: Sector[];
  elections: ElectionRow[];
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [eligibleIds, setEligibleIds] = useState<string[]>(members.map((m) => m.id));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/admin/elections", {
        method: "POST",
        body: JSON.stringify({
          sectorId,
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          candidateMemberIds: candidateIds,
          eligibleMemberIds: eligibleIds,
        }),
      });
      setTitle("");
      setCandidateIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(electionId: string) {
    const currentPassword = prompt("Re-enter your password to confirm this election result:");
    if (!currentPassword) return;
    try {
      const result = await apiFetch<{ stage: string }>(`/api/v1/admin/elections/${electionId}/confirm-result`, {
        method: "POST",
        body: JSON.stringify({ currentPassword }),
      });
      alert(result.stage === "first_confirmed" ? "First confirmation recorded. A different Admin must confirm again." : "Result confirmed — role granted.");
      router.refresh();
    } catch (err) {
      alert(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {elections.map((e) => (
          <Card key={e.id}>
            <p className="font-medium">{e.title}</p>
            <p className="text-sm text-muted-foreground">
              {e.sectorName} · {e.status} · ends {new Date(e.endAt).toLocaleDateString()}
            </p>
            {e.winningCandidateId ? (
              <p className="mt-1 text-sm text-success">Result confirmed.</p>
            ) : (
              Date.parse(e.endAt) < now && (
                <Button variant="secondary" className="mt-2" onClick={() => confirm(e.id)}>
                  Confirm result
                </Button>
              )
            )}
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium">New election</p>
        <form onSubmit={createElection} className="flex flex-col gap-3">
          <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25">
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Input placeholder="Title (e.g. Finance President 2027)" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Voting opens</span>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Voting closes</span>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </label>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">Candidates</p>
            <div className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0">
                  <input type="checkbox" checked={candidateIds.includes(m.id)} onChange={() => toggle(candidateIds, setCandidateIds, m.id)} />
                  {m.fullName}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">Eligible voters ({eligibleIds.length})</p>
            <div className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0">
                  <input type="checkbox" checked={eligibleIds.includes(m.id)} onChange={() => toggle(eligibleIds, setEligibleIds, m.id)} />
                  {m.fullName}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create election"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
