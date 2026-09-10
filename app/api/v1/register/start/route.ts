import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { issueOtp } from "@/lib/auth/otp";
import { sendEmail } from "@/lib/email/send";
import { registrationCodeEmail } from "@/lib/email/templates";
import { startRegistrationSchema } from "@/lib/validation/registration";
import { handleApiError, ApiError } from "@/lib/api/errors";

/** Step 1 of self-registration: prove the address is yours. */
export async function POST(request: NextRequest) {
  try {
    const body = startRegistrationSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { status: true },
    });
    if (existing) {
      throw new ApiError(
        409,
        "EMAIL_REGISTERED",
        existing.status === "unactivated"
          ? "This email is already on the club roll but hasn't been activated. Ask an admin to resend your activation link."
          : "This email is already registered. Sign in, or use a password reset if you've forgotten it.",
      );
    }

    const code = await issueOtp(body.email);
    const email = registrationCodeEmail(body.fullName, code);
    await sendEmail(body.email, email.subject, email.text, email.html);

    return NextResponse.json({ sent: true, email: body.email });
  } catch (err) {
    return handleApiError(err);
  }
}
