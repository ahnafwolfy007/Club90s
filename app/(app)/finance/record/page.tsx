import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { RecordPaymentForm } from "@/components/finance/record-payment-form";

export default async function RecordPaymentPage() {
  const ctx = await getCurrentUser();
  const financeSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.FINANCE);
  if (!ctx || !financeSectorId || !can.recordTransaction(ctx, financeSectorId)) redirect("/finance");

  const categories = await prisma.financeCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Record a payment</h1>
      <RecordPaymentForm categories={categories} />
    </div>
  );
}
