import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { createCommentSchema } from "@/lib/validation/community";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.postToFeed(ctx)) throw Errors.forbidden("Only active members can comment.");

    const { id } = await params;
    const body = createCommentSchema.parse(await request.json());

    const comment = await prisma.postComment.create({
      data: { postId: id, authorId: ctx.memberId, content: body.content },
      include: { author: { select: { fullName: true } } },
    });

    return NextResponse.json({ comment });
  } catch (err) {
    return handleApiError(err);
  }
}
