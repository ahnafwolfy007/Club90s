import { prisma } from "@/lib/db/client";
import { issueActivationToken } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { activationEmail, passwordResetEmail } from "@/lib/email/templates";

export type CredentialEmailResult = { memberId: string; email: string; kind: "activation" | "reset"; sent: boolean; error?: string };

/**
 * Issues a fresh single-use token and mails the matching link. A member who has
 * never logged in gets "activate your account"; everyone else gets "reset your
 * password" — same underlying token flow, different copy so the message matches
 * the recipient's situation.
 *
 * Issuing a token does not invalidate the member's existing password: it only
 * takes effect if they actually follow the link.
 */
export async function sendCredentialEmail(memberId: string): Promise<CredentialEmailResult> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, email: true, status: true } } },
  });
  if (!member) return { memberId, email: "", kind: "reset", sent: false, error: "Member not found." };

  const kind = member.user.status === "unactivated" ? "activation" : "reset";

  try {
    const token = await issueActivationToken(member.user.id);
    const path = kind === "activation" ? "activate" : "reset";
    const url = `${process.env.APP_URL}/${path}?token=${token}`;
    const mail = kind === "activation" ? activationEmail(member.fullName, url) : passwordResetEmail(member.fullName, url);
    await sendEmail(member.user.email, mail.subject, mail.text, mail.html);
    return { memberId, email: member.user.email, kind, sent: true };
  } catch (err) {
    return {
      memberId,
      email: member.user.email,
      kind,
      sent: false,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}

/**
 * Bulk send, one at a time. Sequential rather than parallel on purpose: Gmail
 * throttles bursts, and a club-sized list is small enough that pacing costs
 * nothing. One failure never aborts the rest — every result is reported back.
 */
export async function sendCredentialEmailsToAll(options: { onlyUnactivated?: boolean } = {}) {
  const members = await prisma.member.findMany({
    where: {
      status: { not: "inactive" },
      ...(options.onlyUnactivated && { user: { status: "unactivated" } }),
    },
    select: { id: true },
  });

  const results: CredentialEmailResult[] = [];
  for (const m of members) {
    results.push(await sendCredentialEmail(m.id));
  }
  return results;
}
