import { z } from "zod";

export const issuePenaltySchema = z.object({
  memberId: z.string().min(1),
  type: z.enum(["warning", "match_suspension", "fine", "membership_revoked"]),
  reason: z.string().trim().min(3, "Say why — the member is told this.").max(1000),
  /** Rulebook clause this is issued under, e.g. "5.3.3" or "7.1.1". */
  clause: z.string().trim().max(20).optional(),
  matchesSuspended: z.number().int().min(1).max(50).optional(),
  fineAmount: z.number().positive().max(1_000_000).optional(),
  sourceMatchId: z.string().min(1).optional(),
});

export const rescindPenaltySchema = z.object({
  reason: z.string().trim().min(3, "A reason is required to lift a penalty.").max(500),
});

export const resetAllPenaltiesSchema = z.object({
  reason: z.string().trim().min(3, "Say why the slate is being cleared.").max(500),
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
  /** Guards against a mis-click: the client must echo back the exact count it showed. */
  expectedCount: z.number().int().min(0).optional(),
});
