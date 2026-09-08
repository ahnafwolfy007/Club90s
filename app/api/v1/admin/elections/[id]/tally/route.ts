import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { tallyElection } from "@/lib/elections/confirm";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can view the tally.");

    const { id } = await params;
    const election = await prisma.election.findUnique({
      where: { id },
      include: { candidates: { include: { member: { select: { fullName: true } } } } },
    });
    if (!election) throw Errors.notFound("Election");
    if (new Date() < election.endAt) {
      throw new ApiError(409, "ELECTION_STILL_OPEN", "The tally is available once voting closes.");
    }

    const tally = await tallyElection(id);
    const withNames = tally.map((t) => ({
      candidateId: t.candidateId,
      count: t.count,
      fullName: election.candidates.find((c) => c.id === t.candidateId)?.member.fullName ?? "Unknown",
    }));

    return NextResponse.json({
      tally: withNames,
      firstConfirmedById: election.firstConfirmedById,
      secondConfirmedById: election.secondConfirmedById,
      winningCandidateId: election.winningCandidateId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
