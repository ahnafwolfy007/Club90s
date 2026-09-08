import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { createMatchSchema } from "@/lib/validation/matches";
import { notifyUser } from "@/lib/notifications/create";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const when = request.nextUrl.searchParams.get("when"); // "upcoming" | "past"
    const now = new Date();

    const matches = await prisma.match.findMany({
      where: {
        status: { not: "draft" },
        ...(when === "upcoming" && { matchDate: { gte: now } }),
        ...(when === "past" && { matchDate: { lt: now } }),
      },
      orderBy: { matchDate: when === "past" ? "desc" : "asc" },
      include: { _count: { select: { rsvps: { where: { response: "in", waitlisted: false } } } } },
      take: 50,
    });

    return NextResponse.json({
      matches: matches.map((m) => ({ ...m, confirmedCount: m._count.rsvps, _count: undefined })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
    if (!clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) {
      throw Errors.forbidden("Only the Club Team President or an Admin can create matches.");
    }

    const body = createMatchSchema.parse(await request.json());

    const match = await prisma.match.create({
      data: {
        title: body.title,
        matchDate: new Date(body.matchDate),
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        venueName: body.venueName,
        venueAddress: body.venueAddress,
        mapLink: body.mapLink || null,
        fee: body.fee,
        maxPlayers: body.maxPlayers,
        rsvpDeadline: new Date(body.rsvpDeadline),
        notes: body.notes,
        organizerId: ctx.memberId,
        status: "published",
      },
    });

    const activeUsers = await prisma.user.findMany({
      where: { status: "active", member: { status: "active" } },
      select: { id: true },
    });
    await Promise.all(
      activeUsers.map((u) => notifyUser(u.id, "match_published", { matchId: match.id, matchTitle: match.title })),
    );

    return NextResponse.json({ match });
  } catch (err) {
    return handleApiError(err);
  }
}
