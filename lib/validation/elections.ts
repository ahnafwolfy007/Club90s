import { z } from "zod";

export const createElectionSchema = z.object({
  sectorId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  candidateMemberIds: z.array(z.string().min(1)).min(2, "At least 2 candidates are required."),
  eligibleMemberIds: z.array(z.string().min(1)).min(1, "At least 1 eligible voter is required."),
});

export const castVoteSchema = z.object({
  candidateId: z.string().min(1),
});

export const confirmResultSchema = z.object({
  currentPassword: z.string().min(1, "Re-enter your password to confirm this action."),
});
