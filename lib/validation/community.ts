import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  sectorTag: z.string().min(1).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const reactSchema = z.object({
  reactionType: z.string().trim().min(1).max(20),
});

export const moderateSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const createAchievementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  eventName: z.string().trim().max(200).optional(),
  issuingOrg: z.string().trim().max(200).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  imageUrl: z.string().trim().url().optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  type: z.enum(["General", "Match", "Tournament", "Finance", "Urgent", "Event"]),
  priority: z.enum(["normal", "high"]).default("normal"),
  targetAudience: z.string().trim().max(50).default("all"),
  expiresAt: z.string().optional(),
});
