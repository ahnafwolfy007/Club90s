/**
 * A member's standing with the club — the single answer to "are they clear?"
 *
 * Combines §2 (dues and arrears) with §7.2 (sanctions) into one view, so the
 * committee doesn't have to cross-reference the ledger against the discipline
 * register by hand. Pure: it takes already-fetched facts and returns a verdict.
 */

import type { MembershipClass } from "./dues";
import { monthlyDuesFor, votingSuspendedForArrears, expectedDuesFor } from "./dues";
import { monthsSubjectToRules } from "./effective";

export type DuesMonth = { feeMonth: string; amountPaid: number };

export type StandingFlag = "cleared" | "dues_owing" | "voting_suspended" | "penalised";

export type MemberStanding = {
  membershipClass: MembershipClass;
  /** §2.1.2 — Juniors owe nothing while in their academic or recruitment tenure. */
  duesExempt: boolean;
  monthlyDue: number;
  /** Assessable months (post-enforcement) that are short or unpaid. */
  unpaidMonths: string[];
  amountOwed: number;
  currentMonth: { feeMonth: string; amountPaid: number; amountDue: number; settled: boolean };
  oldestUnpaidMonth: string | null;
  daysOverdue: number;
  /** §2.3.2 — dues outstanding beyond 30 days suspend match voting rights. */
  votingSuspended: boolean;
  activePenalties: number;
  matchesSuspended: number;
  /** Every condition that currently applies, worst first. */
  flags: StandingFlag[];
  /** The single worst condition — what a roll should sort and filter on. */
  worst: StandingFlag;
};

const SEVERITY: StandingFlag[] = ["voting_suspended", "penalised", "dues_owing", "cleared"];

/** Every `YYYY-MM` from `from` up to and including `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);

  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function computeStanding(params: {
  membershipClass: MembershipClass;
  /** What the member has paid, per month, against the Monthly Fee category. */
  duesPaid: DuesMonth[];
  /** Their assessable window: usually enforcement start through the current month. */
  assessableMonths: string[];
  activePenalties: number;
  matchesSuspended: number;
  asOf: Date;
}): MemberStanding {
  const {
    membershipClass,
    duesPaid,
    assessableMonths,
    activePenalties,
    matchesSuspended,
    asOf,
  } = params;

  const duesExempt = membershipClass === "junior";
  const monthlyDue = monthlyDuesFor(membershipClass);
  const paidByMonth = new Map(duesPaid.map((d) => [d.feeMonth, d.amountPaid]));

  const months = monthsSubjectToRules(assessableMonths);
  const currentMonthKey = months.at(-1) ?? assessableMonths.at(-1) ?? "";

  const unpaidMonths: string[] = [];
  let amountOwed = 0;

  for (const feeMonth of months) {
    const due = expectedDuesFor(membershipClass, feeMonth);
    // Null means the month predates the rulebook; zero means it's genuinely
    // owed-nothing. Neither can leave a member short.
    if (due === null || due <= 0) continue;

    const paid = paidByMonth.get(feeMonth) ?? 0;
    if (paid < due) {
      unpaidMonths.push(feeMonth);
      amountOwed += due - paid;
    }
  }

  const arrears = votingSuspendedForArrears(unpaidMonths, asOf);

  const currentPaid = paidByMonth.get(currentMonthKey) ?? 0;
  const currentDue = duesExempt ? 0 : (expectedDuesFor(membershipClass, currentMonthKey) ?? 0);

  const flags: StandingFlag[] = [];
  if (arrears.suspended) flags.push("voting_suspended");
  if (activePenalties > 0) flags.push("penalised");
  if (unpaidMonths.length > 0 && !arrears.suspended) flags.push("dues_owing");
  if (flags.length === 0) flags.push("cleared");

  flags.sort((a, b) => SEVERITY.indexOf(a) - SEVERITY.indexOf(b));

  return {
    membershipClass,
    duesExempt,
    monthlyDue,
    unpaidMonths,
    amountOwed,
    currentMonth: {
      feeMonth: currentMonthKey,
      amountPaid: currentPaid,
      amountDue: currentDue,
      settled: currentPaid >= currentDue,
    },
    oldestUnpaidMonth: arrears.oldestUnpaidMonth,
    daysOverdue: arrears.daysOverdue,
    votingSuspended: arrears.suspended,
    activePenalties,
    matchesSuspended,
    flags,
    worst: flags[0],
  };
}

export const STANDING_LABELS: Record<StandingFlag, string> = {
  cleared: "Cleared",
  dues_owing: "Dues owing",
  voting_suspended: "Voting suspended",
  penalised: "Penalised",
};
