import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    await prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
