import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { placeBidSchema } from "@/lib/validation/tournaments";
import { placeBid } from "@/lib/tournaments/bidding";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

const RATE_LIMIT_WINDOW_MS = 3000;
const RATE_LIMIT_MAX = 5;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isActiveMember(ctx)) throw Errors.forbidden("Only active members can bid.");

    const { id } = await params;
    const body = placeBidSchema.parse(await request.json());

    const recentBidCount = await prisma.bid.count({
      where: { placedById: ctx.memberId, placedAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    if (recentBidCount >= RATE_LIMIT_MAX) {
      throw new ApiError(429, "RATE_LIMITED", "Slow down — too many bids in a short time.");
    }

    const team = await prisma.tournamentTeam.findUnique({ where: { id: body.tournamentTeamId } });
    if (!team) throw Errors.notFound("Team");
    if (team.ownerMemberId !== ctx.memberId && !can.isAdmin(ctx)) {
      throw Errors.forbidden("You can only bid on behalf of a team you own.");
    }

    const result = await placeBid({
      tournamentId: id,
      tournamentTeamId: body.tournamentTeamId,
      amount: body.amount,
      placedById: ctx.memberId,
      clientRequestId: body.clientRequestId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
