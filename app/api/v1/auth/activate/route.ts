import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { consumeActivationToken } from "@/lib/auth/activation";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { activateSchema } from "@/lib/validation/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const body = activateSchema.parse(await request.json());

    const userId = await consumeActivationToken(body.token);
    if (!userId) {
      throw new ApiError(410, "TOKEN_INVALID_OR_EXPIRED", "This activation link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, status: "active" },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
