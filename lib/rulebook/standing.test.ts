import { describe, it, expect } from "vitest";
import { computeStanding, monthsBetween } from "./standing";

const ASOF = new Date("2026-10-05T00:00:00Z");
const MONTHS = ["2026-09", "2026-10"];

function standing(overrides: Partial<Parameters<typeof computeStanding>[0]> = {}) {
  return computeStanding({
    membershipClass: "senior",
    duesPaid: [],
    assessableMonths: MONTHS,
    activePenalties: 0,
    matchesSuspended: 0,
    asOf: ASOF,
    ...overrides,
  });
}

describe("monthsBetween", () => {
  it("includes both endpoints", () => {
    expect(monthsBetween("2026-09", "2026-11")).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("handles a single month", () => {
    expect(monthsBetween("2026-09", "2026-09")).toEqual(["2026-09"]);
  });

  it("rolls over a year boundary", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("returns nothing when the range is inverted", () => {
    expect(monthsBetween("2026-11", "2026-09")).toEqual([]);
  });
});

describe("§2.1.2 Junior exemption", () => {
  it("never puts a Junior in arrears, however long they go unpaid", () => {
    const result = standing({ membershipClass: "junior", assessableMonths: monthsBetween("2026-09", "2027-06") });
    expect(result.duesExempt).toBe(true);
    expect(result.monthlyDue).toBe(0);
    expect(result.unpaidMonths).toEqual([]);
    expect(result.amountOwed).toBe(0);
    expect(result.votingSuspended).toBe(false);
    expect(result.worst).toBe("cleared");
  });

  it("shows a Junior's current month as settled without any payment", () => {
    expect(standing({ membershipClass: "junior" }).currentMonth.settled).toBe(true);
  });

  it("still flags a Junior who has been penalised", () => {
    const result = standing({ membershipClass: "junior", activePenalties: 1 });
    expect(result.worst).toBe("penalised");
    expect(result.flags).toContain("penalised");
  });
});

describe("§2.2.1 Senior dues", () => {
  it("owes 200 for every unpaid assessable month", () => {
    const result = standing();
    expect(result.unpaidMonths).toEqual(["2026-09", "2026-10"]);
    expect(result.amountOwed).toBe(400);
  });

  it("clears a month once the full 200 is paid", () => {
    const result = standing({ duesPaid: [{ feeMonth: "2026-09", amountPaid: 200 }] });
    expect(result.unpaidMonths).toEqual(["2026-10"]);
    expect(result.amountOwed).toBe(200);
  });

  it("counts a partial payment as still owing, but only the shortfall", () => {
    const result = standing({ duesPaid: [{ feeMonth: "2026-09", amountPaid: 150 }] });
    expect(result.unpaidMonths).toContain("2026-09");
    expect(result.amountOwed).toBe(250); // 50 short in Sept + 200 for Oct
  });

  it("does not let an overpayment in one month cover another", () => {
    // Paying 500 in September doesn't settle October — each month stands alone.
    const result = standing({ duesPaid: [{ feeMonth: "2026-09", amountPaid: 500 }] });
    expect(result.unpaidMonths).toEqual(["2026-10"]);
    expect(result.amountOwed).toBe(200);
  });

  it("is fully cleared when every month is paid", () => {
    const result = standing({
      duesPaid: [
        { feeMonth: "2026-09", amountPaid: 200 },
        { feeMonth: "2026-10", amountPaid: 200 },
      ],
    });
    expect(result.amountOwed).toBe(0);
    expect(result.worst).toBe("cleared");
  });
});

describe("enforcement window", () => {
  it("ignores months before the rulebook took effect", () => {
    const result = standing({ assessableMonths: monthsBetween("2025-10", "2026-10") });
    // A year of legacy history, but only Sept and Oct 2026 are assessable.
    expect(result.unpaidMonths).toEqual(["2026-09", "2026-10"]);
    expect(result.amountOwed).toBe(400);
  });
});

describe("§2.3.2 voting suspension", () => {
  it("does not suspend while arrears are inside 30 days", () => {
    const result = standing({ asOf: new Date("2026-10-05T00:00:00Z") });
    expect(result.daysOverdue).toBeLessThanOrEqual(30);
    expect(result.votingSuspended).toBe(false);
    expect(result.worst).toBe("dues_owing");
  });

  it("suspends once the oldest debt passes 30 days", () => {
    const result = standing({ asOf: new Date("2026-10-20T00:00:00Z") });
    expect(result.votingSuspended).toBe(true);
    expect(result.worst).toBe("voting_suspended");
    expect(result.oldestUnpaidMonth).toBe("2026-09");
  });

  it("lifts the suspension as soon as the old debt is settled", () => {
    const late = new Date("2026-10-20T00:00:00Z");
    const stillOwing = standing({ asOf: late });
    expect(stillOwing.votingSuspended).toBe(true);

    const settled = standing({ asOf: late, duesPaid: [{ feeMonth: "2026-09", amountPaid: 200 }] });
    expect(settled.votingSuspended).toBe(false);
    expect(settled.unpaidMonths).toEqual(["2026-10"]);
  });

  it("reports dues_owing rather than double-counting when suspended", () => {
    const result = standing({ asOf: new Date("2026-10-20T00:00:00Z") });
    expect(result.flags).toContain("voting_suspended");
    expect(result.flags).not.toContain("dues_owing");
  });
});

describe("combined conditions", () => {
  it("surfaces both suspension and sanctions, worst first", () => {
    const result = standing({ asOf: new Date("2026-10-20T00:00:00Z"), activePenalties: 2 });
    expect(result.flags).toEqual(["voting_suspended", "penalised"]);
    expect(result.worst).toBe("voting_suspended");
  });

  it("flags a paid-up member who is nonetheless suspended from matches", () => {
    const result = standing({
      duesPaid: [
        { feeMonth: "2026-09", amountPaid: 200 },
        { feeMonth: "2026-10", amountPaid: 200 },
      ],
      activePenalties: 1,
      matchesSuspended: 1,
    });
    expect(result.worst).toBe("penalised");
    expect(result.matchesSuspended).toBe(1);
    expect(result.amountOwed).toBe(0);
  });

  it("only ever reports cleared on its own", () => {
    const result = standing({
      duesPaid: [
        { feeMonth: "2026-09", amountPaid: 200 },
        { feeMonth: "2026-10", amountPaid: 200 },
      ],
    });
    expect(result.flags).toEqual(["cleared"]);
  });
});
