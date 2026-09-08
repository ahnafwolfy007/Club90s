import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.recordTransaction(ctx, financeSectorId)) {
      throw Errors.forbidden("Only the Finance President or an Admin can view finance categories.");
    }

    const categories = await prisma.financeCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}
