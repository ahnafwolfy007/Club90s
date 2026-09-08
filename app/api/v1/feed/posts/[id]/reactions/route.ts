import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { reactSchema } from "@/lib/validation/community";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.postToFeed(ctx)) throw Errors.forbidden("Only active members can react.");

    const { id } = await params;
    const body = reactSchema.parse(await request.json());

    const existing = await prisma.postReaction.findUnique({
      where: { postId_memberId: { postId: id, memberId: ctx.memberId } },
    });

    if (existing) {
      if (existing.reactionType === body.reactionType) {
        await prisma.postReaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ reacted: false });
      }
      await prisma.postReaction.update({ where: { id: existing.id }, data: { reactionType: body.reactionType } });
      return NextResponse.json({ reacted: true });
    }

    await prisma.postReaction.create({ data: { postId: id, memberId: ctx.memberId, reactionType: body.reactionType } });
    return NextResponse.json({ reacted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
