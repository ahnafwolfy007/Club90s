import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { updateMemberEmailSchema } from "@/lib/validation/members";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

/**
 * Corrects a member's email — mainly for the placeholder @club90s.local
 * addresses the finance-sheet import created for people who weren't in the
 * registration form. This is their login identifier, so it's audited with the
 * before/after value, but doesn't require re-auth (SRS Tier 1): it's a data
 * correction, not a permission change, and the member's password is untouched.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can change a member's email.");

    const { id } = await params;
    const body = updateMemberEmailSchema.parse(await request.json());

    const member = await prisma.member.findUnique({ where: { id }, include: { user: true } });
    if (!member) throw Errors.notFound("Member");

    if (body.email === member.user.email) {
      return NextResponse.json({ email: member.user.email, changed: false });
    }

    const taken = await prisma.user.findUnique({ where: { email: body.email } });
    if (taken) throw new ApiError(409, "EMAIL_TAKEN", "Another account already uses this email.");

    const before = member.user.email;
    await prisma.user.update({ where: { id: member.userId }, data: { email: body.email } });

    await recordAudit({
      actorId: ctx.userId,
      action: "member.update_email",
      entityType: "member",
      entityId: id,
      before: { email: before },
      after: { email: body.email },
    });

    return NextResponse.json({ email: body.email, changed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
