import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
// Used when the account doesn't exist, so login takes the same time either way
// and a timing difference can't be used to enumerate registered emails.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$epBCzOgu0M9jhjzN+8QT9Q$+mC/laNnkXfHBLQ6d0JrSfAU6zetiMh6lcDyUiySNaQ";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user) {
      await verifyPassword(DUMMY_HASH, body.password);
      throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(429, "ACCOUNT_LOCKED", "Too many failed attempts. Try again later.");
    }

    if (user.status === "unactivated") {
      throw new ApiError(403, "ACCOUNT_NOT_ACTIVATED", "Activate your account first — check your email for the activation link.");
    }
    if (user.status === "suspended") {
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account has been suspended.");
    }

    const validPassword = user.passwordHash ? await verifyPassword(user.passwordHash, body.password) : false;

    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
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
