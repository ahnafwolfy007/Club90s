import { Card, CardLabel } from "@/components/ui/card";
import type { FeeStatus } from "@/lib/finance/fee-status";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  createdAt: string;
  status: string;
  feeMonth: string | null;
  category: { name: string };
};

const STATUS_STYLES: Record<FeeStatus, string> = {
  paid: "bg-success/15 text-success",
  overpaid: "bg-success/15 text-success",
  partial: "bg-warning/15 text-warning",
  unpaid: "bg-danger/15 text-danger",
};

export function MyPayments({
  feeStatus,
  transactions,
}: {
  feeStatus: { status: FeeStatus; amountPaid: number; amountDue: number };
  transactions: Transaction[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card accent>
        <CardLabel>Dues this month</CardLabel>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="tabular text-2xl font-semibold text-primary-light">
            {feeStatus.amountPaid.toLocaleString()}
            <span className="text-base text-muted-foreground"> / {feeStatus.amountDue.toLocaleString()}</span>
          </p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[feeStatus.status]}`}>
            {feeStatus.status}
          </span>
        </div>
      </Card>

      <div>
        <p className="mb-2 font-display text-xs uppercase tracking-[0.12em] text-primary-dim">Payment history</p>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((t) => (
              <Card key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {t.category.name}
                    {t.feeMonth ? ` · ${t.feeMonth}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                    {t.description ? ` · ${t.description}` : ""}
                    {t.status === "voided" ? " · voided" : ""}
                  </p>
                </div>
                <span
                  className={`tabular text-sm font-semibold ${
                    t.status === "voided"
                      ? "text-muted-foreground line-through"
                      : t.type === "expense"
                        ? "text-danger"
                        : "text-success"
                  }`}
                >
                  {t.type === "expense" ? "−" : "+"}
                  {Number(t.amount).toLocaleString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
