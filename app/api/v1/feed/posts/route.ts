import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { createPostSchema } from "@/lib/validation/community";
import { Errors, handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const posts = await prisma.post.findMany({
      where: { status: "visible" },
      include: {
        author: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        reactions: true,
        comments: { where: { status: "visible" }, include: { author: { select: { fullName: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ posts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.postToFeed(ctx)) throw Errors.forbidden("Only active members can post.");

    const body = createPostSchema.parse(await request.json());

    const post = await prisma.post.create({
      data: { authorId: ctx.memberId, content: body.content, sectorTag: body.sectorTag },
      include: { author: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });

    return NextResponse.json({ post });
  } catch (err) {
    return handleApiError(err);
  }
}
