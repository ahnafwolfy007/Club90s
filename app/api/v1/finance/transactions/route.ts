import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { createTransactionSchema } from "@/lib/validation/finance";
import { notifyMember } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/send";
import { paymentReceiptEmail } from "@/lib/email/templates";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.managesSector(ctx, financeSectorId)) {
      throw Errors.forbidden("Only the Finance President or an Admin can view the ledger.");
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        ...(searchParams.get("type") && { type: searchParams.get("type") as "income" | "expense" }),
        ...(searchParams.get("categoryId") && { categoryId: searchParams.get("categoryId")! }),
        ...(searchParams.get("memberId") && { memberId: searchParams.get("memberId")! }),
        ...(searchParams.get("status") && { status: searchParams.get("status") as "posted" | "voided" }),
      },
      include: { category: true, member: { select: { fullName: true } }, recordedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
    if (!financeSectorId || !can.recordTransaction(ctx, financeSectorId)) {
      throw Errors.forbidden("Only the Finance President or an Admin can record transactions.");
    }

    const body = createTransactionSchema.parse(await request.json());

    const category = await prisma.financeCategory.findUnique({ where: { id: body.categoryId } });
    if (!category) throw Errors.notFound("Category");
    if (category.type !== body.type) {
      throw new ApiError(422, "VALIDATION_ERROR", "This category doesn't match the transaction type.");
    }
    if (category.name === "Monthly Fee" && !body.feeMonth) {
      throw new ApiError(422, "VALIDATION_ERROR", "feeMonth is required for Monthly Fee transactions.");
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        type: body.type,
        categoryId: body.categoryId,
        amount: body.amount,
        description: body.description,
        memberId: body.memberId,
        matchId: body.matchId,
        tournamentId: body.tournamentId,
        paymentMethod: body.paymentMethod,
        feeMonth: body.feeMonth,
        recordedById: ctx.memberId,
        source: "manual",
      },
    });

    if (body.memberId) {
      await notifyMember(body.memberId, "payment_recorded", { amount: body.amount, category: category.name });

      const payer = await prisma.member.findUnique({
        where: { id: body.memberId },
        include: { user: { select: { email: true, status: true } } },
      });
      if (payer && payer.user.status === "active") {
        const receipt = paymentReceiptEmail(payer.fullName, String(body.amount), category.name, body.feeMonth);
        await sendEmail(payer.user.email, receipt.subject, receipt.text, receipt.html);
      }
    }

    return NextResponse.json({ transaction });
  } catch (err) {
    return handleApiError(err);
  }
}
