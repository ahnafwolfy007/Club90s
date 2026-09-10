import { z } from "zod";

export const memberImportRowSchema = z.object({
  full_name: z.string().trim().min(1, "full_name is required"),
  email: z.string().trim().toLowerCase().email("email must be valid"),
  phone: z.string().trim().optional().or(z.literal("")),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_of_birth must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  joining_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "joining_date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  position: z.string().trim().optional().or(z.literal("")),
  jersey_number: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "pending"]).optional().or(z.literal("")),
});

export type MemberImportRow = z.infer<typeof memberImportRowSchema>;

export const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  position: z.string().trim().max(100).optional(),
  jerseyNumber: z.number().int().min(0).max(999).nullable().optional(),
  preferredFoot: z.enum(["left", "right", "both"]).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  emergencyContact: z.string().trim().max(255).nullable().optional(),
});

export const updateMemberEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

/** Rulebook §2.1 / §6.1 / §3.2 — the classifications every other rule reads from. */
export const updateClassificationSchema = z
  .object({
    membershipClass: z.enum(["senior", "junior"]).optional(),
    squadType: z.enum(["core", "general"]).optional(),
    isFoundingMember: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: "Nothing to change.",
  });

/** Deleting a member account — see the route for why this needs the name typed back. */
export const deleteMemberSchema = z.object({
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
  confirmName: z.string().trim().min(1, "Type the member's full name to confirm."),
  reason: z.string().trim().max(500).optional(),
});

export const assignRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["member", "president", "admin", "advisor"]),
  sectorId: z.string().min(1).nullable().optional(),
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
});
