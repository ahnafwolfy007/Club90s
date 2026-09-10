import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { registrationProfileSchema } from "@/lib/validation/registration";
import { registrationCompleteness } from "@/lib/registration/completeness";
import { canClaimJersey } from "@/lib/rulebook";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

/** How far along this member's registration is, and what's still missing. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const member = await prisma.member.findUnique({ where: { id: ctx.memberId } });
    if (!member) throw Errors.notFound("Member");

    return NextResponse.json({
      member,
      completeness: registrationCompleteness(member),
      verified: member.profileCompletedAt !== null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Saves registration details and re-evaluates verification.
 *
 * A member is fully verified once every required field is present — the same
 * set the club's original registration form collected. Saving a partial form is
 * fine and expected; the profile just stays unverified until the gaps are
 * filled. Jersey choice is checked against §6.2 here rather than silently
 * accepted, so two Core Squad members can't end up on the same number.
 */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const body = registrationProfileSchema.parse(await request.json());

    const current = await prisma.member.findUnique({ where: { id: ctx.memberId } });
    if (!current) throw Errors.notFound("Member");

    // §6.2 — a number supports one Core and one General holder, no more.
    if (body.jerseyNumber !== undefined && body.jerseyNumber !== null && body.jerseyNumber !== current.jerseyNumber) {
      const holders = await prisma.member.findMany({
        where: { jerseyNumber: body.jerseyNumber, status: { not: "inactive" } },
        select: { id: true, squadType: true },
      });
      const claim = canClaimJersey(
        body.jerseyNumber,
        { memberId: current.id, squadType: current.squadType },
        holders.map((h) => ({ memberId: h.id, squadType: h.squadType })),
      );
      if (!claim.allowed) throw new ApiError(409, "JERSEY_TAKEN", claim.reason);
    }

    const { dob, ...rest } = body;
    const updates = {
      ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
      ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
    };

    const merged = { ...current, ...updates };
    const completeness = registrationCompleteness(merged as never);

    const member = await prisma.member.update({
      where: { id: ctx.memberId },
      data: {
        ...updates,
        // Stamped the first time it completes; cleared if a field is later emptied,
        // so the flag can never claim more than the data supports.
        profileCompletedAt: completeness.complete ? (current.profileCompletedAt ?? new Date()) : null,
      },
    });

    return NextResponse.json({
      member,
      completeness,
      verified: member.profileCompletedAt !== null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
