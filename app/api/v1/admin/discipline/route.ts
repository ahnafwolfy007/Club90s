import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { canDiscipline } from "@/lib/permissions/discipline";
import { issuePenaltySchema } from "@/lib/validation/discipline";
import { issuePenalty } from "@/lib/discipline/service";
import { Errors, handleApiError } from "@/lib/api/errors";

/** Every sanction on record, newest first — the Discipline register. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!(await canDiscipline(ctx))) {
      throw Errors.forbidden("Only Admins, the Advisory Board or Division 6 can review discipline (§7.2.1).");
    }

    const status = request.nextUrl.searchParams.get("status");
    const records = await prisma.disciplinaryRecord.findMany({
      where: status === "active" || status === "rescinded" || status === "served" ? { status } : undefined,
      include: {
        member: { select: { id: true, fullName: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

/** §7.2.2 — issue a warning, match suspension, fine, or revoke membership. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!(await canDiscipline(ctx))) {
      throw Errors.forbidden("Only Admins, the Advisory Board or Division 6 may issue sanctions (§7.2.1).");
    }

    const body = issuePenaltySchema.parse(await request.json());

    const record = await issuePenalty({
      ...body,
      issuedByMemberId: ctx.memberId,
      issuedByUserId: ctx.userId,
    });

    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
