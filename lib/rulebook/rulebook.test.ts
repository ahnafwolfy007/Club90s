import { describe, it, expect } from "vitest";
import {
  monthlyDuesFor,
  perMatchFee,
  matchFeesForMonth,
  duesDueDate,
  daysOverdue,
  votingSuspendedForArrears,
  reactivationAmount,
  expectedDuesFor,
  MONTHLY_PASS_BDT,
} from "./dues";
import { pollOutcome, pollCloseFor, canVoteNow, quorumDeadline, shouldReleaseBooking } from "./voting";
import { canClaimJersey } from "./jersey";
import { canContestElection, canHoldGovernanceRole, presidentTermEnd } from "./eligibility";
import { classifyActivity, noShowPenalty } from "./attendance";

describe("§2.1–2.2 dues and match fees", () => {
  it("charges Senior Members 200 BDT a month and exempts Juniors", () => {
    expect(monthlyDuesFor("senior")).toBe(200);
    expect(monthlyDuesFor("junior")).toBe(0);
  });

  it("prices pay-per-match at 600, then 900, then free", () => {
    expect(perMatchFee(1)).toBe(600);
    expect(perMatchFee(2)).toBe(900);
    expect(perMatchFee(3)).toBe(0);
    expect(perMatchFee(9)).toBe(0);
  });

  it("caps pay-per-match at the monthly pass price, never above it", () => {
    // 600 + 900 = 1500 exactly at two matches, and free thereafter.
    expect(matchFeesForMonth("per_match", 2)).toBe(MONTHLY_PASS_BDT);
    expect(matchFeesForMonth("per_match", 5)).toBe(MONTHLY_PASS_BDT);
    expect(matchFeesForMonth("per_match", 1)).toBe(600);
    expect(matchFeesForMonth("per_match", 0)).toBe(0);
  });

  it("charges the monthly pass flat, regardless of matches played", () => {
    expect(matchFeesForMonth("monthly_pass", 0)).toBe(1500);
    expect(matchFeesForMonth("monthly_pass", 8)).toBe(1500);
  });

  it("applies the rulebook schedule only from its effective month onward", () => {
    expect(expectedDuesFor("senior", "2026-09")).toBe(200);
    expect(expectedDuesFor("senior", "2026-12")).toBe(200);
    expect(expectedDuesFor("junior", "2026-09")).toBe(0);
  });

  it("declines to judge pre-rulebook months, which used legacy amounts", () => {
    expect(expectedDuesFor("senior", "2026-08")).toBeNull();
    expect(expectedDuesFor("senior", "2025-10")).toBeNull();
  });
});

describe("§2.3 payment deadlines and arrears", () => {
  it("falls due on the 7th of the month", () => {
    expect(duesDueDate("2026-09").toISOString().slice(0, 10)).toBe("2026-09-07");
  });

  it("reports nothing overdue before the 7th passes", () => {
    expect(daysOverdue("2026-09", new Date("2026-09-05T00:00:00Z"))).toBe(0);
    expect(daysOverdue("2026-09", new Date("2026-09-07T12:00:00Z"))).toBe(0);
  });

  it("suspends voting rights only past 30 days overdue", () => {
    const at29 = new Date("2026-10-06T00:00:00Z"); // 29 days after Sep 7
    const at40 = new Date("2026-10-17T00:00:00Z");

    expect(votingSuspendedForArrears(["2026-09"], at29).suspended).toBe(false);
    expect(votingSuspendedForArrears(["2026-09"], at40).suspended).toBe(true);
  });

  it("measures arrears from the oldest unpaid month, not the newest", () => {
    const asOf = new Date("2026-12-01T00:00:00Z");
    const result = votingSuspendedForArrears(["2026-11", "2026-09", "2026-10"], asOf);
    expect(result.oldestUnpaidMonth).toBe("2026-09");
    expect(result.suspended).toBe(true);
  });

  it("leaves a paid-up member unsuspended", () => {
    expect(votingSuspendedForArrears([], new Date("2026-12-01T00:00:00Z")).suspended).toBe(false);
  });

  it("bills reactivation as the current month plus every outstanding one (§5.4.6)", () => {
    expect(reactivationAmount(["2026-08", "2026-09"], "senior")).toBe(600);
    expect(reactivationAmount([], "senior")).toBe(200);
    expect(reactivationAmount(["2026-08"], "junior")).toBe(0);
  });
});

