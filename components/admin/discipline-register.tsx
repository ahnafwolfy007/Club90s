"use client";

import { useEffect, useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type PenaltyType = "warning" | "match_suspension" | "fine" | "membership_revoked";

type Record_ = {
  id: string;
  type: PenaltyType;
  reason: string;
  clause: string | null;
  matchesSuspended: number | null;
  fineAmount: string | null;
  status: "active" | "served" | "rescinded";
  issuedAt: string;
  rescindReason: string | null;
  member: { id: string; fullName: string };
  issuedBy: { fullName: string } | null;
};

type MemberOption = { id: string; fullName: string };

const TYPE_LABELS: Record<PenaltyType, string> = {
  warning: "Formal warning",
  match_suspension: "Match suspension",
  fine: "Fine",
  membership_revoked: "Membership revoked",
};

const TYPE_STYLES: Record<PenaltyType, string> = {
  warning: "bg-warning/15 text-warning",
  match_suspension: "bg-danger/15 text-danger",
  fine: "bg-warning/15 text-warning",
  membership_revoked: "bg-danger/20 text-danger",
};

export function DisciplineRegister({ members }: { members: MemberOption[] }) {
  const [records, setRecords] = useState<Record_[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Issue form
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [type, setType] = useState<PenaltyType>("warning");
  const [reason, setReason] = useState("");
  const [clause, setClause] = useState("");
  const [matches, setMatches] = useState("1");
  const [fine, setFine] = useState("");

  // Reset-all form
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  function load() {
    apiFetch<{ records: Record_[] }>("/api/v1/admin/discipline")
      .then((d) => setRecords(d.records))
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Couldn't load the register."));
  }
  useEffect(load, []);

  const active = records?.filter((r) => r.status === "active") ?? [];

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/api/v1/admin/discipline", {
        method: "POST",
        body: JSON.stringify({
          memberId,
          type,
          reason,
          clause: clause || undefined,
          matchesSuspended: type === "match_suspension" ? Number(matches) : undefined,
          fineAmount: type === "fine" ? Number(fine) : undefined,
        }),
      });
      setReason("");
      setClause("");
      setFine("");
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function rescind(record: Record_) {
    const why = prompt(`Lift this ${TYPE_LABELS[record.type].toLowerCase()} for ${record.member.fullName}?\n\nReason:`);
    if (!why) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/discipline/${record.id}/rescind`, {
        method: "POST",
        body: JSON.stringify({ reason: why }),
      });
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  async function resetAll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await apiFetch<{ cleared: number; membersAffected: number }>(
        "/api/v1/admin/discipline/reset-all",
        {
          method: "POST",
          body: JSON.stringify({
            reason: resetReason,
            currentPassword: resetPassword,
            expectedCount: active.length,
          }),
        },
      );
      setResetOpen(false);
      setResetReason("");
      setResetPassword("");
      load();
      alert(`Cleared ${result.cleared} penalt${result.cleared === 1 ? "y" : "ies"} across ${result.membersAffected} member${result.membersAffected === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {/* Clean slate */}
      <Card accent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardLabel>Outstanding penalties</CardLabel>
            <p className="tabular mt-0.5 text-xl font-semibold text-primary-light">{active.length}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setResetOpen((v) => !v)}
            disabled={active.length === 0}
          >
            {resetOpen ? "Cancel" : "Reset all"}
          </Button>
        </div>

        {resetOpen && (
          <form onSubmit={resetAll} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">
              This lifts all {active.length} outstanding penalt{active.length === 1 ? "y" : "ies"} across the club.
              Nothing is deleted — each record is kept and marked as lifted, with your reason attached.
            </p>
            <Input
              placeholder="Reason (e.g. season reset)"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Your password (to confirm)"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? "Clearing…" : `Clear all ${active.length}`}
            </Button>
          </form>
        )}
      </Card>

      {/* Issue a penalty */}
      <Card>
        <p className="mb-3 text-sm font-medium">Issue a penalty</p>
        <form onSubmit={issue} className="flex flex-col gap-2">
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as PenaltyType)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
          >
            {(Object.keys(TYPE_LABELS) as PenaltyType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {type === "match_suspension" && (
            <Input
              type="number"
              min={1}
              value={matches}
              onChange={(e) => setMatches(e.target.value)}
              placeholder="Matches suspended"
            />
          )}
          {type === "fine" && (
            <Input
              type="number"
              min={1}
              value={fine}
              onChange={(e) => setFine(e.target.value)}
              placeholder="Fine amount (BDT)"
              required
            />
          )}

          <Input placeholder="Reason — the member sees this" value={reason} onChange={(e) => setReason(e.target.value)} required />
          <Input placeholder="Rulebook clause (optional, e.g. 5.3.3)" value={clause} onChange={(e) => setClause(e.target.value)} />

          <Button type="submit" disabled={busy || !reason.trim()}>
            {busy ? "Recording…" : "Issue penalty"}
          </Button>
        </form>
      </Card>

      {/* Register */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Register</p>
        {records === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sanctions on record — a clean club.</p>
        ) : (
          records.map((r) => (
            <Card key={r.id} className={r.status === "rescinded" ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.member.fullName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {r.reason}
                    {r.clause && <span className="text-primary"> · §{r.clause}</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.issuedAt).toLocaleDateString()}
                    {r.issuedBy && ` · by ${r.issuedBy.fullName}`}
                    {r.matchesSuspended ? ` · ${r.matchesSuspended} match${r.matchesSuspended === 1 ? "" : "es"}` : ""}
                    {r.fineAmount ? ` · ${r.fineAmount} BDT` : ""}
                  </p>
                  {r.status === "rescinded" && r.rescindReason && (
                    <p className="mt-1 text-xs text-success">Lifted — {r.rescindReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[r.type]}`}>
                    {TYPE_LABELS[r.type]}
                  </span>
                  {r.status === "active" && (
                    <button onClick={() => rescind(r)} className="text-xs text-primary hover:text-primary-light">
                      Lift
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
