"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Flag = "cleared" | "dues_owing" | "voting_suspended" | "penalised";

type Row = {
  memberId: string;
  fullName: string;
  membershipClass: "senior" | "junior";
  duesExempt: boolean;
  monthlyDue: number;
  unpaidMonths: string[];
  amountOwed: number;
  currentMonth: { feeMonth: string; amountPaid: number; amountDue: number; settled: boolean };
  oldestUnpaidMonth: string | null;
  daysOverdue: number;
  votingSuspended: boolean;
  activePenalties: number;
  matchesSuspended: number;
  flags: Flag[];
  worst: Flag;
};

type Payload = {
  month: string;
  summary: {
    total: number;
    cleared: number;
    duesOwing: number;
    votingSuspended: number;
    penalised: number;
    exempt: number;
    totalOwed: number;
  };
  members: Row[];
};

const FLAG_STYLES: Record<Flag, string> = {
  cleared: "bg-success/15 text-success",
  dues_owing: "bg-warning/15 text-warning",
  voting_suspended: "bg-danger/20 text-danger",
  penalised: "bg-danger/15 text-danger",
};

const FLAG_LABELS: Record<Flag, string> = {
  cleared: "Cleared",
  dues_owing: "Dues owing",
  voting_suspended: "Voting suspended",
  penalised: "Penalised",
};

type Filter = "all" | Flag | "exempt";

export function StandingRoll() {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<Payload>("/api/v1/admin/standing")
      .then(setData)
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Couldn't load the roll."));
  }
  useEffect(load, []);

  const visible = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.members.filter((m) => {
      if (term && !m.fullName.toLowerCase().includes(term)) return false;
      if (filter === "all") return true;
      if (filter === "exempt") return m.duesExempt;
      return m.flags.includes(filter);
    });
  }, [data, filter, q]);

  async function markPaid(row: Row) {
    setBusy(row.memberId);
    setError(null);
    try {
      await apiFetch("/api/v1/admin/standing/record-dues", {
        method: "POST",
        body: JSON.stringify({
          memberId: row.memberId,
          feeMonth: row.oldestUnpaidMonth ?? row.currentMonth.feeMonth,
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">{error ?? "Loading…"}</p>;
  }

  const { summary } = data;
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.total },
    { key: "cleared", label: "Cleared", count: summary.cleared },
    { key: "dues_owing", label: "Dues owing", count: summary.duesOwing },
    { key: "voting_suspended", label: "Suspended", count: summary.votingSuspended },
    { key: "penalised", label: "Penalised", count: summary.penalised },
    { key: "exempt", label: "Exempt", count: summary.exempt },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Card accent>
          <CardLabel>Outstanding dues</CardLabel>
          <p className="tabular mt-0.5 text-xl font-semibold text-primary-light">
            {summary.totalOwed.toLocaleString()} <span className="text-sm text-muted-foreground">BDT</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            across {summary.duesOwing + summary.votingSuspended} member
            {summary.duesOwing + summary.votingSuspended === 1 ? "" : "s"}
          </p>
        </Card>
        <Card>
          <CardLabel>Cleared</CardLabel>
          <p className="tabular mt-0.5 text-xl font-semibold text-success">
            {summary.cleared}
            <span className="text-sm text-muted-foreground">/{summary.total}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{summary.exempt} exempt as Junior</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === chip.key
                ? "bg-primary text-primary-foreground"
                : "border border-border-gold bg-muted text-muted-foreground hover:text-primary-light"
            }`}
          >
            {chip.label} · {chip.count}
          </button>
        ))}
      </div>

      <Input placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="flex flex-col gap-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members match.</p>
        ) : (
          visible.map((m) => (
            <Card key={m.memberId}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/members/${m.memberId}`} className="font-medium hover:text-primary-light">
                    {m.fullName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.membershipClass === "junior" ? "Junior — exempt (§2.1.2)" : `Senior — ${m.monthlyDue} BDT/month`}
                  </p>

                  {m.duesExempt ? null : m.amountOwed > 0 ? (
                    <p className="mt-1 text-sm text-warning">
                      {m.amountOwed.toLocaleString()} BDT owed
                      {m.unpaidMonths.length > 1 && ` · ${m.unpaidMonths.length} months`}
                      {m.oldestUnpaidMonth && ` · since ${m.oldestUnpaidMonth}`}
                      {m.daysOverdue > 0 && ` (${m.daysOverdue}d overdue)`}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-success">
                      Paid up through {m.currentMonth.feeMonth}
                    </p>
                  )}

                  {m.activePenalties > 0 && (
                    <p className="mt-0.5 text-xs text-danger">
                      {m.activePenalties} active sanction{m.activePenalties === 1 ? "" : "s"}
                      {m.matchesSuspended > 0 && ` · ${m.matchesSuspended} match ban`}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {m.flags.map((flag) => (
                    <span key={flag} className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_STYLES[flag]}`}>
                      {FLAG_LABELS[flag]}
                    </span>
                  ))}
                  {m.duesExempt && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Exempt</span>
                  )}
                  {!m.duesExempt && m.amountOwed > 0 && (
                    <button
                      onClick={() => markPaid(m)}
                      disabled={busy === m.memberId}
                      className="text-xs font-medium text-primary hover:text-primary-light disabled:opacity-50"
                    >
                      {busy === m.memberId ? "Recording…" : `Mark ${m.oldestUnpaidMonth ?? ""} paid`}
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
