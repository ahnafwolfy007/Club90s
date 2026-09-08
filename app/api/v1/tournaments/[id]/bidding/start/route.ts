import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { startBidding, getBiddingState } from "@/lib/tournaments/bidding";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
    if (!tournamentSectorId || !can.manageTournament(ctx, tournamentSectorId)) {
      throw Errors.forbidden("Only the Tournament President or an Admin can start bidding.");
    }

    const { id } = await params;
    await startBidding(id);
    const state = await getBiddingState(id);
    return NextResponse.json(state);
  } catch (err) {
    return handleApiError(err);
  }
}
