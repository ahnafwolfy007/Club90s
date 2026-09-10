import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName } from "@/lib/db/sectors";
import { DIVISION, expectedDuesFor } from "@/lib/rulebook";
import { notifyMember } from "@/lib/notifications/create";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

const schema = z.object({
  memberId: z.string().min(1),
  feeMonth: z.string().regex(/^\d{4}-\d{2}$/),
  /** Defaults to whatever the rulebook says is owed for that member and month. */
  amount: z.number().positive().optional(),
  paymentMethod: z.enum(["bKash", "Cash", "Other", "Unknown"]).default("bKash"),
});

/**
 * Marks a member's monthly dues as paid, straight from the standing roll.
 *
 * Writes a normal ledger row (§10.1 single ledger) rather than a status flag,
 * so the money shows up in the accounts exactly like any other income and stays
 * correctable through the usual void-and-replace path.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeDivisionId = await getSectorIdByName(DIVISION.FINANCE);
    const allowed = can.isAdmin(ctx) || (financeDivisionId ? can.managesSector(ctx, financeDivisionId) : false);
    if (!allowed) throw Errors.forbidden("Only Admins and Division 4 (Finance & Fund) can record dues.");

    const body = schema.parse(await request.json());

    const member = await prisma.member.findUnique({
      where: { id: body.memberId },
      select: { id: true, fullName: true, membershipClass: true },
    });
    if (!member) throw Errors.notFound("Member");

    const expected = expectedDuesFor(member.membershipClass, body.feeMonth);
    if (expected === null) {
      throw new ApiError(
        422,
        "BEFORE_RULEBOOK",
        `${body.feeMonth} predates the rulebook's fee schedule. Record it through the finance ledger instead.`,
      );
    }
    if (expected === 0) {
      throw new ApiError(
        409,
        "MEMBER_EXEMPT",
        `${member.fullName} is a Junior Member and exempt from monthly dues (§2.1.2). Nothing to record.`,
      );
    }

    const category = await prisma.financeCategory.findUnique({ where: { name: "Monthly Fee" } });
    if (!category) throw Errors.notFound("Monthly Fee category");

    const amount = body.amount ?? expected;

    const transaction = await prisma.financialTransaction.create({
      data: {
        type: "income",
        categoryId: category.id,
        amount,
        memberId: member.id,
        feeMonth: body.feeMonth,
        paymentMethod: body.paymentMethod,
        description: `Monthly dues ${body.feeMonth} (§2.2.1)`,
        recordedById: ctx.memberId,
        source: "manual",
      },
    });

    await notifyMember(member.id, "payment_recorded", {
      amount: String(amount),
      category: "Monthly Fee",
      feeMonth: body.feeMonth,
    });

    return NextResponse.json({ transaction, expected });
  } catch (err) {
    return handleApiError(err);
  }
}
