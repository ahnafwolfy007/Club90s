/** §5.3–5.4 — Attendance obligations, no-show penalties and activity status. */

import type { MembershipClass } from "./dues";

/** §5.3.3 — failing to withdraw a YES vote and then not attending: 1 match suspension. */
export const NO_SHOW_SUSPENSION_MATCHES = 1;

/**
 * §5.4.1 / §5.4.4 — minimum attendance before a member is classified irregular:
 * Junior Members one match per calendar month, Senior Members one per two months.
 */
export const MIN_ATTENDANCE: Record<MembershipClass, { matches: number; withinMonths: number }> = {
  junior: { matches: 1, withinMonths: 1 },
  senior: { matches: 1, withinMonths: 2 },
};

export type ActivityStatus = "active" | "irregular";

/**
 * §5.4.2 / §5.4.5 — a member who misses their attendance window without a
 * valid reason may be classified inactive or irregular. This computes the
 * classification; acting on it (suspension or removal) remains an Advisory
 * Board decision under §5.4.3.
 */
export function classifyActivity(
  membershipClass: MembershipClass,
  monthsSinceLastAttendance: number | null,
): { status: ActivityStatus; reason: string } {
  const { withinMonths } = MIN_ATTENDANCE[membershipClass];

  if (monthsSinceLastAttendance === null) {
    return {
      status: "irregular",
      reason: `No recorded attendance yet — ${membershipClass === "junior" ? "§5.4.1" : "§5.4.4"} expects at least one match every ${withinMonths} month${withinMonths > 1 ? "s" : ""}.`,
    };
  }

  if (monthsSinceLastAttendance > withinMonths) {
    return {
      status: "irregular",
      reason: `Last attended ${monthsSinceLastAttendance} months ago, beyond the ${withinMonths}-month window (${membershipClass === "junior" ? "§5.4.2" : "§5.4.5"}). Subject to Advisory Board review.`,
    };
  }

  return { status: "active", reason: "Meeting the attendance requirement." };
}

/**
 * §5.3.3 — did this RSVP earn a suspension? A member is penalised only when
 * they left a YES standing past the withdrawal deadline and then didn't show.
 *
 * §5.3.4 leaves room for exemption on emergency/illness grounds, which is an
 * Advisory Board call — hence `excused` short-circuits the penalty rather than
 * being inferred here.
 */
export function noShowPenalty(params: {
  votedYes: boolean;
  withdrewBeforeDeadline: boolean;
  attended: boolean;
  excused: boolean;
}): { penalised: boolean; matches: number; reason: string } {
  if (!params.votedYes || params.withdrewBeforeDeadline || params.attended) {
    return { penalised: false, matches: 0, reason: "No penalty applies." };
  }

  if (params.excused) {
    return {
      penalised: false,
      matches: 0,
      reason: "Excused under §5.3.4 — notified an Executive Committee President.",
    };
  }

  return {
    penalised: true,
    matches: NO_SHOW_SUSPENSION_MATCHES,
    reason: "Voted YES, did not withdraw by the deadline, and did not attend — one match suspension (§5.3.3).",
  };
}
