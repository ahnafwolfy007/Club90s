import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { castVoteSchema } from "@/lib/validation/elections";
import { castVote } from "@/lib/elections/vote";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const body = castVoteSchema.parse(await request.json());

    await castVote(id, ctx.memberId, body.candidateId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
