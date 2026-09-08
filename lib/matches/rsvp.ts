import { prisma } from "@/lib/db/client";
import { notifyMember } from "@/lib/notifications/create";
import { ApiError, Errors } from "@/lib/api/errors";
import type { RsvpResponse } from "@/app/generated/prisma/enums";

export async function submitRsvp(matchId: string, memberId: string, response: RsvpResponse) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw Errors.notFound("Match");
  if (match.status !== "published") {
    throw new ApiError(409, "MATCH_NOT_OPEN", "This match isn't open for RSVP.");
  }
  if (new Date() > match.rsvpDeadline) {
    throw new ApiError(409, "RSVP_DEADLINE_PASSED", "The RSVP deadline for this match has passed.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.matchRsvp.findUnique({ where: { matchId_memberId: { matchId, memberId } } });

    let waitlisted = false;
    if (response === "in") {
      const confirmedCount = await tx.matchRsvp.count({
        where: {
          matchId,
          response: "in",
          waitlisted: false,
          memberId: { not: memberId },
        },
      });
      waitlisted = confirmedCount >= match.maxPlayers;
    }

    const rsvp = await tx.matchRsvp.upsert({
      where: { matchId_memberId: { matchId, memberId } },
      update: { response, waitlisted, respondedAt: new Date() },
      create: { matchId, memberId, response, waitlisted },
    });

    await tx.matchRsvpHistory.create({
      data: { matchId, memberId, oldResponse: existing?.response ?? null, newResponse: response },
    });

    let promotedMemberId: string | null = null;
    const wasConfirmedIn = existing?.response === "in" && existing.waitlisted === false;
    if (wasConfirmedIn && response !== "in") {
      const next = await tx.matchRsvp.findFirst({
        where: { matchId, response: "in", waitlisted: true },
        orderBy: { respondedAt: "asc" },
      });
      if (next) {
        await tx.matchRsvp.update({ where: { id: next.id }, data: { waitlisted: false } });
        promotedMemberId = next.memberId;
      }
    }

    return { rsvp, promotedMemberId };
  });

  if (result.promotedMemberId) {
    await notifyMember(result.promotedMemberId, "waitlist_promoted", {
      matchId,
      matchTitle: match.title,
    });
  }

  return result.rsvp;
}
