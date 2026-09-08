import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required."),
});

// Mirrors typical baseline password rules; kept simple since this is a small
// private club, not a high-value target — length is the main defense.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200);

export const activateSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
