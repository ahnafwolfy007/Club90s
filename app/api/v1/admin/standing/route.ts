import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName } from "@/lib/db/sectors";
import { DIVISION } from "@/lib/rulebook";
import { getStandingRoll, summariseRoll, currentFeeMonth } from "@/lib/standing/service";
import { Errors, handleApiError } from "@/lib/api/errors";

/**
 * The club's standing roll — who owes, who's suspended, who's clear.
 *
 * Visible to Admins and Division 4 (Finance & Fund, §4.4), since it's a view
 * over dues and sanctions rather than a general member directory.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeDivisionId = await getSectorIdByName(DIVISION.FINANCE);
    const allowed = can.isAdmin(ctx) || (financeDivisionId ? can.managesSector(ctx, financeDivisionId) : false);
    if (!allowed) {
      throw Errors.forbidden("Only Admins and Division 4 (Finance & Fund) can view the standing roll.");
    }

    const rows = await getStandingRoll();

    return NextResponse.json({
      month: currentFeeMonth(),
      summary: summariseRoll(rows),
      members: rows,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
