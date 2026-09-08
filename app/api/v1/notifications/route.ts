import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const notifications = await prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.readAt).length });
  } catch (err) {
    return handleApiError(err);
  }
}
