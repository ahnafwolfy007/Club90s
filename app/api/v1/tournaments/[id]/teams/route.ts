import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { addTeamSchema } from "@/lib/validation/tournaments";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
    if (!tournamentSectorId || !can.manageTournament(ctx, tournamentSectorId)) {
      throw Errors.forbidden("Only the Tournament President or an Admin can add bidding teams.");
    }

    const { id } = await params;
    const body = addTeamSchema.parse(await request.json());

    const team = await prisma.tournamentTeam.create({
      data: {
        tournamentId: id,
        teamName: body.teamName,
        ownerMemberId: body.ownerMemberId,
        startingBudget: body.startingBudget,
        remainingBudget: body.startingBudget,
        minSquad: body.minSquad,
        maxSquad: body.maxSquad,
      },
    });

    return NextResponse.json({ team });
  } catch (err) {
    return handleApiError(err);
  }
}
