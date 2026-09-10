/** §2 — Membership, dues and financial obligations. */

export type MembershipClass = "senior" | "junior";
export type MatchFeeOption = "monthly_pass" | "per_match";

/** §2.2.1 — Senior Membership Fee: 200 BDT per month (2,400 annually). */
export const SENIOR_MONTHLY_DUES_BDT = 200;

/** §2.1.2 — Junior Members are exempt from monthly dues during their tenure. */
export const JUNIOR_MONTHLY_DUES_BDT = 0;

/** §2.2.2 Option A — Monthly Pass: unlimited regular sessions that month. */
export const MONTHLY_PASS_BDT = 1500;

/**
 * §2.2.2 Option B — Pay-Per-Match: 1st match 600, 2nd 900, 3rd and onwards
 * free, subject to the monthly ceiling below.
 */
export const PER_MATCH_FEES_BDT = [600, 900] as const;
export const PER_MATCH_FEE_BEYOND_BDT = 0;

/** §2.2.2 — the pay-per-match route is capped at the monthly pass price. */
export const MONTHLY_MATCH_FEE_CEILING_BDT = 1500;

/** §2.3.1 — monthly dues must be cleared by the 7th of each calendar month. */
export const DUES_DUE_DAY_OF_MONTH = 7;

/** §2.3.2 — dues outstanding beyond 30 days suspend match voting rights. */
export const ARREARS_VOTING_SUSPENSION_DAYS = 30;

import { RULES_ENFORCED_FROM_MONTH } from "./effective";

/** §9.2 — the rulebook's fee schedule takes effect from this month, not before. */
export const DUES_RULES_EFFECTIVE_MONTH = RULES_ENFORCED_FROM_MONTH;

/** Monthly organisational dues owed by a member of this class (§2.1.2, §2.2.1). */
export function monthlyDuesFor(membershipClass: MembershipClass): number {
  return membershipClass === "junior" ? JUNIOR_MONTHLY_DUES_BDT : SENIOR_MONTHLY_DUES_BDT;
}

/**
 * Dues expected for a specific `YYYY-MM` period.
 *
 * Returns null for months before the rulebook took effect: the club collected
 * varying legacy amounts back then (3,000 and 1,500 tiers appear in the
 * imported ledger), so there is no single "expected" figure to judge those
 * months against. Historical rows are reported as recorded rather than
 * retroactively marked short against a rule that didn't exist yet.
 */
export function expectedDuesFor(membershipClass: MembershipClass, feeMonth: string): number | null {
  if (feeMonth < DUES_RULES_EFFECTIVE_MONTH) return null;
  return monthlyDuesFor(membershipClass);
}

/**
 * Fee for the nth match a member plays in a calendar month, 1-indexed (§2.2.2 Option B).
 * 1st → 600, 2nd → 900, 3rd and beyond → free.
 */
export function perMatchFee(nthMatchOfMonth: number): number {
  if (nthMatchOfMonth < 1) return 0;
  return PER_MATCH_FEES_BDT[nthMatchOfMonth - 1] ?? PER_MATCH_FEE_BEYOND_BDT;
}

/**
 * Total match fees owed for a month under the member's chosen option (§2.2.2).
 * Pay-per-match is capped at the monthly ceiling, so a member never pays more
 * than the monthly pass would have cost.
 */
export function matchFeesForMonth(option: MatchFeeOption, matchesPlayed: number): number {
  if (option === "monthly_pass") return MONTHLY_PASS_BDT;

  let total = 0;
  for (let n = 1; n <= matchesPlayed; n++) total += perMatchFee(n);
  return Math.min(total, MONTHLY_MATCH_FEE_CEILING_BDT);
}

/** The date monthly dues fall due for a `YYYY-MM` period (§2.3.1). */
export function duesDueDate(feeMonth: string): Date {
  const [year, month] = feeMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, DUES_DUE_DAY_OF_MONTH, 23, 59, 59));
}

/** Days a `YYYY-MM` period's dues have been overdue as of `asOf` (0 if not yet due). */
export function daysOverdue(feeMonth: string, asOf: Date): number {
  const due = duesDueDate(feeMonth);
  if (asOf <= due) return 0;
  return Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
}

/**
 * §2.3.2 — a member whose dues have been outstanding for more than 30 days has
 * match voting rights suspended until *all* previous dues are settled.
 *
 * `unpaidMonths` is every `YYYY-MM` period the member still owes; the oldest
 * one determines the suspension.
 */
export function votingSuspendedForArrears(
  unpaidMonths: string[],
  asOf: Date,
): { suspended: boolean; oldestUnpaidMonth: string | null; daysOverdue: number } {
  if (unpaidMonths.length === 0) return { suspended: false, oldestUnpaidMonth: null, daysOverdue: 0 };

  const oldest = [...unpaidMonths].sort()[0];
  const overdue = daysOverdue(oldest, asOf);
  return {
    suspended: overdue > ARREARS_VOTING_SUSPENSION_DAYS,
    oldestUnpaidMonth: oldest,
    daysOverdue: overdue,
  };
}

/**
 * §5.4.6 — an inactive/irregular Senior Member regains active membership by
 * paying the month of reactivation plus all outstanding dues from before.
 */
export function reactivationAmount(unpaidMonths: string[], membershipClass: MembershipClass): number {
  const perMonth = monthlyDuesFor(membershipClass);
  // The reactivation month itself, plus every outstanding month.
  return perMonth * (unpaidMonths.length + 1);
}
