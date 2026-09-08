import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { voidTransactionSchema } from "@/lib/validation/finance";
import { voidTransaction } from "@/lib/finance/ledger";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.voidTransaction(ctx, financeSectorId)) {
      throw Errors.forbidden("Only the Finance President or an Admin can void transactions.");
    }

    const { id } = await params;
    const body = voidTransactionSchema.parse(await request.json());

    const transaction = await voidTransaction(id, ctx.memberId, ctx.userId, body.reason);
    return NextResponse.json({ transaction });
  } catch (err) {
    return handleApiError(err);
  }
}
