import { prisma } from "@/lib/db/client";
import { ApiError, Errors } from "@/lib/api/errors";
import { Prisma } from "@/app/generated/prisma/client";

/** Advances to the next pooled player (by auctionOrder), or clears currentPlayerId if none remain. */
async function advanceToNextPlayer(tournamentId: string, tx: Prisma.TransactionClient) {
  const next = await tx.tournamentPlayer.findFirst({
    where: { tournamentId, status: "pooled" },
    orderBy: [{ auctionOrder: "asc" }, { id: "asc" }],
  });
  const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } });

  await tx.tournament.update({
    where: { id: tournamentId },
    data: {
      currentPlayerId: next?.id ?? null,
      currentBidDeadline: next ? new Date(Date.now() + tournament.bidTimerSeconds * 1000) : null,
      status: next ? tournament.status : "completed",
    },
  });
}

/** Resolves the current player's auction if its timer has expired: sold to the highest bidder, or unsold. */
async function resolveIfExpired(tournamentId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;
    const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    if (!tournament.currentPlayerId || !tournament.currentBidDeadline) return;
    if (tournament.currentBidDeadline > new Date()) return; // still running

    const playerId = tournament.currentPlayerId;
    const highestBid = await tx.bid.findFirst({ where: { tournamentPlayerId: playerId, isWinning: true } });

    if (highestBid) {
      await tx.tournamentPlayer.update({
        where: { id: playerId },
        data: { status: "sold", soldToTeamId: highestBid.tournamentTeamId, soldAmount: highestBid.amount },
      });
      const team = await tx.tournamentTeam.findUniqueOrThrow({ where: { id: highestBid.tournamentTeamId } });
      await tx.tournamentTeam.update({
        where: { id: team.id },
        data: { remainingBudget: { decrement: highestBid.amount } },
      });
    } else {
      await tx.tournamentPlayer.update({ where: { id: playerId }, data: { status: "unsold" } });
    }

    await advanceToNextPlayer(tournamentId, tx);
  });
}

export async function startBidding(tournamentId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;
    const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    if (tournament.currentPlayerId) return; // already running
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: "in_progress" } });
    await advanceToNextPlayer(tournamentId, tx);
  });
}

export async function getBiddingState(tournamentId: string) {
  await resolveIfExpired(tournamentId);

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw Errors.notFound("Tournament");

  const currentPlayer = tournament.currentPlayerId
    ? await prisma.tournamentPlayer.findUnique({
        where: { id: tournament.currentPlayerId },
        include: { member: { select: { id: true, fullName: true, position: true } } },
      })
    : null;

  const highestBid = currentPlayer
    ? await prisma.bid.findFirst({
        where: { tournamentPlayerId: currentPlayer.id, isWinning: true },
        include: { tournamentTeam: { select: { id: true, teamName: true } } },
      })
    : null;

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    include: { ownerMember: { select: { fullName: true } } },
  });

  return {
    tournamentStatus: tournament.status,
    currentPlayer: currentPlayer
      ? { id: currentPlayer.id, member: currentPlayer.member, status: currentPlayer.status }
      : null,
    currentBidDeadline: tournament.currentBidDeadline,
    startingBid: tournament.startingBid,
    bidIncrement: tournament.bidIncrement,
    highestBid: highestBid
      ? { amount: highestBid.amount, teamId: highestBid.tournamentTeamId, teamName: highestBid.tournamentTeam.teamName }
      : null,
    teams: teams.map((t) => ({
      id: t.id,
      teamName: t.teamName,
      ownerName: t.ownerMember.fullName,
      remainingBudget: t.remainingBudget,
    })),
  };
}

export async function placeBid(params: {
  tournamentId: string;
  tournamentTeamId: string;
  amount: number;
  placedById: string;
  clientRequestId: string;
}) {
  await resolveIfExpired(params.tournamentId);

  return prisma.$transaction(async (tx) => {
    // Locks the tournament row so concurrent bid requests for this auction
    // serialize here — the loser of the race sees a fresh (already-updated)
    // highest bid and fails validation cleanly (SRS §11.2-11.3).
    await tx.$executeRaw`SELECT id FROM tournaments WHERE id = ${params.tournamentId} FOR UPDATE`;

    const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: params.tournamentId } });
    if (!tournament.currentPlayerId) {
      throw new ApiError(409, "BIDDING_CLOSED", "No player is currently up for auction.");
    }
    if (tournament.currentBidDeadline && tournament.currentBidDeadline <= new Date()) {
      throw new ApiError(409, "BIDDING_CLOSED", "The auction for this player just closed.");
    }

    const team = await tx.tournamentTeam.findUnique({ where: { id: params.tournamentTeamId } });
    if (!team || team.tournamentId !== params.tournamentId) throw Errors.notFound("Team");

    const existingIdempotent = await tx.bid.findUnique({
      where: { tournamentPlayerId_clientRequestId: { tournamentPlayerId: tournament.currentPlayerId, clientRequestId: params.clientRequestId } },
    });
    if (existingIdempotent) return { bid: existingIdempotent, deduplicated: true };

    const highestBid = await tx.bid.findFirst({
      where: { tournamentPlayerId: tournament.currentPlayerId, isWinning: true },
    });
    const minAcceptable = highestBid
      ? Number(highestBid.amount) + Number(tournament.bidIncrement)
      : Number(tournament.startingBid);

    if (params.amount < minAcceptable) {
      throw new ApiError(422, "INVALID_BID", `Bid must be at least ${minAcceptable}.`);
    }
    if (params.amount > Number(team.remainingBudget)) {
      throw new ApiError(422, "INVALID_BID", "This bid exceeds the team's remaining budget.");
    }

    if (highestBid) {
      await tx.bid.update({ where: { id: highestBid.id }, data: { isWinning: false } });
    }
    const bid = await tx.bid.create({
      data: {
        tournamentPlayerId: tournament.currentPlayerId,
        tournamentTeamId: params.tournamentTeamId,
        amount: params.amount,
        placedById: params.placedById,
        isWinning: true,
        clientRequestId: params.clientRequestId,
      },
    });

    // Soft-close: a valid bid resets the countdown (SRS §11.2 point 4).
    await tx.tournament.update({
      where: { id: params.tournamentId },
      data: { currentBidDeadline: new Date(Date.now() + tournament.bidTimerSeconds * 1000) },
    });

    return { bid, deduplicated: false };
  });
}
