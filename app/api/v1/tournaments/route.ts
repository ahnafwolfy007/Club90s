import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { createTournamentSchema } from "@/lib/validation/tournaments";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const tournaments = await prisma.tournament.findMany({ orderBy: { startDate: "desc" } });
    return NextResponse.json({ tournaments });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
    if (!tournamentSectorId || !can.manageTournament(ctx, tournamentSectorId)) {
      throw Errors.forbidden("Only the Tournament President or an Admin can create tournaments.");
    }

    const body = createTournamentSchema.parse(await request.json());

    const tournament = await prisma.tournament.create({
      data: {
        name: body.name,
        startDate: new Date(body.startDate),
        numTeams: body.numTeams,
        format: body.format,
        rules: body.rules,
        venue: body.venue,
        fee: body.fee,
        biddingEnabled: true,
        startingBid: body.startingBid,
        bidIncrement: body.bidIncrement,
        bidTimerSeconds: body.bidTimerSeconds,
        status: "open",
      },
    });

    return NextResponse.json({ tournament });
  } catch (err) {
    return handleApiError(err);
  }
}
