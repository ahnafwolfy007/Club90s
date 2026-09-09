import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { sendCredentialEmailsToAll } from "@/lib/auth/password-reset";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
  onlyUnactivated: z.boolean().optional(),
});

/**
 * Mails every active member a set-password link. Treated as a Tier 2 action
 * (SRS §7.4): it touches every account at once and lands in every member's
 * inbox, so it takes an admin re-auth and is written to the audit log.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can send a club-wide password reset.");

    const body = bodySchema.parse(await request.json());

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash
      ? await verifyPassword(actingUser.passwordHash, body.currentPassword)
      : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — nothing was sent.");

    const results = await sendCredentialEmailsToAll({ onlyUnactivated: body.onlyUnactivated });
    const summary = {
      total: results.length,
      sent: results.filter((r) => r.sent).length,
      failed: results.filter((r) => !r.sent).length,
      activations: results.filter((r) => r.sent && r.kind === "activation").length,
      resets: results.filter((r) => r.sent && r.kind === "reset").length,
    };

    await recordAudit({
      actorId: ctx.userId,
      action: "member.broadcast_password_reset",
      entityType: "member",
      after: summary,
    });

    return NextResponse.json({
      summary,
      failures: results.filter((r) => !r.sent).map((r) => ({ email: r.email, error: r.error })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
