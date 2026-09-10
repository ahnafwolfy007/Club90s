import { prisma } from "@/lib/db/client";
import { computeStanding, monthsBetween, type MemberStanding } from "@/lib/rulebook/standing";
import { RULES_ENFORCED_FROM_MONTH } from "@/lib/rulebook";

export type MemberStandingRow = MemberStanding & {
  memberId: string;
  fullName: string;
  email: string;
  memberStatus: string;
};

export function currentFeeMonth(asOf = new Date()): string {
  return `${asOf.getUTCFullYear()}-${String(asOf.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The club's standing roll: dues, arrears and sanctions for every member, in
 * one pass.
 *
 * Deliberately three queries rather than one per member — at ~44 members a
 * per-member loop would be 130+ round trips to Aiven for a page that's opened
 * constantly.
 */
export async function getStandingRoll(asOf = new Date()): Promise<MemberStandingRow[]> {
  const thisMonth = currentFeeMonth(asOf);
  const assessableMonths = monthsBetween(RULES_ENFORCED_FROM_MONTH, thisMonth);

  const [members, duesRows, penaltyRows] = await Promise.all([
    prisma.member.findMany({
      where: { status: { not: "inactive" } },
      select: { id: true, fullName: true, status: true, membershipClass: true, user: { select: { email: true } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.financialTransaction.groupBy({
      by: ["memberId", "feeMonth"],
      where: {
        status: "posted",
        category: { name: "Monthly Fee" },
        feeMonth: { in: assessableMonths },
        memberId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.disciplinaryRecord.findMany({
      where: { status: "active" },
      select: { memberId: true, type: true, matchesSuspended: true },
    }),
  ]);

  const duesByMember = new Map<string, { feeMonth: string; amountPaid: number }[]>();
  for (const row of duesRows) {
    if (!row.memberId || !row.feeMonth) continue;
    const list = duesByMember.get(row.memberId) ?? [];
    list.push({ feeMonth: row.feeMonth, amountPaid: Number(row._sum.amount ?? 0) });
    duesByMember.set(row.memberId, list);
  }

  const penaltiesByMember = new Map<string, { active: number; matches: number }>();
  for (const row of penaltyRows) {
    const entry = penaltiesByMember.get(row.memberId) ?? { active: 0, matches: 0 };
    entry.active += 1;
    if (row.type === "match_suspension") entry.matches += row.matchesSuspended ?? 0;
    penaltiesByMember.set(row.memberId, entry);
  }

  return members.map((member) => {
    const penalties = penaltiesByMember.get(member.id) ?? { active: 0, matches: 0 };
    const standing = computeStanding({
      membershipClass: member.membershipClass,
      duesPaid: duesByMember.get(member.id) ?? [],
      assessableMonths,
      activePenalties: penalties.active,
      matchesSuspended: penalties.matches,
      asOf,
    });

    return {
      ...standing,
      memberId: member.id,
      fullName: member.fullName,
      email: member.user.email,
      memberStatus: member.status,
    };
  });
}

export function summariseRoll(rows: MemberStandingRow[]) {
  return {
    total: rows.length,
    cleared: rows.filter((r) => r.worst === "cleared").length,
    duesOwing: rows.filter((r) => r.flags.includes("dues_owing")).length,
    votingSuspended: rows.filter((r) => r.votingSuspended).length,
    penalised: rows.filter((r) => r.activePenalties > 0).length,
    exempt: rows.filter((r) => r.duesExempt).length,
    totalOwed: rows.reduce((sum, r) => sum + r.amountOwed, 0),
  };
}
