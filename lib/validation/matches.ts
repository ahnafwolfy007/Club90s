import { z } from "zod";

export const createMatchSchema = z.object({
  title: z.string().trim().min(1).max(200),
  matchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().min(1), // ISO datetime
  endTime: z.string().min(1).optional(),
  venueName: z.string().trim().min(1).max(200),
  venueAddress: z.string().trim().max(500).optional(),
  mapLink: z.string().trim().url().optional().or(z.literal("")),
  fee: z.number().min(0).optional(),
  maxPlayers: z.number().int().min(2).max(200),
  rsvpDeadline: z.string().min(1), // ISO datetime
  notes: z.string().trim().max(2000).optional(),
});

export const updateMatchSchema = createMatchSchema.partial().extend({
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

export const rsvpSchema = z.object({
  response: z.enum(["in", "out", "maybe"]),
});

export const setTeamsSchema = z.object({
  teams: z.array(
    z.object({
      name: z.string().trim().min(1).max(100),
      memberIds: z.array(z.string().min(1)),
      goalkeeperMemberId: z.string().min(1).nullable().optional(),
    }),
  ),
  status: z.enum(["draft", "published"]).default("draft"),
});
