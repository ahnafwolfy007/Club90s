import { z } from "zod";

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().trim().max(500).optional(),
  memberId: z.string().min(1).optional(),
  matchId: z.string().min(1).optional(),
  tournamentId: z.string().min(1).optional(),
  paymentMethod: z.enum(["bKash", "Cash", "Other", "Unknown"]).optional(),
  feeMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(), // required for Monthly Fee category, enforced in the handler
});

export const voidTransactionSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required to void a transaction.").max(500),
});
