/** §6.2 — Official jersey allocation rules. */

export type SquadType = "core" | "general";

export type JerseyHolder = { memberId: string; squadType: SquadType };

export type JerseyClaim =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * §6.2.1 — Core Squad Members have priority in selecting numbers.
 * §6.2.2 — Single-Duplicate Rule: where a Core Squad Member holds a number,
 *          only one (1) General Pool Member may use the same number.
 *
 * Interpretation, since the clause only spells out the core-held case: a number
 * supports at most one holder per squad type — one Core and one General. Two
 * Core members can never share a number, and two General members can't either.
 * Disputes go to the Executive Committee under §6.2.3.
 */
export function canClaimJersey(
  jerseyNumber: number,
  claimant: JerseyHolder,
  currentHolders: JerseyHolder[],
): JerseyClaim {
  const others = currentHolders.filter((h) => h.memberId !== claimant.memberId);

  const sameSquadHolder = others.find((h) => h.squadType === claimant.squadType);
  if (!sameSquadHolder) return { allowed: true };

  if (claimant.squadType === "core") {
    return {
      allowed: false,
      reason: `#${jerseyNumber} is already held by another Competitive Core Squad member. Core numbers are exclusive — resolve it between yourselves, or refer it to the Executive Committee (§6.2.2–6.2.3).`,
    };
  }

  return {
    allowed: false,
    reason: `#${jerseyNumber} already has a General Pool holder. Only one General Pool member may share a number (§6.2.2). Pick another, or arrange a swap by mutual agreement (§6.2.4).`,
  };
}

/** How many more members could still take this number, given who holds it. */
export function remainingJerseySlots(currentHolders: JerseyHolder[]): {
  core: number;
  general: number;
} {
  return {
    core: currentHolders.some((h) => h.squadType === "core") ? 0 : 1,
    general: currentHolders.some((h) => h.squadType === "general") ? 0 : 1,
  };
}
