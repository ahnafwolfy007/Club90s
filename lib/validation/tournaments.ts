import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numTeams: z.number().int().min(2).max(32),
  format: z.string().trim().min(1).max(50),
  rules: z.string().trim().max(5000).optional(),
  venue: z.string().trim().max(200).optional(),
  fee: z.number().min(0).optional(),
  startingBid: z.number().min(0).default(50),
  bidIncrement: z.number().min(1).default(10),
  bidTimerSeconds: z.number().int().min(5).max(300).default(20),
});

export const addPlayersSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
});

export const addTeamSchema = z.object({
  teamName: z.string().trim().min(1).max(100),
  ownerMemberId: z.string().min(1),
  startingBudget: z.number().positive(),
  minSquad: z.number().int().min(1),
  maxSquad: z.number().int().min(1),
});

export const placeBidSchema = z.object({
  tournamentTeamId: z.string().min(1),
  amount: z.number().positive(),
  clientRequestId: z.string().min(1),
});
