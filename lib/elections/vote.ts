import { prisma } from "@/lib/db/client";
import { ApiError, Errors } from "@/lib/api/errors";

/**
 * Casts a ballot. This is the ONLY place a member's identity and their
 * candidate choice ever exist in the same scope — transiently, in this
 * function's memory — and it is never persisted or logged together (SRS
 * §16.2). The two writes are atomic: eligibility (no candidate) and the
 * anonymous ballot (no member) land in one transaction with no shared key.
 */
export async function castVote(electionId: string, memberId: string, candidateId: string) {
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) throw Errors.notFound("Election");
  if (election.status !== "open") throw new ApiError(409, "ELECTION_NOT_OPEN", "This election isn't open for voting.");

  const now = new Date();
  if (now < election.startAt || now > election.endAt) {
    throw new ApiError(409, "ELECTION_NOT_OPEN", "This election isn't within its voting window.");
  }

  const voterRow = await prisma.electionVoter.findUnique({
    where: { electionId_memberId: { electionId, memberId } },
  });
  if (!voterRow) throw Errors.forbidden("You are not eligible to vote in this election.");
  if (voterRow.votedAt) throw new ApiError(409, "ALREADY_VOTED", "You have already voted in this election.");

  const candidate = await prisma.electionCandidate.findFirst({ where: { id: candidateId, electionId } });
  if (!candidate) throw Errors.notFound("Candidate");

  // Coarse date-only cast_date (no timestamp) is the timing-correlation
  // mitigation described in SRS §16.3 — do not widen this to a timestamp.
  await prisma.$transaction([
    prisma.electionVoter.update({ where: { id: voterRow.id }, data: { votedAt: now } }),
    prisma.electionBallot.create({ data: { electionId, candidateId, castDate: now } }),
  ]);
}
