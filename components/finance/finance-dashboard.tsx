"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { apiFetch, ClientApiError } from "@/lib/api/client";

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
};

export function FinanceDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();

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
        <Card>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-lg font-semibold">{data.balance.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="text-lg font-semibold text-success">+{data.monthIncome.toFixed(2)}</p>
          <p className="text-sm text-danger">-{data.monthExpense.toFixed(2)}</p>
        </Card>
      </div>

      <Link href="/finance/record" className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
        Record a payment
      </Link>

      <Card>
        <p className="mb-2 text-sm font-medium">Outstanding this month ({data.outstanding.length})</p>
        {data.outstanding.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone&rsquo;s paid up.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.outstanding.map((o) => (
              <div key={o.memberId} className="flex items-center justify-between text-sm">
                <span>{o.fullName}</span>
                <span className="text-muted-foreground">
                  {o.amountPaid}/{o.amountDue} · {o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium">Recent transactions</p>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {t.type === "expense" ? "-" : "+"}
                  {t.amount}
                </span>
                {t.status === "posted" && (
                  <button onClick={() => onVoid(t.id)} className="text-xs text-danger">
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
