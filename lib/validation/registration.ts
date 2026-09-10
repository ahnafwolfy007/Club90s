import { z } from "zod";
import { passwordSchema } from "./auth";

export const startRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const verifyRegistrationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, "The code is six digits."),
  fullName: z.string().trim().min(2).max(200),
  password: passwordSchema,
});

/** The full registration detail set — matches what the club's original form collected. */
export const registrationProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").nullable().optional(),
  bloodGroup: z.string().trim().max(10).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  fathersName: z.string().trim().max(200).nullable().optional(),
  mothersName: z.string().trim().max(200).nullable().optional(),
  spouseName: z.string().trim().max(200).nullable().optional(),
  nidNumber: z.string().trim().max(50).nullable().optional(),
  nidPhotoUrl: z.string().trim().url().max(1000).nullable().optional(),
  occupation: z.string().trim().max(200).nullable().optional(),
  workplace: z.string().trim().max(200).nullable().optional(),
  educationalInstitution: z.string().trim().max(200).nullable().optional(),
  emergencyContactName: z.string().trim().max(200).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(30).nullable().optional(),
  position: z.string().trim().max(100).nullable().optional(),
  jerseyNumber: z.number().int().min(0).max(999).nullable().optional(),
  interests: z.string().trim().max(500).nullable().optional(),
  profilePhotoUrl: z.string().trim().url().max(1000).nullable().optional(),
});
