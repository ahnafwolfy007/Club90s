import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { getOutstandingMembers } from "@/lib/finance/fee-status";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.managesSector(ctx, financeSectorId)) {
      throw Errors.forbidden("Only the Finance President or an Admin can view the finance dashboard.");
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [incomeAgg, expenseAgg, monthIncomeAgg, monthExpenseAgg, recent, outstanding] = await Promise.all([
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
      getOutstandingMembers(currentMonth),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    return NextResponse.json({
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      monthIncome: Number(monthIncomeAgg._sum.amount ?? 0),
      monthExpense: Number(monthExpenseAgg._sum.amount ?? 0),
      outstanding,
      recentTransactions: recent,
      currentMonth,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
