import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { setTeamsSchema } from "@/lib/validation/matches";
import { setMatchTeams } from "@/lib/matches/teams";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
    const isManager = clubTeamSectorId ? can.manageMatches(ctx, clubTeamSectorId) : false;

    const teams = await prisma.team.findMany({
      where: { matchId: id, ...(isManager ? {} : { status: { not: "draft" } }) },
      include: { players: { include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } } } },
    });

    return NextResponse.json({ teams });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
    if (!clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) {
      throw Errors.forbidden("Only the Club Team President or an Admin can form teams.");
    }

    const { id } = await params;
    const body = setTeamsSchema.parse(await request.json());
    const teams = await setMatchTeams(id, ctx.memberId, body);

    return NextResponse.json({ teams });
  } catch (err) {
    return handleApiError(err);
  }
}
