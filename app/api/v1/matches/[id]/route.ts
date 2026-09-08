import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { updateMatchSchema } from "@/lib/validation/matches";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, fullName: true } },
        rsvps: { include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
      },
    });
    if (!match) throw Errors.notFound("Match");

    const myRsvp = match.rsvps.find((r) => r.memberId === ctx.memberId) ?? null;
    const summary = {
      confirmed: match.rsvps.filter((r) => r.response === "in" && !r.waitlisted).length,
      waitlisted: match.rsvps.filter((r) => r.response === "in" && r.waitlisted).length,
      out: match.rsvps.filter((r) => r.response === "out").length,
      maybe: match.rsvps.filter((r) => r.response === "maybe").length,
    };

    return NextResponse.json({ match, myRsvp, summary });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
    if (!clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) {
      throw Errors.forbidden("Only the Club Team President or an Admin can edit matches.");
    }

    const { id } = await params;
    const before = await prisma.match.findUnique({ where: { id } });
    if (!before) throw Errors.notFound("Match");

    const body = updateMatchSchema.parse(await request.json());
    const reopenedRsvp = body.rsvpDeadline && new Date(body.rsvpDeadline) > new Date() && before.rsvpDeadline < new Date();

    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.matchDate !== undefined && { matchDate: new Date(body.matchDate) }),
        ...(body.startTime !== undefined && { startTime: new Date(body.startTime) }),
        ...(body.endTime !== undefined && { endTime: body.endTime ? new Date(body.endTime) : null }),
        ...(body.venueName !== undefined && { venueName: body.venueName }),
        ...(body.venueAddress !== undefined && { venueAddress: body.venueAddress }),
        ...(body.mapLink !== undefined && { mapLink: body.mapLink || null }),
        ...(body.fee !== undefined && { fee: body.fee }),
        ...(body.maxPlayers !== undefined && { maxPlayers: body.maxPlayers }),
        ...(body.rsvpDeadline !== undefined && { rsvpDeadline: new Date(body.rsvpDeadline) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    // Venue changes and deadline reopening are Tier 1 but logged (SRS §8.4, §32).
    if (reopenedRsvp || (body.venueName && body.venueName !== before.venueName)) {
      await recordAudit({
        actorId: ctx.userId,
        action: reopenedRsvp ? "match.rsvp_reopened" : "match.venue_changed",
        entityType: "match",
        entityId: id,
        before: { venueName: before.venueName, rsvpDeadline: before.rsvpDeadline },
        after: { venueName: match.venueName, rsvpDeadline: match.rsvpDeadline },
      });
    }

    return NextResponse.json({ match });
  } catch (err) {
    return handleApiError(err);
  }
}
