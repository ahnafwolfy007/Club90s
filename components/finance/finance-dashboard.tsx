"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardLabel, CardValue } from "@/components/ui/card";
import { apiFetch, ClientApiError } from "@/lib/api/client";
import { CollectionMatrixTable } from "@/components/finance/collection-matrix";
import type { CollectionMatrix } from "@/lib/finance/collection-matrix";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  createdAt: string;
  status: string;
  category: { name: string };
  member: { fullName: string } | null;
};

type DashboardData = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  outstanding: { memberId: string; fullName: string; amountPaid: number; amountDue: number; status: string }[];
  recentTransactions: Transaction[];
  expenses: Transaction[];
  matrix: CollectionMatrix;
};

const TABS = ["Collection", "Expenses", "Outstanding"] as const;
type Tab = (typeof TABS)[number];

export function FinanceDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Collection");

  async function onVoid(id: string) {
    const reason = prompt("Reason for voiding this transaction:");
    if (!reason) return;
    try {
      await apiFetch(`/api/v1/finance/transactions/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) });
      router.refresh();
    } catch (err) {
      alert(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card accent>
          <CardLabel>Club balance</CardLabel>
          <CardValue>{data.balance.toLocaleString()}</CardValue>
        </Card>
        <Card accent>
          <CardLabel>Collected all-time</CardLabel>
          <CardValue>{data.totalIncome.toLocaleString()}</CardValue>
        </Card>
        <Card accent>
          <CardLabel>This month in</CardLabel>
          <CardValue className="text-success">+{data.monthIncome.toLocaleString()}</CardValue>
        </Card>
        <Card accent>
          <CardLabel>This month out</CardLabel>
          <CardValue className="text-danger">−{data.monthExpense.toLocaleString()}</CardValue>
        </Card>
      </div>

      <Link
        href="/finance/record"
        className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.97] hover:bg-primary-light"
      >
        Record a payment
      </Link>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "border border-border-gold bg-muted text-muted-foreground hover:text-primary-light"
            }`}
          >
            {t}
            {t === "Outstanding" && data.outstanding.length > 0 && (
              <span className="ml-1.5 rounded-full bg-danger/20 px-1.5 text-xs text-danger">
                {data.outstanding.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Collection" && (
        <div className="fade-up">
          <CollectionMatrixTable matrix={data.matrix} />
        </div>
      )}

      {tab === "Expenses" && (
        <div className="fade-up flex flex-col gap-2">
          {data.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            data.expenses.map((t) => (
              <Card key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold text-danger">−{Number(t.amount).toLocaleString()}</span>
                  {t.status === "posted" && (
                    <button onClick={() => onVoid(t.id)} className="text-xs text-danger/70 hover:text-danger">
                      Void
                    </button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "Outstanding" && (
        <div className="fade-up flex flex-col gap-2">
          {data.outstanding.length === 0 ? (
            <p className="text-sm text-success">Everyone&rsquo;s paid up this month.</p>
          ) : (
            data.outstanding.map((o) => (
              <Card key={o.memberId} className="flex items-center justify-between">
                <span className="text-sm">{o.fullName}</span>
                <span className="tabular text-sm text-muted-foreground">
                  {o.amountPaid.toLocaleString()}/{o.amountDue.toLocaleString()}
                  <span className={`ml-2 ${o.status === "unpaid" ? "text-danger" : "text-warning"}`}>{o.status}</span>
                </span>
              </Card>
            ))
          )}
        </div>
      )}

      <div>
        <p className="mb-2 font-display text-xs uppercase tracking-[0.12em] text-primary-dim">Recent activity</p>
        <div className="flex flex-col gap-2">
          {data.recentTransactions.map((t) => (
            <Card key={t.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t.category.name}
                  {t.member ? ` — ${t.member.fullName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`tabular text-sm font-semibold ${t.type === "expense" ? "text-danger" : "text-success"}`}>
                  {t.type === "expense" ? "−" : "+"}
                  {Number(t.amount).toLocaleString()}
                </span>
                {t.status === "posted" && (
                  <button onClick={() => onVoid(t.id)} className="text-xs text-danger/70 hover:text-danger">
                    Void
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
