import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { updateClassificationSchema } from "@/lib/validation/members";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError } from "@/lib/api/errors";

/**
 * Sets a member's rulebook classification.
 *
 * This is the switch every other rule reads from: Senior vs Junior decides
 * dues liability (§2.1–2.2) and which poll deadline they're held to
 * (§5.2.2–3), and Core vs General Pool decides jersey priority (§6.2.1) and
 * tournament selection (§6.1). Audited with a before/after because changing it
 * changes what a member owes and when they can vote.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can set a member's classification.");

    const { id } = await params;
    const body = updateClassificationSchema.parse(await request.json());

    const before = await prisma.member.findUnique({
      where: { id },
      select: { membershipClass: true, squadType: true, isFoundingMember: true, fullName: true },
    });
    if (!before) throw Errors.notFound("Member");

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(body.membershipClass !== undefined && { membershipClass: body.membershipClass }),
        ...(body.squadType !== undefined && { squadType: body.squadType }),
        ...(body.isFoundingMember !== undefined && { isFoundingMember: body.isFoundingMember }),
      },
      select: { membershipClass: true, squadType: true, isFoundingMember: true },
    });

    await recordAudit({
      actorId: ctx.userId,
      action: "member.update_classification",
      entityType: "member",
      entityId: id,
      before,
      after: member,
    });

    return NextResponse.json({ member });
  } catch (err) {
    return handleApiError(err);
  }
}
