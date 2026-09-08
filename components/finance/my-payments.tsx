import { Card } from "@/components/ui/card";
import type { FeeStatus } from "@/lib/finance/fee-status";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  createdAt: string;
  status: string;
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
      <Card>
        <p className="text-sm text-muted-foreground">This month</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-lg font-semibold">
            {feeStatus.amountPaid} / {feeStatus.amountDue}
          </p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[feeStatus.status]}`}>
            {feeStatus.status}
          </span>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium">History</p>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((t) => (
              <Card key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()} {t.description ? `· ${t.description}` : ""}
                  </p>
                </div>
                <span className={`text-sm font-medium ${t.status === "voided" ? "text-muted-foreground line-through" : ""}`}>
                  {t.type === "expense" ? "-" : "+"}
                  {t.amount}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
