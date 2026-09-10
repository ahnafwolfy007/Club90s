/**
 * Adversarial and exhaustive coverage of the rulebook rules.
 *
 * rulebook.test.ts documents intended behaviour in readable terms. This file
 * attacks the same rules: exact threshold boundaries, exhaustive sweeps over
 * input domains, calendar edges (month/year/leap-year rollovers, every weekday),
 * timezone seams, and malformed input. Anything that only breaks at 23:59 on the
 * last Tuesday of a leap February should break here first.
 */
import { describe, it, expect } from "vitest";
import {
  perMatchFee,
  matchFeesForMonth,
  duesDueDate,
  daysOverdue,
  votingSuspendedForArrears,
  expectedDuesFor,
  reactivationAmount,
  monthlyDuesFor,
  MONTHLY_PASS_BDT,
  MONTHLY_MATCH_FEE_CEILING_BDT,
  ARREARS_VOTING_SUSPENSION_DAYS,
} from "./dues";
import {
  pollOutcome,
  pollCloseFor,
  canVoteNow,
  voteWithdrawalDeadline,
  quorumDeadline,
  shouldReleaseBooking,
  QUORUM_PROCEED,
  QUORUM_OPPONENT_MIN,
  QUORUM_OPPONENT_MAX,
  CLUB_UTC_OFFSET_HOURS,
  POLL_CLOSE_HOUR_LOCAL,
} from "./voting";
import { canClaimJersey, remainingJerseySlots } from "./jersey";
import { canContestElection, canHoldGovernanceRole, presidentTermEnd, vacancyDeadline } from "./eligibility";
import { classifyActivity, noShowPenalty, MIN_ATTENDANCE } from "./attendance";
import {
  monthsSubjectToRules,
  eventSubjectToRules,
  RULES_ENFORCED_FROM,
  RULES_ENFORCED_FROM_MONTH,
} from "./effective";

// ---------------------------------------------------------------------------
// §5.2.4 — poll outcome: exhaustive partition of the input domain
// ---------------------------------------------------------------------------

