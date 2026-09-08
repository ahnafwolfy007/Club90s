import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: { include: { member: { select: { id: true, fullName: true, position: true } } }, orderBy: { auctionOrder: "asc" } },
        bidTeams: { include: { ownerMember: { select: { fullName: true } } } },
      },
    });
    if (!tournament) throw Errors.notFound("Tournament");

    return NextResponse.json({ tournament });
  } catch (err) {
    return handleApiError(err);
  }
}
