import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { addPlayersSchema } from "@/lib/validation/tournaments";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
    if (!tournamentSectorId || !can.manageTournament(ctx, tournamentSectorId)) {
      throw Errors.forbidden("Only the Tournament President or an Admin can manage the player pool.");
    }

    const { id } = await params;
    const body = addPlayersSchema.parse(await request.json());

    const existingCount = await prisma.tournamentPlayer.count({ where: { tournamentId: id } });
    const created = await prisma.$transaction(
      body.memberIds.map((memberId, i) =>
        prisma.tournamentPlayer.upsert({
          where: { tournamentId_memberId: { tournamentId: id, memberId } },
          update: {},
          create: { tournamentId: id, memberId, auctionOrder: existingCount + i },
        }),
      ),
    );

    return NextResponse.json({ players: created });
  } catch (err) {
    return handleApiError(err);
  }
}
