import { prisma } from "@/lib/db/client";

/** Records a Tier 2/3 sensitive action to the permanent audit trail (SRS §7.4, §30). */
export async function recordAudit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      beforeValue: params.before === undefined ? undefined : (params.before as object),
      afterValue: params.after === undefined ? undefined : (params.after as object),
    },
  });
}
