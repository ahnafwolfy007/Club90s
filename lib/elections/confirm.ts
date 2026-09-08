import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/audit/log";
import { ApiError, Errors } from "@/lib/api/errors";

export async function tallyElection(electionId: string) {
  const rows = await prisma.electionBallot.groupBy({
    by: ["candidateId"],
    where: { electionId },
    _count: { candidateId: true },
  });
  return rows
    .map((r) => ({ candidateId: r.candidateId, count: r._count.candidateId }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Tier 3 two-admin approval (SRS §16.5, §7.4). Winning an election never
 * auto-grants the role: a first admin confirms, then a *different* second
 * admin must independently confirm before the role assignment is created.
 */
export async function confirmElectionResult(electionId: string, adminMemberId: string, adminUserId: string) {
  const election = await prisma.election.findUnique({ where: { id: electionId }, include: { candidates: true } });
  if (!election) throw Errors.notFound("Election");
  if (new Date() < election.endAt) {
    throw new ApiError(409, "ELECTION_STILL_OPEN", "Voting hasn't closed yet.");
  }
  if (election.winningCandidateId) {
    throw new ApiError(409, "ALREADY_CONFIRMED", "This election's result has already been confirmed.");
  }

  if (!election.firstConfirmedById) {
    await prisma.election.update({
      where: { id: electionId },
      data: { firstConfirmedById: adminMemberId, firstConfirmedAt: new Date() },
    });
    return { stage: "first_confirmed" as const };
  }

  if (election.firstConfirmedById === adminMemberId) {
    throw Errors.forbidden("A different Admin must provide the second confirmation — this is a two-admin approval.");
  }

  const tally = await tallyElection(electionId);
  if (tally.length === 0) throw new ApiError(409, "NO_VOTES", "No votes were cast in this election.");
  if (tally.length > 1 && tally[0].count === tally[1].count) {
    throw new ApiError(409, "TIE_VOTE", "The vote is tied — resolve it manually per club rules before confirming.");
  }

  const winnerCandidate = election.candidates.find((c) => c.id === tally[0].candidateId);
  if (!winnerCandidate) throw Errors.notFound("Winning candidate");

  const presidentRole = await prisma.role.findUnique({ where: { name: "president" } });
  if (!presidentRole) throw new ApiError(500, "INTERNAL_ERROR", "President role is missing from the role catalog.");

  const roleAssignment = await prisma.$transaction(async (tx) => {
    await tx.election.update({
      where: { id: electionId },
      data: {
        secondConfirmedById: adminMemberId,
        secondConfirmedAt: new Date(),
        winningCandidateId: winnerCandidate.id,
        status: "closed",
      },
    });

    return tx.roleAssignment.create({
      data: {
        memberId: winnerCandidate.memberId,
        roleId: presidentRole.id,
        sectorId: election.sectorId,
        grantedById: adminMemberId,
      },
    });
  });

  await recordAudit({
    actorId: adminUserId,
    action: "election.confirm_result",
    entityType: "election",
    entityId: electionId,
    after: { winningMemberId: winnerCandidate.memberId, roleAssignmentId: roleAssignment.id },
  });

  return { stage: "second_confirmed" as const, roleAssignment };
}
