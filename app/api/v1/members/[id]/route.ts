import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { serializeMember } from "@/lib/serializers/member";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const member = await prisma.member.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!member) throw Errors.notFound("Member");

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    return NextResponse.json({ member: serializeMember(member, ctx, financeSectorId) });
  } catch (err) {
    return handleApiError(err);
  }
}
