/** §3 — Governance eligibility, term limits and role conflicts. */

import { votingSuspendedForArrears } from "./dues";

export type GovernanceRole = "advisory_board" | "executive_president" | "founding_member" | "member";

export type EligibilityCheck =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * §3.4.7 — only active Members in good standing, who have fulfilled the
 * applicable membership requirements, may contest an elected position.
 *
 * "Good standing" is read against §2.3.2: a member whose dues have lapsed past
 * the arrears window has had their rights suspended and is not in good standing.
 */
export function canContestElection(params: {
  memberStatus: string;
  unpaidMonths: string[];
  asOf: Date;
}): EligibilityCheck {
  if (params.memberStatus !== "active") {
    return {
      eligible: false,
      reason: "Only active members may contest an elected position (§3.4.7).",
    };
  }

  const arrears = votingSuspendedForArrears(params.unpaidMonths, params.asOf);
  if (arrears.suspended) {
    return {
      eligible: false,
      reason: `Dues outstanding since ${arrears.oldestUnpaidMonth} (${arrears.daysOverdue} days). Members must be in good standing to contest (§3.4.7, §2.3.2).`,
    };
  }

  return { eligible: true };
}

/**
 * §3.4.3 — a Founding Member may sit on the Advisory Board *or* be elected an
 * Executive Committee President, but never both at the same time.
 */
export function canHoldGovernanceRole(
  existingRoles: GovernanceRole[],
  incoming: GovernanceRole,
): EligibilityCheck {
  const conflicts: Record<string, GovernanceRole> = {
    advisory_board: "executive_president",
    executive_president: "advisory_board",
  };

  const conflictsWith = conflicts[incoming];
  if (conflictsWith && existingRoles.includes(conflictsWith)) {
    const held = conflictsWith === "advisory_board" ? "an Advisory Board Member" : "an Executive Committee President";
    const wanted = incoming === "advisory_board" ? "the Advisory Board" : "an Executive Committee presidency";
    return {
      eligible: false,
      reason: `This member is already ${held}. No member may hold both the Advisory Board and an Executive Committee presidency at once (§3.4.3) — remove the existing role before granting ${wanted}.`,
    };
  }

  return { eligible: true };
}

/** §3.4.1 — a Divisional President's term runs one year from the grant date. */
export function presidentTermEnd(grantedAt: Date): Date {
  const end = new Date(grantedAt);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

/** §3.4.2 — elections are announced 30 days before term expiry. */
export function electionNoticeDate(termEnd: Date): Date {
  const notice = new Date(termEnd);
  notice.setUTCDate(notice.getUTCDate() - 30);
  return notice;
}

/** §3.4.4 / §3.4.5 — vacancies must be filled within 7 days. */
export const VACANCY_FILL_DAYS = 7;

export function vacancyDeadline(vacatedAt: Date): Date {
  const deadline = new Date(vacatedAt);
  deadline.setUTCDate(deadline.getUTCDate() + VACANCY_FILL_DAYS);
  return deadline;
}
