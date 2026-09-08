import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { approveRecruitmentSchema } from "@/lib/validation/recruitment";
import { approveRecruitment } from "@/lib/recruitment/approve";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const recruitmentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.RECRUITMENT);
    const isPrivileged = can.isAdmin(ctx) || (recruitmentSectorId ? can.isPresidentOfSector(ctx, recruitmentSectorId) : false);
    if (!isPrivileged) throw Errors.forbidden("Only the Recruitment President or an Admin can approve applications.");

    const { id } = await params;
    const body = approveRecruitmentSchema.parse(await request.json());

    const { member } = await approveRecruitment(id, body.email, ctx.memberId);

    await recordAudit({
      actorId: ctx.userId,
      action: "recruitment.approve",
      entityType: "recruitment_application",
      entityId: id,
      after: { memberId: member.id, email: body.email },
    });

    return NextResponse.json({ ok: true, memberId: member.id });
  } catch (err) {
    return handleApiError(err);
  }
}
