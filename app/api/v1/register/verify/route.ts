import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { verifyRegistrationSchema } from "@/lib/validation/registration";
import { recordAudit } from "@/lib/audit/log";
import { handleApiError, ApiError } from "@/lib/api/errors";

/**
 * Step 2: the code checks out, so create the account and sign them in.
 *
 * The member lands as `pending`, not `active`. Proving you own an email is not
 * the same as being a member of a private club — §4.1 puts recruitment under
 * Division 1, so an admin still confirms them. They can sign in immediately to
 * fill out their details, and become fully verified once the profile is
 * complete, but they hold no voting rights until approved.
 */
export async function POST(request: NextRequest) {
  try {
    const body = verifyRegistrationSchema.parse(await request.json());

    const taken = await prisma.user.findUnique({ where: { email: body.email } });
    if (taken) throw new ApiError(409, "EMAIL_REGISTERED", "This email is already registered.");

    await verifyOtp(body.email, body.code);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, status: "active" },
    });
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        fullName: body.fullName,
        joiningDate: new Date(),
        status: "pending",
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "member.self_register",
      entityType: "member",
      entityId: member.id,
      after: { email: body.email, fullName: body.fullName, status: "pending" },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email },
      memberId: member.id,
      status: "pending",
    });
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
