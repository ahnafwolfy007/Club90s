import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { mergeMembers } from "@/lib/members/merge";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

const bodySchema = z.object({
  targetMemberId: z.string().min(1),
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
});

/** Tier 2 (SRS §7.4): irreversible and moves financial history, so it re-auths and is audited. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can merge member records.");

    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash
      ? await verifyPassword(actingUser.passwordHash, body.currentPassword)
      : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — nothing was merged.");

    if (id === ctx.memberId) throw Errors.forbidden("You cannot merge your own account away.");

    const result = await mergeMembers(id, body.targetMemberId, ctx.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
