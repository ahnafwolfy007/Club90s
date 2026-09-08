import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { MatchList } from "@/components/matches/match-list";

export default async function MatchesPage() {
  const ctx = await getCurrentUser();
  const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
  const canCreate = ctx && clubTeamSectorId && can.manageMatches(ctx, clubTeamSectorId);

  const matches = await prisma.match.findMany({
    where: { status: { not: "draft" }, matchDate: { gte: new Date(new Date().toDateString()) } },
    orderBy: { matchDate: "asc" },
    include: { _count: { select: { rsvps: { where: { response: "in", waitlisted: false } } } } },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Matches</h1>
        {canCreate && (
          <Link href="/matches/new" className="text-sm font-medium text-primary">
            + New match
          </Link>
        )}
      </div>
      <MatchList
        matches={matches.map((m) => ({
          id: m.id,
          title: m.title,
          matchDate: m.matchDate.toISOString(),
          venueName: m.venueName,
          maxPlayers: m.maxPlayers,
          confirmedCount: m._count.rsvps,
          status: m.status,
        }))}
      />
    </div>
  );
}
