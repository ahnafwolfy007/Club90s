import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { assignRoleSchema } from "@/lib/validation/members";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.assignRole(ctx)) throw Errors.forbidden("Only Admins can assign roles.");

    const body = assignRoleSchema.parse(await request.json());

    // Tier 2 re-authentication (SRS §7.4): the acting admin must re-prove their
    // own password before this takes effect, independent of their session.
    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash
      ? await verifyPassword(actingUser.passwordHash, body.currentPassword)
      : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — role assignment cancelled.");

    // Changing an admin's own role is Tier 3 (two-admin approval), not this Tier-2 endpoint.
    if (body.memberId === ctx.memberId) {
      throw Errors.forbidden("You cannot change your own role through this action.");
    }

    if (body.role === "president" && !body.sectorId) {
      throw new ApiError(422, "VALIDATION_ERROR", "A president role requires a sector.");
    }
    if (body.role !== "president" && body.sectorId) {
      throw new ApiError(422, "VALIDATION_ERROR", "Only the president role is sector-scoped.");
    }

    const [targetMember, role, sector] = await Promise.all([
      prisma.member.findUnique({ where: { id: body.memberId } }),
      prisma.role.findUnique({ where: { name: body.role } }),
      body.sectorId ? prisma.sector.findUnique({ where: { id: body.sectorId } }) : Promise.resolve(null),
    ]);
    if (!targetMember) throw Errors.notFound("Member");
    if (!role) throw Errors.notFound("Role");
    if (body.sectorId && !sector) throw Errors.notFound("Sector");

    const before = await prisma.roleAssignment.findMany({
      where: { memberId: body.memberId, status: "active" },
      include: { role: true, sector: true },
    });

    const existing = before.find((ra) => ra.roleId === role.id && ra.sectorId === (body.sectorId ?? null));
    if (existing) {
      throw new ApiError(409, "ROLE_ALREADY_ASSIGNED", "This member already holds that role.");
    }

    const assignment = await prisma.roleAssignment.create({
      data: {
        memberId: body.memberId,
        roleId: role.id,
        sectorId: body.sectorId ?? null,
        grantedById: ctx.memberId,
      },
      include: { role: true, sector: true },
    });

    await recordAudit({
      actorId: ctx.userId,
      action: "role.assign",
      entityType: "member",
      entityId: body.memberId,
      before: before.map((ra) => ({ role: ra.role.name, sector: ra.sector?.name ?? null })),
      after: { role: assignment.role.name, sector: assignment.sector?.name ?? null },
    });

    return NextResponse.json({ assignment });
  } catch (err) {
    return handleApiError(err);
  }
}
