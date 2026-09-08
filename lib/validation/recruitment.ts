import { z } from "zod";

export const submitRecruitmentSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  contactInfo: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(2000).optional(),
});

export const reviewRecruitmentSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export const approveRecruitmentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
