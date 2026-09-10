import { prisma } from "@/lib/db/client";
import { recordAudit } from "@/lib/audit/log";
import { notifyMember } from "@/lib/notifications/create";
import { ApiError, Errors } from "@/lib/api/errors";
import type { DisciplinaryType } from "@/app/generated/prisma/enums";

/**
 * Sanctions under §7.2, plus the automatic one-match suspensions from §5.3.3.
 *
 * Records are never deleted. Clearing a penalty sets it to `rescinded` and
 * keeps who did it and why, the same void-don't-delete discipline the finance
 * ledger uses (SRS §10.5) — a member disputing a suspension months later
 * should be able to see the whole story.
 */

export async function issuePenalty(params: {
  memberId: string;
  type: DisciplinaryType;
  reason: string;
  clause?: string;
  matchesSuspended?: number;
  fineAmount?: number;
  sourceMatchId?: string;
  issuedByMemberId: string;
  issuedByUserId: string;
}) {
  const member = await prisma.member.findUnique({ where: { id: params.memberId } });
  if (!member) throw Errors.notFound("Member");

  if (params.type === "match_suspension" && !params.matchesSuspended) {
    throw new ApiError(422, "VALIDATION_ERROR", "A match suspension needs a number of matches.");
  }
  if (params.type === "fine" && !params.fineAmount) {
    throw new ApiError(422, "VALIDATION_ERROR", "A fine needs an amount.");
  }

  const record = await prisma.disciplinaryRecord.create({
    data: {
      memberId: params.memberId,
      type: params.type,
      reason: params.reason,
      clause: params.clause,
      matchesSuspended: params.matchesSuspended,
      fineAmount: params.fineAmount,
      sourceMatchId: params.sourceMatchId,
      issuedById: params.issuedByMemberId,
    },
  });

  await recordAudit({
    actorId: params.issuedByUserId,
    action: "discipline.issue",
    entityType: "member",
    entityId: params.memberId,
    after: { type: params.type, reason: params.reason, clause: params.clause, recordId: record.id },
  });

  await notifyMember(params.memberId, "discipline_issued", {
    type: params.type,
    reason: params.reason,
    clause: params.clause ?? null,
  });

  return record;
}

export async function rescindPenalty(params: {
  recordId: string;
  reason: string;
  byMemberId: string;
  byUserId: string;
}) {
  const record = await prisma.disciplinaryRecord.findUnique({ where: { id: params.recordId } });
  if (!record) throw Errors.notFound("Disciplinary record");
  if (record.status === "rescinded") {
    throw new ApiError(409, "ALREADY_RESCINDED", "This penalty has already been lifted.");
  }

  const updated = await prisma.disciplinaryRecord.update({
    where: { id: params.recordId },
    data: {
      status: "rescinded",
      rescindedById: params.byMemberId,
      rescindedAt: new Date(),
      rescindReason: params.reason,
    },
  });

  await recordAudit({
    actorId: params.byUserId,
    action: "discipline.rescind",
    entityType: "member",
    entityId: record.memberId,
    before: { status: record.status, type: record.type, reason: record.reason },
    after: { status: "rescinded", rescindReason: params.reason },
  });

  await notifyMember(record.memberId, "discipline_rescinded", {
    type: record.type,
    reason: params.reason,
  });

  return updated;
}

/**
 * Clears every outstanding penalty club-wide — the clean-slate button.
 *
 * Sweeping enough to be worth a re-auth and an audit entry naming how many
 * members it touched. Records are rescinded rather than removed, so the
 * history of what was cleared, by whom and why survives.
 */
export async function resetAllPenalties(params: { reason: string; byMemberId: string; byUserId: string }) {
  const active = await prisma.disciplinaryRecord.findMany({
    where: { status: "active" },
    select: { id: true, memberId: true, type: true },
  });

  if (active.length === 0) {
    return { cleared: 0, membersAffected: 0 };
  }

  await prisma.disciplinaryRecord.updateMany({
    where: { status: "active" },
    data: {
      status: "rescinded",
      rescindedById: params.byMemberId,
      rescindedAt: new Date(),
      rescindReason: params.reason,
    },
  });

  const membersAffected = new Set(active.map((r) => r.memberId));

  await recordAudit({
    actorId: params.byUserId,
    action: "discipline.reset_all",
    entityType: "club",
    entityId: null,
    before: { activePenalties: active.length, members: membersAffected.size },
    after: { status: "rescinded", reason: params.reason },
  });

  await Promise.all(
    [...membersAffected].map((memberId) =>
      notifyMember(memberId, "discipline_rescinded", { type: "reset", reason: params.reason }),
    ),
  );

  return { cleared: active.length, membersAffected: membersAffected.size };
}

/** Active sanctions for a member, newest first. */
export async function activePenaltiesFor(memberId: string) {
  return prisma.disciplinaryRecord.findMany({
    where: { memberId, status: "active" },
    orderBy: { issuedAt: "desc" },
  });
}

/**
 * How many matches a member is currently suspended for — the number the RSVP
 * path checks before letting them into a squad.
 */
export async function outstandingSuspensionMatches(memberId: string): Promise<number> {
  const suspensions = await prisma.disciplinaryRecord.findMany({
    where: { memberId, status: "active", type: "match_suspension" },
    select: { matchesSuspended: true },
  });
  return suspensions.reduce((total, s) => total + (s.matchesSuspended ?? 0), 0);
}
