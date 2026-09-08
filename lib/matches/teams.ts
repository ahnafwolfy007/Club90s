import { prisma } from "@/lib/db/client";
import { notifyMember } from "@/lib/notifications/create";
import { ApiError, Errors } from "@/lib/api/errors";
import type { z } from "zod";
import type { setTeamsSchema } from "@/lib/validation/matches";

type TeamsInput = z.infer<typeof setTeamsSchema>;

export async function setMatchTeams(matchId: string, createdById: string, input: TeamsInput) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw Errors.notFound("Match");
  if (match.status === "completed") {
    throw new ApiError(409, "TEAMS_LOCKED", "Teams are locked once a match is completed.");
  }

  const teams = await prisma.$transaction(async (tx) => {
    await tx.team.deleteMany({ where: { matchId } });

    const created = [];
    for (const t of input.teams) {
      const team = await tx.team.create({
        data: { matchId, name: t.name, status: input.status, createdById },
      });
      if (t.memberIds.length > 0) {
        await tx.teamPlayer.createMany({
          data: t.memberIds.map((memberId) => ({
            teamId: team.id,
            memberId,
            isGoalkeeper: memberId === t.goalkeeperMemberId,
          })),
        });
      }
      created.push(team);
    }
    return created;
  });

  if (input.status === "published") {
    const memberIds = input.teams.flatMap((t) => t.memberIds);
    await Promise.all(
      memberIds.map((memberId) => notifyMember(memberId, "teams_published", { matchId, matchTitle: match.title })),
    );
  }

  return teams;
}
