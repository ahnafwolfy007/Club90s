import { randomInt, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Email one-time codes for self-registration.
 *
 * Six digits, so it can be typed from a phone. Short-lived and attempt-capped,
 * because six digits is only a million possibilities — the cap is what makes
 * that safe. Only the hash is stored, matching how sessions and activation
 * tokens are handled.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Stops someone hammering "resend" to spray a mailbox or farm codes. */
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashCode(email: string, code: string): string {
  // Binding the email into the hash stops a code issued for one address being
  // replayed against another.
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export async function issueOtp(email: string, purpose = "registration"): Promise<string> {
  const normalised = email.trim().toLowerCase();

  const recent = await prisma.emailVerification.findFirst({
    where: { email: normalised, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
    throw new ApiError(429, "RESEND_TOO_SOON", `A code was just sent. Try again in ${wait} seconds.`);
  }

  // Any earlier code for this address is dead the moment a new one is issued.
  await prisma.emailVerification.updateMany({
    where: { email: normalised, purpose, consumedAt: null },
    data: { expiresAt: new Date(0) },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.emailVerification.create({
    data: {
      email: normalised,
      purpose,
      codeHash: hashCode(normalised, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return code;
}

/** Consumes a code. Throws with a specific reason rather than a bare false. */
export async function verifyOtp(email: string, code: string, purpose = "registration"): Promise<void> {
  const normalised = email.trim().toLowerCase();

  const record = await prisma.emailVerification.findFirst({
    where: { email: normalised, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new ApiError(410, "CODE_INVALID", "No active code for this address. Request a new one.");
  if (record.expiresAt < new Date()) {
    throw new ApiError(410, "CODE_EXPIRED", "That code has expired. Request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Too many incorrect attempts. Request a new code.");
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const supplied = Buffer.from(hashCode(normalised, code.trim()), "hex");
  const matches = expected.length === supplied.length && timingSafeEqual(expected, supplied);

  if (!matches) {
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const left = MAX_ATTEMPTS - (record.attempts + 1);
    throw new ApiError(
      401,
      "CODE_INCORRECT",
      left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Request a new one.",
    );
  }

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}
