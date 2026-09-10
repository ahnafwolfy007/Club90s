import { prisma } from "@/lib/db/client";
import { expectedDuesFor } from "@/lib/rulebook";
import type { MembershipClass } from "@/lib/rulebook";

export type FeeStatus = "paid" | "partial" | "unpaid" | "overpaid" | "exempt";

/**
 * Fee status is DERIVED, not stored (SRS §10.2) — computed from the ledger at
 * query time, so a fee change never corrupts history.
 *
 * What's owed comes from the rulebook, not a club setting: §2.2.1 sets Senior
 * dues at 200 BDT and §2.1.2 exempts Juniors entirely, and neither is a value
 * an admin should be able to drift out of sync with the constitution.
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
  const [member, sum] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId }, select: { membershipClass: true } }),
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

  const membershipClass: MembershipClass = member?.membershipClass ?? "senior";
  const amountPaid = Number(sum._sum.amount ?? 0);
  const expected = expectedDuesFor(membershipClass, feeMonth);

  // Null: the month predates the rulebook, so there's no figure to judge it
  // against — report what was recorded rather than inventing a shortfall.
  if (expected === null) {
    return { status: "paid" as FeeStatus, amountPaid, amountDue: 0, membershipClass };
  }
  if (expected === 0) {
    return { status: "exempt" as FeeStatus, amountPaid, amountDue: 0, membershipClass };
  }

  return { status: deriveFeeStatus(amountPaid, expected), amountPaid, amountDue: expected, membershipClass };
}

/**
 * Active members short on dues for the given month — the finance dashboard's
 * "outstanding" list. Juniors never appear: §2.1.2 exempts them, and listing
 * them as debtors would be wrong on the club's own terms.
 */
export async function getOutstandingMembers(feeMonth: string) {
  const [members, paidRows] = await Promise.all([
    prisma.member.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true, membershipClass: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["memberId"],
      where: { feeMonth, status: "posted", category: { name: "Monthly Fee" } },
      _sum: { amount: true },
    }),
  ]);

  const paidByMember = new Map(paidRows.map((r) => [r.memberId, Number(r._sum.amount ?? 0)]));

  return members
    .map((m) => {
      const amountDue = expectedDuesFor(m.membershipClass, feeMonth) ?? 0;
      const amountPaid = paidByMember.get(m.id) ?? 0;
      return {
        memberId: m.id,
        fullName: m.fullName,
        membershipClass: m.membershipClass,
        amountPaid,
        amountDue,
        status: amountDue === 0 ? ("exempt" as FeeStatus) : deriveFeeStatus(amountPaid, amountDue),
      };
    })
    .filter((m) => m.status === "unpaid" || m.status === "partial");
}
