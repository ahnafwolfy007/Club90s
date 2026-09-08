import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { issueActivationToken } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { activationEmail } from "@/lib/email/templates";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can resend activation emails.");

    const { id } = await params;
    const member = await prisma.member.findUnique({ where: { id }, include: { user: true } });
    if (!member) throw Errors.notFound("Member");
    if (member.user.status !== "unactivated") {
      throw new ApiError(409, "ALREADY_ACTIVATED", "This member has already activated their account.");
    }

    const token = await issueActivationToken(member.user.id);
    const activationUrl = `${process.env.APP_URL}/activate?token=${token}`;
    const email = activationEmail(member.fullName, activationUrl);
    await sendEmail(member.user.email, email.subject, email.text);

    await recordAudit({
      actorId: ctx.userId,
      action: "member.resend_activation",
      entityType: "member",
      entityId: member.id,
    });

    return NextResponse.json({ ok: true, sentAt: new Date().toISOString() });
  } catch (err) {
    return handleApiError(err);
  }
}
