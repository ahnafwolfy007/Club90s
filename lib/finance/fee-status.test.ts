import { describe, it, expect } from "vitest";
import { deriveFeeStatus } from "./fee-status";

describe("deriveFeeStatus", () => {
  it("is unpaid when nothing has been recorded", () => {
    expect(deriveFeeStatus(0, 500)).toBe("unpaid");
  });

  it("is unpaid for a negative recorded amount (defensive — shouldn't occur, but must not misclassify as paid)", () => {
    expect(deriveFeeStatus(-10, 500)).toBe("unpaid");
  });

  it("is partial when something was paid but less than the fee", () => {
    expect(deriveFeeStatus(250, 500)).toBe("partial");
  });

  it("is paid when the amount exactly matches the fee", () => {
    expect(deriveFeeStatus(500, 500)).toBe("paid");
  });

  it("is overpaid when more than the fee was recorded", () => {
    expect(deriveFeeStatus(600, 500)).toBe("overpaid");
  });

  it("reports unpaid (not paid) when the fee is waived to zero and nothing was recorded", () => {
    // Documents current behavior for a club-settings edge case (fee = 0): no
    // transaction exists, so this still reads as "unpaid" per the literal
    // §10.2 rule ("no transaction recorded"), even though nothing is owed.
    // If the club ever wants a waived month to display as settled, this is
    // the function to revisit.
    expect(deriveFeeStatus(0, 0)).toBe("unpaid");
  });
});
