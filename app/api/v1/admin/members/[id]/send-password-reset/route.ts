import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { sendCredentialEmail } from "@/lib/auth/password-reset";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can send password reset links.");

    const { id } = await params;
    const result = await sendCredentialEmail(id);
    if (!result.sent) {
      throw new ApiError(502, "EMAIL_FAILED", result.error ?? "Could not send the email.");
    }

    await recordAudit({
      actorId: ctx.userId,
      action: result.kind === "activation" ? "member.resend_activation" : "member.send_password_reset",
      entityType: "member",
      entityId: id,
    });

    return NextResponse.json({ ok: true, kind: result.kind, email: result.email });
  } catch (err) {
    return handleApiError(err);
  }
}
