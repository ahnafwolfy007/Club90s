import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { verifyPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { deleteMemberSchema } from "@/lib/validation/members";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

/**
 * Removes a member from the club.
 *
 * Two modes, because a hard delete is not always safe:
 *
 *  - `deactivate` (default) suspends the login, revokes live sessions and
 *    marks the member inactive. Everything they touched stays intact and the
 *    action is reversible.
 *  - `delete` erases the account outright, and is refused when the member has
 *    any financial history. `financial_transactions.member_id` is a nullable
 *    relation, so deleting them would quietly NULL out who paid each due —
 *    the ledger would keep the money but lose the person. That contradicts the
 *    ledger's never-destroy rule (SRS §10.5), so the route blocks it and
 *    points at deactivation instead.
 *
 * Both require re-authentication and the member's name typed back, since
 * neither is something to trigger by mis-tapping a row. Note the SRS puts
 * outright deletion at Tier 3 (two-admin approval); this is single-admin with
 * heavy friction, which is a deliberate simplification worth revisiting if the
 * club wants the stricter gate.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.isAdmin(ctx)) throw Errors.forbidden("Only Admins can remove member accounts.");

    const { id } = await params;
    const raw = await request.json();
    const body = deleteMemberSchema.parse(raw);
    const mode: "deactivate" | "delete" = raw.mode === "delete" ? "delete" : "deactivate";

    const member = await prisma.member.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, status: true } } },
    });
    if (!member) throw Errors.notFound("Member");

    if (member.id === ctx.memberId) {
      throw Errors.forbidden("You can't remove your own account.");
    }

    const actingUser = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const reauthOk = actingUser?.passwordHash
      ? await verifyPassword(actingUser.passwordHash, body.currentPassword)
      : false;
    if (!reauthOk) throw new ApiError(401, "REAUTH_FAILED", "Incorrect password — nothing was changed.");

    if (body.confirmName.toLowerCase() !== member.fullName.toLowerCase()) {
      throw new ApiError(422, "NAME_MISMATCH", `Type "${member.fullName}" exactly to confirm.`);
    }

    // Never orphan the ledger.
    const [linkedTransactions, recordedTransactions] = await Promise.all([
      prisma.financialTransaction.count({ where: { memberId: id } }),
      prisma.financialTransaction.count({ where: { recordedById: id } }),
    ]);

    if (mode === "delete" && (linkedTransactions > 0 || recordedTransactions > 0)) {
      throw new ApiError(
        409,
        "HAS_FINANCIAL_HISTORY",
        `${member.fullName} has ${linkedTransactions} payment${linkedTransactions === 1 ? "" : "s"} and recorded ${recordedTransactions} transaction${recordedTransactions === 1 ? "" : "s"}. Deleting them would detach that history from the ledger. Deactivate the account instead — it keeps every record and can be undone.`,
      );
    }

    await revokeAllSessionsForUser(member.user.id);

    if (mode === "delete") {
      await prisma.user.delete({ where: { id: member.user.id } }); // cascades to the member row
      await recordAudit({
        actorId: ctx.userId,
        action: "member.delete",
        entityType: "member",
        entityId: id,
        before: { fullName: member.fullName, email: member.user.email },
        after: { deleted: true, reason: body.reason ?? null },
      });
      return NextResponse.json({ mode, removed: true });
    }

    await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { status: "inactive" } }),
      prisma.user.update({ where: { id: member.user.id }, data: { status: "suspended" } }),
      // §16.6 — a departing member's roles are suspended, never left live.
      prisma.roleAssignment.updateMany({
        where: { memberId: id, status: "active" },
        data: { status: "suspended" },
      }),
    ]);

    await recordAudit({
      actorId: ctx.userId,
      action: "member.deactivate",
      entityType: "member",
      entityId: id,
      before: { memberStatus: member.status, userStatus: member.user.status },
      after: { memberStatus: "inactive", userStatus: "suspended", reason: body.reason ?? null },
    });

    return NextResponse.json({ mode, removed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