describe("§5.2 poll outcomes", () => {
  it("proceeds at 15 or more YES votes", () => {
    expect(pollOutcome(15)).toBe("proceed");
    expect(pollOutcome(22)).toBe("proceed");
  });

  it("arranges an opponent between 10 and 12", () => {
    expect(pollOutcome(10)).toBe("arrange_opponent");
    expect(pollOutcome(12)).toBe("arrange_opponent");
  });

  it("cancels below 10", () => {
    expect(pollOutcome(9)).toBe("cancel");
    expect(pollOutcome(0)).toBe("cancel");
  });

  it("flags 13–14 as undetermined — the rulebook defines no rule for that band", () => {
    expect(pollOutcome(13)).toBe("undetermined");
    expect(pollOutcome(14)).toBe("undetermined");
  });
});

describe("§5.2.2–5.2.3 tiered voting deadlines", () => {
  // Friday 11 September 2026, 18:00 Dhaka (12:00 UTC).
  const friday = new Date("2026-09-11T12:00:00Z");

  it("closes Junior voting on the preceding Tuesday evening", () => {
    const close = pollCloseFor("junior", friday);
    // Tuesday 8 Sep, 21:00 Dhaka = 15:00 UTC.
    expect(close.toISOString()).toBe("2026-09-08T15:00:00.000Z");
  });

  it("closes Senior voting on the preceding Wednesday evening", () => {
    const close = pollCloseFor("senior", friday);
    expect(close.toISOString()).toBe("2026-09-09T15:00:00.000Z");
  });

  it("gives Seniors a day longer than Juniors", () => {
    expect(pollCloseFor("senior", friday).getTime()).toBeGreaterThan(pollCloseFor("junior", friday).getTime());
  });

  it("shuts Juniors out on Wednesday while Seniors can still vote", () => {
    const wednesdayNoon = new Date("2026-09-09T06:00:00Z");
    expect(canVoteNow("junior", friday, wednesdayNoon).open).toBe(false);
    expect(canVoteNow("senior", friday, wednesdayNoon).open).toBe(true);
  });

  it("shuts everyone out after Wednesday evening", () => {
    const thursday = new Date("2026-09-10T06:00:00Z");
    expect(canVoteNow("junior", friday, thursday).open).toBe(false);
    expect(canVoteNow("senior", friday, thursday).open).toBe(false);
  });

  it("handles a Saturday fixture without walking back into the wrong week", () => {
    const saturday = new Date("2026-09-12T12:00:00Z");
    expect(pollCloseFor("junior", saturday).toISOString()).toBe("2026-09-08T15:00:00.000Z");
    expect(pollCloseFor("senior", saturday).toISOString()).toBe("2026-09-09T15:00:00.000Z");
  });
});

describe("§5.2.5–5.2.6 quorum deadline and booking release", () => {
  const kickoff = new Date("2026-09-11T12:00:00Z");

  it("sets the quorum deadline 48 hours before kickoff", () => {
    expect(quorumDeadline(kickoff).toISOString()).toBe("2026-09-09T12:00:00.000Z");
  });

  it("holds the booking while the deadline is still ahead, even on a weak poll", () => {
    expect(shouldReleaseBooking(4, kickoff, new Date("2026-09-08T12:00:00Z"))).toBe(false);
  });

  it("releases the booking once the deadline passes below quorum", () => {
    expect(shouldReleaseBooking(4, kickoff, new Date("2026-09-10T12:00:00Z"))).toBe(true);
  });

  it("keeps the booking when quorum is met at the deadline", () => {
    expect(shouldReleaseBooking(16, kickoff, new Date("2026-09-10T12:00:00Z"))).toBe(false);
  });
});

