import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

const ACTIVATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per SRS §17.2

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Invalidates any prior unused token for this user, then issues a fresh one. Returns the raw token — never persisted. */
export async function issueActivationToken(userId: string): Promise<string> {
  await prisma.activationToken.updateMany({
    where: { userId, usedAt: null },
    data: { expiresAt: new Date(0) },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.activationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
    },
  });
  return token;
}

/** Marks the token used and returns the associated userId, or null if invalid/expired/already used. */
export async function consumeActivationToken(rawToken: string): Promise<string | null> {
  const record = await prisma.activationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.activationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}
