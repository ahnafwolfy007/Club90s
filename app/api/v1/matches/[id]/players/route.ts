import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
    if (!clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) {
      throw Errors.forbidden("Only the Club Team President or an Admin can view the roster for team formation.");
    }

    const { id } = await params;
    const rsvps = await prisma.matchRsvp.findMany({
      where: { matchId: id, response: "in", waitlisted: false },
      include: { member: { select: { id: true, fullName: true, position: true, profilePhotoUrl: true } } },
      orderBy: { respondedAt: "asc" },
    });

    return NextResponse.json({ players: rsvps.map((r) => r.member) });
  } catch (err) {
    return handleApiError(err);
  }
}
