import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { rsvpSchema } from "@/lib/validation/matches";
import { submitRsvp } from "@/lib/matches/rsvp";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.rsvpToMatch(ctx)) throw Errors.forbidden("Only active members can RSVP.");

    const { id } = await params;
    const body = rsvpSchema.parse(await request.json());

    const rsvp = await submitRsvp(id, ctx.memberId, body.response);
    return NextResponse.json({ rsvp });
  } catch (err) {
    return handleApiError(err);
  }
}
