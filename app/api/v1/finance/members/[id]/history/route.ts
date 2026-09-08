import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.viewMemberFinance(ctx, financeSectorId, id)) {
      throw Errors.forbidden("You can only view your own payment history.");
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: { memberId: id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    return handleApiError(err);
  }
}
