import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { createSectorSchema } from "@/lib/validation/sectors";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ sectors });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.manageSectors(ctx)) throw Errors.forbidden("Only Admins can create sectors.");

    const body = createSectorSchema.parse(await request.json());

    const existing = await prisma.sector.findUnique({ where: { name: body.name } });
    if (existing) throw new ApiError(409, "SECTOR_EXISTS", "A sector with this name already exists.");

    const sector = await prisma.sector.create({
      data: { name: body.name, description: body.description, createdById: ctx.memberId },
    });

    await recordAudit({ actorId: ctx.userId, action: "sector.create", entityType: "sector", entityId: sector.id, after: sector });

    return NextResponse.json({ sector });
  } catch (err) {
    return handleApiError(err);
  }
}