describe("§6.2 jersey allocation", () => {
  const core = { memberId: "a", squadType: "core" as const };
  const general = { memberId: "b", squadType: "general" as const };

  it("lets one General Pool member share a Core Squad number", () => {
    expect(canClaimJersey(9, general, [core]).allowed).toBe(true);
  });

  it("blocks a second General Pool member from the same number", () => {
    const claim = canClaimJersey(9, { memberId: "c", squadType: "general" }, [core, general]);
    expect(claim.allowed).toBe(false);
  });

  it("never lets two Core Squad members share a number", () => {
    const claim = canClaimJersey(9, { memberId: "c", squadType: "core" }, [core]);
    expect(claim.allowed).toBe(false);
  });

  it("lets a member keep the number they already hold", () => {
    expect(canClaimJersey(9, core, [core]).allowed).toBe(true);
  });

  it("allows a free number to anyone", () => {
    expect(canClaimJersey(42, general, []).allowed).toBe(true);
    expect(canClaimJersey(42, core, []).allowed).toBe(true);
  });
});

describe("§3.4 governance eligibility", () => {
  const asOf = new Date("2026-12-01T00:00:00Z");

  it("lets an active, paid-up member contest", () => {
    expect(canContestElection({ memberStatus: "active", unpaidMonths: [], asOf }).eligible).toBe(true);
  });

  it("bars an inactive member", () => {
    expect(canContestElection({ memberStatus: "inactive", unpaidMonths: [], asOf }).eligible).toBe(false);
  });

  it("bars a member in arrears — not in good standing", () => {
    expect(canContestElection({ memberStatus: "active", unpaidMonths: ["2026-09"], asOf }).eligible).toBe(false);
  });

  it("refuses to make an Advisory Board member an Executive President", () => {
    expect(canHoldGovernanceRole(["advisory_board"], "executive_president").eligible).toBe(false);
  });

  it("refuses to put an Executive President on the Advisory Board", () => {
    expect(canHoldGovernanceRole(["executive_president"], "advisory_board").eligible).toBe(false);
  });

  it("allows a Founding Member to take either seat on its own", () => {
    expect(canHoldGovernanceRole(["founding_member"], "advisory_board").eligible).toBe(true);
    expect(canHoldGovernanceRole(["founding_member"], "executive_president").eligible).toBe(true);
  });

  it("runs a presidential term for exactly one year", () => {
    expect(presidentTermEnd(new Date("2026-09-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-09-10");
  });
});

describe("§5.3–5.4 attendance and penalties", () => {
  it("suspends a no-show who never withdrew their YES", () => {
    const result = noShowPenalty({ votedYes: true, withdrewBeforeDeadline: false, attended: false, excused: false });
    expect(result.penalised).toBe(true);
    expect(result.matches).toBe(1);
  });

  it("spares a member who withdrew in time", () => {
    expect(
      noShowPenalty({ votedYes: true, withdrewBeforeDeadline: true, attended: false, excused: false }).penalised,
    ).toBe(false);
  });

  it("spares a member who actually turned up", () => {
    expect(
      noShowPenalty({ votedYes: true, withdrewBeforeDeadline: false, attended: true, excused: false }).penalised,
    ).toBe(false);
  });

  it("honours an Advisory Board exemption under §5.3.4", () => {
    expect(
      noShowPenalty({ votedYes: true, withdrewBeforeDeadline: false, attended: false, excused: true }).penalised,
    ).toBe(false);
  });

  it("never penalises someone who didn't vote YES", () => {
    expect(
      noShowPenalty({ votedYes: false, withdrewBeforeDeadline: false, attended: false, excused: false }).penalised,
    ).toBe(false);
  });

  it("marks a Junior irregular after more than one month away", () => {
    expect(classifyActivity("junior", 2).status).toBe("irregular");
    expect(classifyActivity("junior", 1).status).toBe("active");
  });

  it("gives Seniors two months before the same classification", () => {
    expect(classifyActivity("senior", 2).status).toBe("active");
    expect(classifyActivity("senior", 3).status).toBe("irregular");
  });

  it("treats a member who has never attended as irregular", () => {
    expect(classifyActivity("senior", null).status).toBe("irregular");
  });
});
