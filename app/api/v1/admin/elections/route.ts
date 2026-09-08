import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { createElectionSchema } from "@/lib/validation/elections";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.createElection(ctx)) throw Errors.forbidden("Only Admins can create elections.");

    const body = createElectionSchema.parse(await request.json());

    const election = await prisma.election.create({
      data: {
        sectorId: body.sectorId,
        title: body.title,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        status: "open",
        createdById: ctx.memberId,
        candidates: { create: body.candidateMemberIds.map((memberId) => ({ memberId })) },
        voters: { create: body.eligibleMemberIds.map((memberId) => ({ memberId })) },
      },
      include: { candidates: true },
    });

    return NextResponse.json({ election });
  } catch (err) {
    return handleApiError(err);
  }
}