describe("poll outcome partitions every possible vote count", () => {
  it("maps 0–60 votes to exactly one outcome, with no gaps", () => {
    for (let votes = 0; votes <= 60; votes++) {
      const outcome = pollOutcome(votes);
      expect(["proceed", "arrange_opponent", "cancel", "undetermined"]).toContain(outcome);
    }
  });

  it("places every boundary on the correct side", () => {
    // <10 cancels; 10–12 opponent; 13–14 undefined by the rulebook; >=15 proceeds.
    expect(pollOutcome(QUORUM_OPPONENT_MIN - 1)).toBe("cancel");
    expect(pollOutcome(QUORUM_OPPONENT_MIN)).toBe("arrange_opponent");
    expect(pollOutcome(QUORUM_OPPONENT_MAX)).toBe("arrange_opponent");
    expect(pollOutcome(QUORUM_OPPONENT_MAX + 1)).toBe("undetermined");
    expect(pollOutcome(QUORUM_PROCEED - 1)).toBe("undetermined");
    expect(pollOutcome(QUORUM_PROCEED)).toBe("proceed");
  });

  it("never regresses to a worse outcome as votes increase", () => {
    // Monotonicity: rank outcomes and assert the sequence never goes backwards,
    // except through the documented undetermined band.
    const rank = { cancel: 0, arrange_opponent: 1, undetermined: 2, proceed: 3 } as const;
    let previous = -1;
    for (let votes = 0; votes <= 40; votes++) {
      const current = rank[pollOutcome(votes)];
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("treats nonsensical vote counts as a cancellation rather than throwing", () => {
    expect(pollOutcome(-1)).toBe("cancel");
    expect(pollOutcome(-999)).toBe("cancel");
  });

  it("handles an implausibly large turnout", () => {
    expect(pollOutcome(Number.MAX_SAFE_INTEGER)).toBe("proceed");
  });
});

// ---------------------------------------------------------------------------
// §2.2.2 — match fees: ceiling invariant and degenerate inputs
// ---------------------------------------------------------------------------

describe("match fees never exceed the monthly ceiling", () => {
  it("holds for every match count from 0 to 50", () => {
    for (let matches = 0; matches <= 50; matches++) {
      const perMatch = matchFeesForMonth("per_match", matches);
      expect(perMatch).toBeLessThanOrEqual(MONTHLY_MATCH_FEE_CEILING_BDT);
      expect(perMatch).toBeGreaterThanOrEqual(0);
    }
  });

  it("never charges pay-per-match more than the monthly pass — the whole point of the cap", () => {
    for (let matches = 0; matches <= 50; matches++) {
      expect(matchFeesForMonth("per_match", matches)).toBeLessThanOrEqual(
        matchFeesForMonth("monthly_pass", matches),
      );
    }
  });

  it("increases monotonically with matches played, then plateaus", () => {
    let previous = -1;
    for (let matches = 0; matches <= 20; matches++) {
      const fee = matchFeesForMonth("per_match", matches);
      expect(fee).toBeGreaterThanOrEqual(previous);
      previous = fee;
    }
    // Plateau reached by the 2nd match and never broken.
    expect(matchFeesForMonth("per_match", 2)).toBe(MONTHLY_PASS_BDT);
    expect(matchFeesForMonth("per_match", 20)).toBe(MONTHLY_PASS_BDT);
  });

  it("charges nothing for zero or negative match counts", () => {
    expect(matchFeesForMonth("per_match", 0)).toBe(0);
    expect(matchFeesForMonth("per_match", -3)).toBe(0);
  });

  it("still charges the full pass for zero matches — it is a pass, not a usage fee", () => {
    expect(matchFeesForMonth("monthly_pass", 0)).toBe(MONTHLY_PASS_BDT);
  });

  it("returns nothing for a zeroth or negative match index", () => {
    expect(perMatchFee(0)).toBe(0);
    expect(perMatchFee(-1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2.3 — due dates and arrears across calendar edges
// ---------------------------------------------------------------------------

describe("due dates land on the 7th across every calendar edge", () => {
  it("works for all twelve months of a year", () => {
    for (let month = 1; month <= 12; month++) {
      const feeMonth = `2026-${String(month).padStart(2, "0")}`;
      const due = duesDueDate(feeMonth);
      expect(due.getUTCDate()).toBe(7);
      expect(due.getUTCMonth()).toBe(month - 1);
      expect(due.getUTCFullYear()).toBe(2026);
    }
  });

  it("handles January and December without rolling into an adjacent year", () => {
    expect(duesDueDate("2026-01").toISOString().slice(0, 10)).toBe("2026-01-07");
    expect(duesDueDate("2026-12").toISOString().slice(0, 10)).toBe("2026-12-07");
  });

  it("handles a leap-year February", () => {
    expect(duesDueDate("2028-02").toISOString().slice(0, 10)).toBe("2028-02-07");
  });
});

describe("arrears boundaries are exact", () => {
  const due = duesDueDate("2026-09"); // 2026-09-07T23:59:59Z

  it("reports zero overdue right up to the final second of the due date", () => {
    expect(daysOverdue("2026-09", due)).toBe(0);
    expect(daysOverdue("2026-09", new Date(due.getTime() - 1))).toBe(0);
  });

  it("starts counting the instant the due date passes", () => {
    expect(daysOverdue("2026-09", new Date(due.getTime() + 1))).toBe(0); // same day, <24h
    expect(daysOverdue("2026-09", new Date(due.getTime() + 86_400_000))).toBe(1);
  });

  it("does not suspend at exactly 30 days — the rule says *exceeding* 30", () => {
    const exactly30 = new Date(due.getTime() + ARREARS_VOTING_SUSPENSION_DAYS * 86_400_000);
    expect(daysOverdue("2026-09", exactly30)).toBe(ARREARS_VOTING_SUSPENSION_DAYS);
    expect(votingSuspendedForArrears(["2026-09"], exactly30).suspended).toBe(false);
  });

  it("suspends the moment it crosses into day 31", () => {
    const day31 = new Date(due.getTime() + 31 * 86_400_000);
    expect(votingSuspendedForArrears(["2026-09"], day31).suspended).toBe(true);
  });

  it("is unaffected by the order unpaid months arrive in", () => {
    const asOf = new Date("2027-01-01T00:00:00Z");
    const ascending = votingSuspendedForArrears(["2026-09", "2026-10", "2026-11"], asOf);
    const descending = votingSuspendedForArrears(["2026-11", "2026-10", "2026-09"], asOf);
    const shuffled = votingSuspendedForArrears(["2026-10", "2026-09", "2026-11"], asOf);

    expect(ascending.oldestUnpaidMonth).toBe("2026-09");
    expect(descending.oldestUnpaidMonth).toBe("2026-09");
    expect(shuffled.oldestUnpaidMonth).toBe("2026-09");
  });

  it("does not mutate the caller's array while finding the oldest month", () => {
    const months = ["2026-11", "2026-09", "2026-10"];
    votingSuspendedForArrears(months, new Date("2027-01-01T00:00:00Z"));
    expect(months).toEqual(["2026-11", "2026-09", "2026-10"]);
  });

  it("sorts correctly across a year boundary", () => {
    const asOf = new Date("2027-06-01T00:00:00Z");
    expect(votingSuspendedForArrears(["2027-01", "2026-12"], asOf).oldestUnpaidMonth).toBe("2026-12");
  });

  it("clears suspension entirely once nothing is owed", () => {
    const result = votingSuspendedForArrears([], new Date("2030-01-01T00:00:00Z"));
    expect(result.suspended).toBe(false);
    expect(result.oldestUnpaidMonth).toBeNull();
    expect(result.daysOverdue).toBe(0);
  });

  it("never suspends a member for a month that has not fallen due yet", () => {
    // Dues for October, checked in early October before the 7th.
    expect(votingSuspendedForArrears(["2026-10"], new Date("2026-10-03T00:00:00Z")).suspended).toBe(false);
  });
});

describe("the rulebook's fee schedule respects its own effective date", () => {
  it("switches on exactly at the effective month, not before", () => {
    expect(expectedDuesFor("senior", "2026-08")).toBeNull();
    expect(expectedDuesFor("senior", "2026-09")).toBe(200);
  });

  it("compares months correctly across a year boundary", () => {
    expect(expectedDuesFor("senior", "2025-12")).toBeNull();
    expect(expectedDuesFor("senior", "2027-01")).toBe(200);
  });

  it("keeps Juniors at zero rather than null once the schedule applies", () => {
    // Null means "no rule yet"; zero means "the rule says they owe nothing".
    // Conflating the two would show exempt Juniors as unassessed.
    expect(expectedDuesFor("junior", "2026-09")).toBe(0);
    expect(expectedDuesFor("junior", "2026-08")).toBeNull();
  });
});

describe("reactivation billing (§5.4.6)", () => {
  it("always bills at least the reactivation month itself", () => {
    expect(reactivationAmount([], "senior")).toBe(monthlyDuesFor("senior"));
  });

  it("scales linearly with the backlog", () => {
    for (let backlog = 0; backlog <= 12; backlog++) {
      const months = Array.from({ length: backlog }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
      expect(reactivationAmount(months, "senior")).toBe(200 * (backlog + 1));
    }
  });

  it("costs a Junior nothing no matter how long they were away — they were never liable", () => {
    expect(reactivationAmount(["2025-01", "2025-02", "2025-03"], "junior")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Enforcement start — the rulebook applies forward only, never retroactively
// ---------------------------------------------------------------------------

describe("rules apply from the enforcement date onward, never backwards", () => {
  it("ignores arrears from before enforcement, so old debt cannot suspend anyone", () => {
    const legacyDebt = ["2025-10", "2026-03", "2026-08"];
    expect(monthsSubjectToRules(legacyDebt)).toEqual([]);

    // A member carrying a year of legacy debt is not suspended on day one.
    const asOf = new Date("2026-12-01T00:00:00Z");
    expect(votingSuspendedForArrears(monthsSubjectToRules(legacyDebt), asOf).suspended).toBe(false);
  });

  it("still counts arrears accrued after enforcement", () => {
    const mixed = ["2026-07", "2026-09", "2026-10"];
    expect(monthsSubjectToRules(mixed)).toEqual(["2026-09", "2026-10"]);

    const asOf = new Date("2026-12-01T00:00:00Z");
    const result = votingSuspendedForArrears(monthsSubjectToRules(mixed), asOf);
    expect(result.suspended).toBe(true);
    expect(result.oldestUnpaidMonth).toBe("2026-09");
  });

  it("keeps the enforcement month itself in scope — it is the first assessed period", () => {
    expect(monthsSubjectToRules([RULES_ENFORCED_FROM_MONTH])).toEqual([RULES_ENFORCED_FROM_MONTH]);
  });

  it("excludes matches played before enforcement from any penalty", () => {
    expect(eventSubjectToRules(new Date("2026-09-09T23:59:59Z"))).toBe(false);
    expect(eventSubjectToRules(RULES_ENFORCED_FROM)).toBe(true);
    expect(eventSubjectToRules(new Date("2026-09-11T00:00:00Z"))).toBe(true);
  });

  it("leaves the caller's month list untouched when filtering", () => {
    const months = ["2026-07", "2026-09"];
    monthsSubjectToRules(months);
    expect(months).toEqual(["2026-07", "2026-09"]);
  });
});

// ---------------------------------------------------------------------------
// §5.2.2–5.2.3 — poll deadlines across every weekday and timezone seam
// ---------------------------------------------------------------------------

describe("poll deadlines hold for a match on any weekday", () => {
  // A week of fixtures, Sunday 6 Sep 2026 through Saturday 12 Sep 2026, 18:00 Dhaka.
  const week = [
    ["Sunday", "2026-09-06T12:00:00Z"],
    ["Monday", "2026-09-07T12:00:00Z"],
    ["Tuesday", "2026-09-08T12:00:00Z"],
    ["Wednesday", "2026-09-09T12:00:00Z"],
    ["Thursday", "2026-09-10T12:00:00Z"],
    ["Friday", "2026-09-11T12:00:00Z"],
    ["Saturday", "2026-09-12T12:00:00Z"],
  ] as const;

  for (const [dayName, iso] of week) {
    it(`closes both polls strictly before a ${dayName} fixture`, () => {
      const match = new Date(iso);
      const junior = pollCloseFor("junior", match);
      const senior = pollCloseFor("senior", match);

      expect(junior.getTime()).toBeLessThan(match.getTime());
      expect(senior.getTime()).toBeLessThan(match.getTime());
    });

    it(`lands the ${dayName} fixture's deadlines on a Tuesday and a Wednesday in club time`, () => {
      const match = new Date(iso);
      const asLocalWeekday = (d: Date) =>
        new Date(d.getTime() + CLUB_UTC_OFFSET_HOURS * 3_600_000).getUTCDay();

      expect(asLocalWeekday(pollCloseFor("junior", match))).toBe(2); // Tuesday
      expect(asLocalWeekday(pollCloseFor("senior", match))).toBe(3); // Wednesday
    });
  }

  it("always closes at the club's local evening hour, whatever the fixture time", () => {
    for (const [, iso] of week) {
      const close = pollCloseFor("senior", new Date(iso));
      const localHour = new Date(close.getTime() + CLUB_UTC_OFFSET_HOURS * 3_600_000).getUTCHours();
      expect(localHour).toBe(POLL_CLOSE_HOUR_LOCAL);
    }
  });

  it("gives Seniors strictly more time than Juniors for every fixture in the week", () => {
    for (const [, iso] of week) {
      const match = new Date(iso);
      expect(pollCloseFor("senior", match).getTime()).toBeGreaterThan(pollCloseFor("junior", match).getTime());
    }
  });

  it("closes a Tuesday fixture's junior poll a full week earlier, never same-day", () => {
    // Guards the daysBack<=0 branch: a Tuesday match must not resolve to its own
    // day, which would leave the poll open past kickoff.
    const tuesdayMatch = new Date("2026-09-08T12:00:00Z");
    const close = pollCloseFor("junior", tuesdayMatch);
    expect(close.toISOString()).toBe("2026-09-01T15:00:00.000Z");
    expect(close.getTime()).toBeLessThan(tuesdayMatch.getTime());
  });

  it("handles a fixture just after local midnight without slipping a day", () => {
    // 00:30 Dhaka on Saturday 12 Sep = 18:30 UTC on Friday 11 Sep.
    const lateNight = new Date("2026-09-11T18:30:00Z");
    const asLocalWeekday = (d: Date) => new Date(d.getTime() + CLUB_UTC_OFFSET_HOURS * 3_600_000).getUTCDay();
    expect(asLocalWeekday(pollCloseFor("senior", lateNight))).toBe(3);
  });

  it("crosses a month boundary cleanly", () => {
    // Friday 2 October 2026 — deadlines fall back into September.
    const match = new Date("2026-10-02T12:00:00Z");
    expect(pollCloseFor("junior", match).toISOString()).toBe("2026-09-29T15:00:00.000Z");
    expect(pollCloseFor("senior", match).toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });

  it("crosses a year boundary cleanly", () => {
    // Friday 1 January 2027 — deadlines fall back into December 2026.
    const match = new Date("2027-01-01T12:00:00Z");
    expect(pollCloseFor("junior", match).toISOString()).toBe("2026-12-29T15:00:00.000Z");
    expect(pollCloseFor("senior", match).toISOString()).toBe("2026-12-30T15:00:00.000Z");
  });

  it("crosses a leap-year February boundary cleanly", () => {
    // Friday 3 March 2028; 2028 is a leap year, so the week back includes 29 Feb.
    const match = new Date("2028-03-03T12:00:00Z");
    expect(pollCloseFor("junior", match).toISOString()).toBe("2028-02-29T15:00:00.000Z");
    expect(pollCloseFor("senior", match).toISOString()).toBe("2028-03-01T15:00:00.000Z");
  });
});

describe("voting windows open and shut on the exact second", () => {
  const friday = new Date("2026-09-11T12:00:00Z");

  it("is still open at the closing instant, and shut one millisecond later", () => {
    const juniorClose = pollCloseFor("junior", friday);
    expect(canVoteNow("junior", friday, juniorClose).open).toBe(true);
    expect(canVoteNow("junior", friday, new Date(juniorClose.getTime() + 1)).open).toBe(false);
  });

  it("keeps Seniors open in the exact window after Juniors shut", () => {
    const juniorClose = pollCloseFor("junior", friday);
    const seniorClose = pollCloseFor("senior", friday);

    const between = new Date((juniorClose.getTime() + seniorClose.getTime()) / 2);
    expect(canVoteNow("junior", friday, between).open).toBe(false);
    expect(canVoteNow("senior", friday, between).open).toBe(true);
  });

  it("uses the senior close as the withdrawal deadline for everyone (§5.3.2)", () => {
    expect(voteWithdrawalDeadline(friday).getTime()).toBe(pollCloseFor("senior", friday).getTime());
  });

  it("is open well in advance of the fixture", () => {
    const twoWeeksBefore = new Date(friday.getTime() - 14 * 86_400_000);
    expect(canVoteNow("junior", friday, twoWeeksBefore).open).toBe(true);
    expect(canVoteNow("senior", friday, twoWeeksBefore).open).toBe(true);
  });
});

describe("§5.2.5–5.2.6 quorum deadline and booking release", () => {
  const kickoff = new Date("2026-09-11T12:00:00Z");
  const deadline = quorumDeadline(kickoff);

  it("sits exactly 48 hours before kickoff", () => {
    expect(kickoff.getTime() - deadline.getTime()).toBe(48 * 3_600_000);
  });

  it("does not release one millisecond before the deadline, but does at it", () => {
    expect(shouldReleaseBooking(0, kickoff, new Date(deadline.getTime() - 1))).toBe(false);
    expect(shouldReleaseBooking(0, kickoff, deadline)).toBe(true);
  });

  it("keeps the booking for any vote count at or above quorum, at the deadline", () => {
    for (let votes = QUORUM_OPPONENT_MIN; votes <= 25; votes++) {
      expect(shouldReleaseBooking(votes, kickoff, deadline)).toBe(false);
    }
  });

  it("releases for every vote count below quorum, at the deadline", () => {
    for (let votes = 0; votes < QUORUM_OPPONENT_MIN; votes++) {
      expect(shouldReleaseBooking(votes, kickoff, deadline)).toBe(true);
    }
  });

  it("still releases well after kickoff has passed, rather than silently reversing", () => {
    expect(shouldReleaseBooking(2, kickoff, new Date(kickoff.getTime() + 86_400_000))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6.2 — jersey allocation under every squad combination
// ---------------------------------------------------------------------------

describe("jersey allocation across every holder combination", () => {
  const coreA = { memberId: "core-a", squadType: "core" as const };
  const coreB = { memberId: "core-b", squadType: "core" as const };
  const genA = { memberId: "gen-a", squadType: "general" as const };
  const genB = { memberId: "gen-b", squadType: "general" as const };

  it("allows the first claimant of a free number, whichever squad", () => {
    expect(canClaimJersey(7, coreA, []).allowed).toBe(true);
    expect(canClaimJersey(7, genA, []).allowed).toBe(true);
  });

  it("permits exactly one core and one general to share a number", () => {
    expect(canClaimJersey(7, genA, [coreA]).allowed).toBe(true);
    expect(canClaimJersey(7, coreA, [genA]).allowed).toBe(true);
  });

  it("blocks a third claimant once both slots are taken", () => {
    expect(canClaimJersey(7, coreB, [coreA, genA]).allowed).toBe(false);
    expect(canClaimJersey(7, genB, [coreA, genA]).allowed).toBe(false);
  });

  it("blocks same-squad duplicates regardless of the other squad's state", () => {
    expect(canClaimJersey(7, coreB, [coreA]).allowed).toBe(false);
    expect(canClaimJersey(7, genB, [genA]).allowed).toBe(false);
  });

  it("is idempotent — re-claiming your own number always succeeds", () => {
    expect(canClaimJersey(7, coreA, [coreA]).allowed).toBe(true);
    expect(canClaimJersey(7, genA, [coreA, genA]).allowed).toBe(true);
  });

  it("explains a refusal rather than failing silently", () => {
    const refusal = canClaimJersey(7, coreB, [coreA]);
    expect(refusal.allowed).toBe(false);
    if (!refusal.allowed) {
      expect(refusal.reason).toContain("#7");
      expect(refusal.reason.length).toBeGreaterThan(20);
    }
  });

  it("handles unusual but legal shirt numbers", () => {
    for (const number of [0, 1, 99, 100]) {
      expect(canClaimJersey(number, coreA, []).allowed).toBe(true);
    }
  });

  it("reports remaining slots consistently with what it will actually allow", () => {
    const cases = [[], [coreA], [genA], [coreA, genA]];
    for (const holders of cases) {
      const slots = remainingJerseySlots(holders);
      expect(canClaimJersey(7, coreB, holders).allowed).toBe(slots.core > 0);
      expect(canClaimJersey(7, genB, holders).allowed).toBe(slots.general > 0);
    }
  });
});

// ---------------------------------------------------------------------------
// §3.4 — eligibility and governance conflicts
// ---------------------------------------------------------------------------

describe("election eligibility rejects every disqualifying state", () => {
  const asOf = new Date("2027-01-01T00:00:00Z");

  it("bars every non-active member status", () => {
    for (const status of ["inactive", "pending", "suspended", "", "ACTIVE"]) {
      expect(canContestElection({ memberStatus: status, unpaidMonths: [], asOf }).eligible).toBe(false);
    }
  });

  it("admits only the exact lowercase active status", () => {
    expect(canContestElection({ memberStatus: "active", unpaidMonths: [], asOf }).eligible).toBe(true);
  });

  it("admits a member owing a month that is not yet 30 days overdue", () => {
    const justDue = new Date("2026-12-20T00:00:00Z"); // Dec dues, due Dec 7
    expect(canContestElection({ memberStatus: "active", unpaidMonths: ["2026-12"], asOf: justDue }).eligible).toBe(true);
  });

  it("bars a member once that same debt ages past the window", () => {
    const later = new Date("2027-01-20T00:00:00Z");
    expect(canContestElection({ memberStatus: "active", unpaidMonths: ["2026-12"], asOf: later }).eligible).toBe(false);
  });

  it("cites the reason so the member is told why, not just refused", () => {
    const result = canContestElection({ memberStatus: "inactive", unpaidMonths: [], asOf });
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("§3.4.7");
  });
});

describe("governance role conflicts (§3.4.3) hold in both directions", () => {
  it("refuses each conflicting pairing", () => {
    expect(canHoldGovernanceRole(["advisory_board"], "executive_president").eligible).toBe(false);
    expect(canHoldGovernanceRole(["executive_president"], "advisory_board").eligible).toBe(false);
  });

  it("allows re-granting a role the member already holds", () => {
    expect(canHoldGovernanceRole(["advisory_board"], "advisory_board").eligible).toBe(true);
    expect(canHoldGovernanceRole(["executive_president"], "executive_president").eligible).toBe(true);
  });

  it("allows any role from an empty slate", () => {
    for (const role of ["advisory_board", "executive_president", "founding_member", "member"] as const) {
      expect(canHoldGovernanceRole([], role).eligible).toBe(true);
    }
  });

  it("is unaffected by unrelated roles held alongside", () => {
    expect(canHoldGovernanceRole(["founding_member", "member"], "advisory_board").eligible).toBe(true);
    expect(canHoldGovernanceRole(["founding_member", "member"], "executive_president").eligible).toBe(true);
  });

  it("still catches the conflict when other roles are also present", () => {
    expect(canHoldGovernanceRole(["founding_member", "advisory_board"], "executive_president").eligible).toBe(false);
  });

  it("names the blocking role so an admin knows what to remove", () => {
    const result = canHoldGovernanceRole(["advisory_board"], "executive_president");
    if (!result.eligible) expect(result.reason).toContain("§3.4.3");
  });
});

describe("term and vacancy dates survive calendar edges", () => {
  it("runs a term exactly one year on an ordinary date", () => {
    expect(presidentTermEnd(new Date("2026-09-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-09-10");
  });

  it("rolls a 29 February term end forward to 1 March in a non-leap year", () => {
    // JavaScript normalises the impossible 29 Feb 2029; documented so nobody
    // mistakes the extra day for a bug in the term calculation.
    expect(presidentTermEnd(new Date("2028-02-29T00:00:00Z")).toISOString().slice(0, 10)).toBe("2029-03-01");
  });

  it("crosses a year boundary correctly", () => {
    expect(presidentTermEnd(new Date("2026-12-31T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-12-31");
  });

  it("gives seven days to fill a vacancy, across a month end", () => {
    expect(vacancyDeadline(new Date("2026-09-28T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("gives seven days across a year end", () => {
    expect(vacancyDeadline(new Date("2026-12-30T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-06");
  });
});

// ---------------------------------------------------------------------------
// §5.3–5.4 — discipline: exhaustive truth table
// ---------------------------------------------------------------------------

describe("no-show penalty over its complete truth table", () => {
  const bools = [false, true];

  it("penalises exactly one of the sixteen possible states", () => {
    const penalised: string[] = [];

    for (const votedYes of bools) {
      for (const withdrewBeforeDeadline of bools) {
        for (const attended of bools) {
          for (const excused of bools) {
            const result = noShowPenalty({ votedYes, withdrewBeforeDeadline, attended, excused });
            if (result.penalised) {
              penalised.push(`yes=${votedYes} withdrew=${withdrewBeforeDeadline} attended=${attended} excused=${excused}`);
            }
          }
        }
      }
    }

    // The only punishable state: voted YES, never withdrew, didn't attend, not excused.
    expect(penalised).toEqual(["yes=true withdrew=false attended=false excused=false"]);
  });

  it("always issues exactly one match when it penalises, and zero otherwise", () => {
    for (const votedYes of bools) {
      for (const withdrewBeforeDeadline of bools) {
        for (const attended of bools) {
          for (const excused of bools) {
            const result = noShowPenalty({ votedYes, withdrewBeforeDeadline, attended, excused });
            expect(result.matches).toBe(result.penalised ? 1 : 0);
            expect(result.reason.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("lets an excuse override an otherwise punishable no-show (§5.3.4)", () => {
    const punishable = { votedYes: true, withdrewBeforeDeadline: false, attended: false };
    expect(noShowPenalty({ ...punishable, excused: false }).penalised).toBe(true);
    expect(noShowPenalty({ ...punishable, excused: true }).penalised).toBe(false);
  });
});

describe("activity classification at its exact thresholds", () => {
  it("uses a one-month window for Juniors and two for Seniors", () => {
    expect(MIN_ATTENDANCE.junior.withinMonths).toBe(1);
    expect(MIN_ATTENDANCE.senior.withinMonths).toBe(2);
  });

  it("holds a Junior active at the limit and flags them past it", () => {
    expect(classifyActivity("junior", 0).status).toBe("active");
    expect(classifyActivity("junior", 1).status).toBe("active");
    expect(classifyActivity("junior", 2).status).toBe("irregular");
  });

  it("holds a Senior active at the limit and flags them past it", () => {
    expect(classifyActivity("senior", 1).status).toBe("active");
    expect(classifyActivity("senior", 2).status).toBe("active");
    expect(classifyActivity("senior", 3).status).toBe("irregular");
  });

  it("is never stricter on a Senior than on a Junior for the same absence", () => {
    for (let months = 0; months <= 12; months++) {
      const junior = classifyActivity("junior", months).status;
      const senior = classifyActivity("senior", months).status;
      if (senior === "irregular") expect(junior).toBe("irregular");
    }
  });

  it("flags a member with no attendance history at all", () => {
    expect(classifyActivity("junior", null).status).toBe("irregular");
    expect(classifyActivity("senior", null).status).toBe("irregular");
  });

  it("always explains the classification", () => {
    for (const months of [null, 0, 1, 2, 3, 12]) {
      for (const cls of ["junior", "senior"] as const) {
        expect(classifyActivity(cls, months).reason.length).toBeGreaterThan(10);
      }
    }
  });
});
