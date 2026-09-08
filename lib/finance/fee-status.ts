import { prisma } from "@/lib/db/client";

export type FeeStatus = "paid" | "partial" | "unpaid" | "overpaid";

/**
 * Fee status is DERIVED, not stored (SRS §10.2) — computed from the ledger at
 * query time, so changing club_settings.monthly_fee never corrupts history.
 */
export async function getClubMonthlyFee(): Promise<number> {
  const setting = await prisma.clubSetting.findUnique({ where: { key: "monthly_fee" } });
  return Number(setting?.value ?? 0);
}

export function deriveFeeStatus(amountPaid: number, amountDue: number): FeeStatus {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid < amountDue) return "partial";
  if (amountPaid > amountDue) return "overpaid";
  return "paid";
}

export async function getMemberFeeStatus(memberId: string, feeMonth: string) {
  const [amountDue, sum] = await Promise.all([
    getClubMonthlyFee(),
    prisma.financialTransaction.aggregate({
      where: {
        memberId,
        feeMonth,
        status: "posted",
        category: { name: "Monthly Fee" },
      },
      _sum: { amount: true },
    }),
  ]);
  const amountPaid = Number(sum._sum.amount ?? 0);
  return { status: deriveFeeStatus(amountPaid, amountDue), amountPaid, amountDue };
}

/** Active members with Unpaid/Partial status for the given month — the finance dashboard's "outstanding" list. */
export async function getOutstandingMembers(feeMonth: string) {
  const [amountDue, members, paidRows] = await Promise.all([
    getClubMonthlyFee(),
    prisma.member.findMany({ where: { status: "active" }, select: { id: true, fullName: true } }),
    prisma.financialTransaction.groupBy({
      by: ["memberId"],
      where: { feeMonth, status: "posted", category: { name: "Monthly Fee" } },
      _sum: { amount: true },
    }),
  ]);

  const paidByMember = new Map(paidRows.map((r) => [r.memberId, Number(r._sum.amount ?? 0)]));

  return members
    .map((m) => {
      const amountPaid = paidByMember.get(m.id) ?? 0;
      return { memberId: m.id, fullName: m.fullName, amountPaid, amountDue, status: deriveFeeStatus(amountPaid, amountDue) };
    })
    .filter((m) => m.status === "unpaid" || m.status === "partial");
}
