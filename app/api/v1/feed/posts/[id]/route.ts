import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { createPostSchema, moderateSchema } from "@/lib/validation/community";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw Errors.notFound("Post");
    if (!can.editOwnPost(ctx, post.authorId)) throw Errors.forbidden("You can only edit your own posts.");

    const body = createPostSchema.parse(await request.json());
    const updated = await prisma.post.update({
      where: { id },
      data: { content: body.content, sectorTag: body.sectorTag, editedAt: new Date() },
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw Errors.notFound("Post");

    const isOwner = can.editOwnPost(ctx, post.authorId);
    const isModerator = can.moderateFeed(ctx);
    if (!isOwner && !isModerator) throw Errors.forbidden("You can only remove your own posts.");

    if (isModerator && !isOwner) {
      const body = moderateSchema.parse(await request.json().catch(() => ({})));
      await prisma.post.update({ where: { id }, data: { status: "removed" } });
      await recordAudit({
        actorId: ctx.userId,
        action: "post.moderate_remove",
        entityType: "post",
        entityId: id,
        after: { reason: body.reason },
      });
    } else {
      await prisma.post.update({ where: { id }, data: { status: "removed" } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
