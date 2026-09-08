import { prisma } from "@/lib/db/client";
import { getClubMonthlyFee, deriveFeeStatus, type FeeStatus } from "@/lib/finance/fee-status";

export type CollectionCell = { feeMonth: string; amount: number; status: FeeStatus };
export type CollectionRow = { memberId: string; fullName: string; cells: CollectionCell[]; total: number };
export type CollectionMatrix = {
  months: string[];
  rows: CollectionRow[];
  monthlyTotals: number[];
  grandTotal: number;
  amountDue: number;
};

/** Builds the "who paid what, month by month" grid the club's finance board is organised around. */
export async function getCollectionMatrix(monthCount = 12): Promise<CollectionMatrix> {
  const months = recentMonths(monthCount);

  const [amountDue, members, transactions] = await Promise.all([
    getClubMonthlyFee(),
    prisma.member.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: {
        status: "posted",
        category: { name: "Monthly Fee" },
        feeMonth: { in: months },
        memberId: { not: null },
      },
      select: { memberId: true, feeMonth: true, amount: true },
    }),
  ]);

  // memberId -> feeMonth -> summed amount
  const paid = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    if (!t.memberId || !t.feeMonth) continue;
    const byMonth = paid.get(t.memberId) ?? new Map<string, number>();
    byMonth.set(t.feeMonth, (byMonth.get(t.feeMonth) ?? 0) + Number(t.amount));
    paid.set(t.memberId, byMonth);
  }

  const rows: CollectionRow[] = members.map((m) => {
    const byMonth = paid.get(m.id);
    const cells = months.map((feeMonth) => {
      const amount = byMonth?.get(feeMonth) ?? 0;
      return { feeMonth, amount, status: deriveFeeStatus(amount, amountDue) };
    });
    return { memberId: m.id, fullName: m.fullName, cells, total: cells.reduce((sum, c) => sum + c.amount, 0) };
  });

  const monthlyTotals = months.map((_, i) => rows.reduce((sum, r) => sum + r.cells[i].amount, 0));

  return {
    months,
    rows,
    monthlyTotals,
    grandTotal: monthlyTotals.reduce((a, b) => a + b, 0),
    amountDue,
  };
}

/** Oldest-to-newest list of `YYYY-MM` keys ending with the current month. */
function recentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}
