import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { serializeMember } from "@/lib/serializers/member";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { can } from "@/lib/permissions/can";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    const isPrivileged = can.isAdmin(ctx) || (financeSectorId ? can.isPresidentOfSector(ctx, financeSectorId) : false);
    if (!isPrivileged) throw Errors.forbidden("Only Admins and the Finance President can list members.");

    const q = request.nextUrl.searchParams.get("q")?.trim();
    const status = request.nextUrl.searchParams.get("status");

    const members = await prisma.member.findMany({
      where: {
        ...(status && { status: status as "active" | "inactive" | "pending" }),
        ...(q && {
          OR: [{ fullName: { contains: q } }, { user: { email: { contains: q } } }],
        }),
      },
      include: { user: { select: { email: true } } },
      orderBy: { fullName: "asc" },
      take: 100,
    });

    return NextResponse.json({
      members: members.map((m) => serializeMember(m, ctx, financeSectorId)),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
