import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { getBiddingState } from "@/lib/tournaments/bidding";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const state = await getBiddingState(id);
    return NextResponse.json(state);
  } catch (err) {
    return handleApiError(err);
  }
}
