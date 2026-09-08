import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";
import { z } from "zod";

const bodySchema = z.object({ currentPassword: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.assignRole(ctx)) throw Errors.forbidden("Only Admins can remove roles.");

    const { assignmentId } = await params;
    const body = bodySchema.parse(await request.json());

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash ? await verifyPassword(actingUser.passwordHash, body.currentPassword) : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — action cancelled.");

    const assignment = await prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true, sector: true },
    });
    if (!assignment || assignment.status !== "active") throw Errors.notFound("Active role assignment");

    if (assignment.memberId === ctx.memberId) {
      throw Errors.forbidden("You cannot remove your own role through this action.");
    }

    const updated = await prisma.roleAssignment.update({
      where: { id: assignmentId },
      data: { status: "removed", endsAt: new Date() },
    });

    await recordAudit({
      actorId: ctx.userId,
      action: "role.remove",
      entityType: "member",
      entityId: assignment.memberId,
      before: { role: assignment.role.name, sector: assignment.sector?.name ?? null },
      after: { status: "removed" },
    });

    return NextResponse.json({ assignment: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
