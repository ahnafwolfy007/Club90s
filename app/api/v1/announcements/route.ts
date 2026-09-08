import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { createAnnouncementSchema } from "@/lib/validation/community";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const announcements = await prisma.announcement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { author: { select: { fullName: true } } },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ announcements });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const commsSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.COMMUNICATIONS);
    const isPrivileged = can.isAdmin(ctx) || (commsSectorId ? can.isPresidentOfSector(ctx, commsSectorId) : false);
    if (!isPrivileged) throw Errors.forbidden("Only the Communications President or an Admin can publish announcements.");

    const body = createAnnouncementSchema.parse(await request.json());

    const announcement = await prisma.announcement.create({
      data: {
        authorId: ctx.memberId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority,
        targetAudience: body.targetAudience,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return NextResponse.json({ announcement });
  } catch (err) {
    return handleApiError(err);
  }
}
