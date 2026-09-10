/** §5 — Matchday operations, availability polls and venue rules. */

import type { MembershipClass } from "./dues";

/** The club plays in Dhaka; rulebook deadlines are local ("Tuesday evening"). */
export const CLUB_UTC_OFFSET_HOURS = 6;

/** "Evening" is not defined in the rulebook — the club's working reading is 9pm local. */
export const POLL_CLOSE_HOUR_LOCAL = 21;

/** §5.2.2 / §5.2.3 — Junior voting closes Tuesday, Senior on Wednesday. */
const POLL_CLOSE_WEEKDAY: Record<MembershipClass, number> = {
  junior: 2, // Tuesday
  senior: 3, // Wednesday
};

/** §5.1.1 — sessions are typically Friday/Saturday. */
export const MATCHDAY_WEEKDAYS = [5, 6];

/** §5.2.5 — minimum player quorum must be reached 48 hours before kickoff. */
export const QUORUM_DEADLINE_HOURS_BEFORE_KICKOFF = 48;

/** §5.2.4 — poll outcome thresholds. */
export const QUORUM_PROCEED = 15;
export const QUORUM_OPPONENT_MIN = 10;
export const QUORUM_OPPONENT_MAX = 12;

export type PollOutcome = "proceed" | "arrange_opponent" | "cancel" | "undetermined";

/**
 * §5.2.4 — what a given YES count means for the week's match.
 *
 * Note the rulebook leaves 13–14 YES votes unspecified: it defines ≥15, 10–12
 * and <10 but not the band between. We surface that as `undetermined` rather
 * than silently picking a side, so the Executive Committee decides and the gap
 * stays visible for a future amendment.
 */
export function pollOutcome(yesVotes: number): PollOutcome {
  if (yesVotes >= QUORUM_PROCEED) return "proceed";
  if (yesVotes < QUORUM_OPPONENT_MIN) return "cancel";
  if (yesVotes <= QUORUM_OPPONENT_MAX) return "arrange_opponent";
  return "undetermined";
}

export function describePollOutcome(outcome: PollOutcome): string {
  switch (outcome) {
    case "proceed":
      return "Quorum met — match proceeds among club members (§5.2.4).";
    case "arrange_opponent":
      return "The club may arrange an opponent and proceed (§5.2.4).";
    case "cancel":
      return "Below quorum — the match is generally cancelled this week (§5.2.4).";
    case "undetermined":
      return "13–14 votes falls in a band the rulebook doesn't define — Executive Committee decides.";
  }
}

/** The most recent `weekday` strictly before `matchDate`, at the club's evening cutoff. */
function lastEveningBefore(weekday: number, matchDate: Date): Date {
  // Work in club-local time so "Tuesday evening" means Tuesday in Dhaka.
  const local = new Date(matchDate.getTime() + CLUB_UTC_OFFSET_HOURS * 3_600_000);

  // Never 0 or negative: the poll always closes before the match it governs.
  let daysBack = local.getUTCDay() - weekday;
  if (daysBack <= 0) daysBack += 7;

  const close = new Date(local);
  close.setUTCDate(close.getUTCDate() - daysBack);
  close.setUTCHours(POLL_CLOSE_HOUR_LOCAL, 0, 0, 0);

  // Back to real UTC.
  return new Date(close.getTime() - CLUB_UTC_OFFSET_HOURS * 3_600_000);
}

/**
 * The moment the availability poll closes for this membership class, for a
 * match on `matchDate` (§5.2.2, §5.2.3).
 *
 * Seniors close on the last Wednesday evening before the match; Juniors a day
 * earlier. The rulebook assumes Friday/Saturday fixtures (§5.1.1), where that
 * is simply the Tuesday and Wednesday of match week.
 *
 * Midweek fixtures need the guard below. Walking each class back to its own
 * weekday independently breaks down for a Wednesday match: Juniors would land
 * on the Tuesday one day earlier while Seniors skip to the *previous*
 * Wednesday, handing Juniors six more days than Seniors and inverting the
 * rule. Anchoring Juniors to the day before the Senior close keeps
 * junior < senior < kickoff on every weekday, and is identical to the plain
 * reading for the Friday/Saturday fixtures the club actually plays.
 */
export function pollCloseFor(membershipClass: MembershipClass, matchDate: Date): Date {
  const seniorClose = lastEveningBefore(POLL_CLOSE_WEEKDAY.senior, matchDate);
  if (membershipClass === "senior") return seniorClose;

  const juniorClose = lastEveningBefore(POLL_CLOSE_WEEKDAY.junior, matchDate);
  return juniorClose < seniorClose ? juniorClose : new Date(seniorClose.getTime() - 86_400_000);
}

/** Whether this member class may still vote on a match at time `asOf`. */
export function canVoteNow(
  membershipClass: MembershipClass,
  matchDate: Date,
  asOf: Date,
): { open: boolean; closesAt: Date } {
  const closesAt = pollCloseFor(membershipClass, matchDate);
  return { open: asOf <= closesAt, closesAt };
}

/**
 * §5.3.2 — a member who voted YES must withdraw it no later than Wednesday
 * night. The senior (Wednesday) cutoff is the withdrawal deadline for everyone,
 * since that's when the poll closes for all members (§5.2.3).
 */
export function voteWithdrawalDeadline(matchDate: Date): Date {
  return pollCloseFor("senior", matchDate);
}

/** §5.2.5 — the moment quorum must be satisfied, or the booking is released (§5.2.6). */
export function quorumDeadline(kickoff: Date): Date {
  return new Date(kickoff.getTime() - QUORUM_DEADLINE_HOURS_BEFORE_KICKOFF * 3_600_000);
}

/** §5.2.6 — should the venue booking be released to avoid financial liability? */
export function shouldReleaseBooking(yesVotes: number, kickoff: Date, asOf: Date): boolean {
  if (asOf < quorumDeadline(kickoff)) return false;
  return pollOutcome(yesVotes) === "cancel";
}
