import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { submitRecruitmentSchema } from "@/lib/validation/recruitment";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const recruitmentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.RECRUITMENT);
    const isPrivileged = can.isAdmin(ctx) || (recruitmentSectorId ? can.isPresidentOfSector(ctx, recruitmentSectorId) : false);
    if (!isPrivileged) throw Errors.forbidden("Only the Recruitment President or an Admin can review applications.");

    const applications = await prisma.recruitmentApplication.findMany({
      include: { submittedBy: { select: { fullName: true } }, reviewedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isActiveMember(ctx)) throw Errors.forbidden("Only active members can refer a prospective member.");

    const body = submitRecruitmentSchema.parse(await request.json());

    const application = await prisma.recruitmentApplication.create({
      data: { fullName: body.fullName, contactInfo: body.contactInfo, notes: body.notes, submittedById: ctx.memberId },
    });

    return NextResponse.json({ application });
  } catch (err) {
    return handleApiError(err);
  }
}
