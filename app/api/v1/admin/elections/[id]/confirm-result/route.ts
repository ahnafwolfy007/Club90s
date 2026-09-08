import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { confirmResultSchema } from "@/lib/validation/elections";
import { confirmElectionResult } from "@/lib/elections/confirm";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.confirmElectionResult(ctx)) throw Errors.forbidden("Only Admins can confirm election results.");

    const { id } = await params;
    const body = confirmResultSchema.parse(await request.json());

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash ? await verifyPassword(actingUser.passwordHash, body.currentPassword) : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — confirmation cancelled.");

    const result = await confirmElectionResult(id, ctx.memberId, ctx.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
