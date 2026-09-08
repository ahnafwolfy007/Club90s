import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { reviewRecruitmentSchema } from "@/lib/validation/recruitment";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const recruitmentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.RECRUITMENT);
    const isPrivileged = can.isAdmin(ctx) || (recruitmentSectorId ? can.isPresidentOfSector(ctx, recruitmentSectorId) : false);
    if (!isPrivileged) throw Errors.forbidden("Only the Recruitment President or an Admin can reject applications.");

    const { id } = await params;
    const body = reviewRecruitmentSchema.parse(await request.json());

    const application = await prisma.recruitmentApplication.findUnique({ where: { id } });
    if (!application) throw Errors.notFound("Application");
    if (application.status !== "submitted" && application.status !== "in_review") {
      throw new ApiError(409, "ALREADY_REVIEWED", "This application has already been reviewed.");
    }

    const updated = await prisma.recruitmentApplication.update({
      where: { id },
      data: { status: "rejected", reviewedById: ctx.memberId, notes: body.notes },
    });

    return NextResponse.json({ application: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
