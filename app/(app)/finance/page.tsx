import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { getMemberFeeStatus, getOutstandingMembers } from "@/lib/finance/fee-status";
import { getCollectionMatrix } from "@/lib/finance/collection-matrix";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { MyPayments } from "@/components/finance/my-payments";
import { PageHeader } from "@/components/ui/page-header";

export default async function FinancePage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");

  const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
  const isPrivileged = financeSectorId ? can.managesSector(ctx, financeSectorId) : false;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (isPrivileged) {
    const [incomeAgg, expenseAgg, monthIncomeAgg, monthExpenseAgg, recent, expenses, outstanding, matrix] =
      await Promise.all([
        prisma.financialTransaction.aggregate({ where: { type: "income", status: "posted" }, _sum: { amount: true } }),
        prisma.financialTransaction.aggregate({ where: { type: "expense", status: "posted" }, _sum: { amount: true } }),
        prisma.financialTransaction.aggregate({
          where: { type: "income", status: "posted", createdAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.financialTransaction.aggregate({
          where: { type: "expense", status: "posted", createdAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.financialTransaction.findMany({
          where: { status: "posted" },
          include: { category: true, member: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.financialTransaction.findMany({
          where: { status: "posted", type: "expense" },
          include: { category: true, member: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        getOutstandingMembers(currentMonth),
        getCollectionMatrix(),
      ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);
    const serialize = (t: (typeof recent)[number]) => ({
      ...t,
      amount: t.amount.toString(),
      createdAt: t.createdAt.toISOString(),
    });

    return (
      <div className="fade-up flex flex-col gap-4 px-4 py-4">
        <PageHeader title="Finance" description="Collection records, expenses, and club balance" />
        <FinanceDashboard
          data={{
            balance: totalIncome - totalExpense,
            totalIncome,
            totalExpense,
            monthIncome: Number(monthIncomeAgg._sum.amount ?? 0),
            monthExpense: Number(monthExpenseAgg._sum.amount ?? 0),
            outstanding,
            recentTransactions: recent.map(serialize),
            expenses: expenses.map(serialize),
            matrix,
          }}
        />
      </div>
    );
  }

  const [feeStatus, transactions] = await Promise.all([
    getMemberFeeStatus(ctx.memberId, currentMonth),
    prisma.financialTransaction.findMany({
      where: { memberId: ctx.memberId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <PageHeader title="My payments" description="Your dues and payment history" />
      <MyPayments
        feeStatus={feeStatus}
        transactions={transactions.map((t) => ({
          ...t,
          amount: t.amount.toString(),
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
