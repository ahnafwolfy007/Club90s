import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { getMemberFeeStatus, getOutstandingMembers } from "@/lib/finance/fee-status";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { MyPayments } from "@/components/finance/my-payments";

export default async function FinancePage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");

  const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
  const isPrivileged = financeSectorId ? can.managesSector(ctx, financeSectorId) : false;

  if (isPrivileged) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [incomeAgg, expenseAgg, monthIncomeAgg, monthExpenseAgg, recent, outstanding] = await Promise.all([
      prisma.financialTransaction.aggregate({ where: { type: "income", status: "posted" }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { type: "expense", status: "posted" }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { type: "income", status: "posted", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { type: "expense", status: "posted", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.financialTransaction.findMany({
        where: { status: "posted" },
        include: { category: true, member: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      getOutstandingMembers(currentMonth),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <h1 className="text-lg font-semibold">Finance</h1>
        <FinanceDashboard
          data={{
            balance: totalIncome - totalExpense,
            totalIncome,
            totalExpense,
            monthIncome: Number(monthIncomeAgg._sum.amount ?? 0),
            monthExpense: Number(monthExpenseAgg._sum.amount ?? 0),
            outstanding,
            recentTransactions: recent.map((t) => ({ ...t, amount: t.amount.toString(), createdAt: t.createdAt.toISOString() })),
          }}
        />
      </div>
    );
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [feeStatus, transactions] = await Promise.all([
    getMemberFeeStatus(ctx.memberId, currentMonth),
    prisma.financialTransaction.findMany({
      where: { memberId: ctx.memberId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">My payments</h1>
      <MyPayments feeStatus={feeStatus} transactions={transactions.map((t) => ({ ...t, amount: t.amount.toString(), createdAt: t.createdAt.toISOString() }))} />
    </div>
  );
}
