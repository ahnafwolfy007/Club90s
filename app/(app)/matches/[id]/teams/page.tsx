import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { TeamFormation } from "@/components/matches/team-formation";

export default async function MatchTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
  if (!ctx || !clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) redirect(`/matches/${id}`);

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) notFound();

  const [rsvps, existingTeams] = await Promise.all([
    prisma.matchRsvp.findMany({
      where: { matchId: id, response: "in", waitlisted: false },
      include: { member: { select: { id: true, fullName: true, position: true } } },
      orderBy: { respondedAt: "asc" },
    }),
    prisma.team.findMany({ where: { matchId: id }, include: { players: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Form teams — {match.title}</h1>
      <TeamFormation
        matchId={id}
        players={rsvps.map((r) => r.member)}
        initialTeams={existingTeams.map((t) => ({
          name: t.name,
          memberIds: t.players.map((p) => p.memberId),
          goalkeeperMemberId: t.players.find((p) => p.isGoalkeeper)?.memberId ?? null,
        }))}
      />
    </div>
  );
}
