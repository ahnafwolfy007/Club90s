import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/audit/log";
import { ApiError, Errors } from "@/lib/api/errors";

/**
 * VOID + reversal pattern (SRS §10.5): a transaction is never deleted or
 * edited in place. This marks it voided with a reason; callers that need a
 * correction create a fresh transaction (optionally linked via
 * reversalOfTransactionId) rather than reusing this row.
 */
export async function voidTransaction(transactionId: string, voidedByMemberId: string, voidedByUserId: string, reason: string) {
  const existing = await prisma.financialTransaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw Errors.notFound("Transaction");
  if (existing.status === "voided") {
    throw new ApiError(409, "ALREADY_VOIDED", "This transaction has already been voided.");
  }

  const voided = await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: { status: "voided", voidedById: voidedByMemberId, voidedAt: new Date(), voidReason: reason },
  });

  await recordAudit({
    actorId: voidedByUserId,
    action: "finance.void",
    entityType: "financial_transaction",
    entityId: transactionId,
    before: { status: existing.status, amount: existing.amount.toString() },
    after: { status: "voided", reason },
  });

  return voided;
}
