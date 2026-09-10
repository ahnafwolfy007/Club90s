import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { canDiscipline } from "@/lib/permissions/discipline";
import { rescindPenaltySchema } from "@/lib/validation/discipline";
import { rescindPenalty } from "@/lib/discipline/service";
import { Errors, handleApiError } from "@/lib/api/errors";

/** Lifts a single sanction. The record stays, marked rescinded with a reason. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!(await canDiscipline(ctx))) {
      throw Errors.forbidden("Only Admins, the Advisory Board or Division 6 may lift sanctions (§7.2.1).");
    }

    const { id } = await params;
    const body = rescindPenaltySchema.parse(await request.json());

    const record = await rescindPenalty({
      recordId: id,
      reason: body.reason,
      byMemberId: ctx.memberId,
      byUserId: ctx.userId,
    });

    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
