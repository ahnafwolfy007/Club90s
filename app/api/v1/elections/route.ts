import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const elections = await prisma.election.findMany({
      include: {
        sector: { select: { name: true } },
        candidates: { include: { member: { select: { id: true, fullName: true } } } },
        voters: { where: { memberId: ctx.memberId } },
      },
      orderBy: { startAt: "desc" },
    });

    return NextResponse.json({
      elections: elections.map((e) => ({
        id: e.id,
        title: e.title,
        sectorName: e.sector.name,
        startAt: e.startAt,
        endAt: e.endAt,
        status: e.status,
        candidates: e.candidates.map((c) => ({ id: c.id, fullName: c.member.fullName })),
        eligible: e.voters.length > 0,
        hasVoted: e.voters[0]?.votedAt != null,
        winningCandidateId: e.winningCandidateId,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
