import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { createAchievementSchema } from "@/lib/validation/community";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const memberId = request.nextUrl.searchParams.get("memberId") ?? ctx.memberId;
    const achievements = await prisma.achievement.findMany({
      where: { memberId, OR: [{ visibility: "all_members" }, { memberId: ctx.memberId }] },
      orderBy: { year: "desc" },
    });

    return NextResponse.json({ achievements });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const body = createAchievementSchema.parse(await request.json());

    const achievement = await prisma.achievement.create({
      data: { memberId: ctx.memberId, ...body },
    });

    return NextResponse.json({ achievement });
  } catch (err) {
    return handleApiError(err);
  }
}
