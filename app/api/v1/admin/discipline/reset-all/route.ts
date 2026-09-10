import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { resetAllPenaltiesSchema } from "@/lib/validation/discipline";
import { resetAllPenalties } from "@/lib/discipline/service";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

/**
 * Clears every outstanding penalty club-wide.
 *
 * Admin-only and re-authenticated (SRS §7.4 Tier 2): it reaches every member at
 * once, so it gets the same friction as a role change rather than sitting
 * behind a single click. `expectedCount` lets the client prove it is clearing
 * the number it actually displayed, so a stale screen can't quietly wipe more
 * than the admin saw.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can clear penalties club-wide.");

    const body = resetAllPenaltiesSchema.parse(await request.json());

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash
      ? await verifyPassword(actingUser.passwordHash, body.currentPassword)
      : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — nothing was cleared.");

    if (body.expectedCount !== undefined) {
      const actual = await prisma.disciplinaryRecord.count({ where: { status: "active" } });
      if (actual !== body.expectedCount) {
        throw new ApiError(
          409,
          "COUNT_CHANGED",
          `There are now ${actual} active penalties, not the ${body.expectedCount} shown. Refresh and check before clearing.`,
        );
      }
    }

    const result = await resetAllPenalties({
      reason: body.reason,
      byMemberId: ctx.memberId,
      byUserId: ctx.userId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
