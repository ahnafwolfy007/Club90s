import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { updateOwnProfileSchema } from "@/lib/validation/members";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const member = await prisma.member.findUnique({
      where: { id: ctx.memberId },
      include: { user: { select: { email: true } }, roleAssignments: { where: { status: "active" }, include: { role: true, sector: true } } },
    });
    if (!member) throw Errors.notFound("Member");

    return NextResponse.json({ member });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const body = updateOwnProfileSchema.parse(await request.json());

    const member = await prisma.member.update({
      where: { id: ctx.memberId },
      data: {
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.position !== undefined && { position: body.position || null }),
        ...(body.jerseyNumber !== undefined && { jerseyNumber: body.jerseyNumber }),
        ...(body.preferredFoot !== undefined && { preferredFoot: body.preferredFoot }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.dob !== undefined && { dob: body.dob ? new Date(body.dob) : null }),
        ...(body.emergencyContact !== undefined && { emergencyContact: body.emergencyContact }),
      },
    });

    return NextResponse.json({ member });
  } catch (err) {
    return handleApiError(err);
  }
}
