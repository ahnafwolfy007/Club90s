import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { TournamentManager } from "@/components/tournaments/tournament-manager";

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: { include: { member: { select: { fullName: true } } }, orderBy: { auctionOrder: "asc" } },
      bidTeams: { include: { ownerMember: { select: { fullName: true } } } },
    },
  });
  if (!tournament) notFound();

  const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
  const isManager = tournamentSectorId ? can.manageTournament(ctx, tournamentSectorId) : false;

  const members = await prisma.member.findMany({ where: { status: "active" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } });

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">{tournament.name}</h1>
        <p className="text-sm text-muted-foreground">
          {tournament.format} · {tournament.startDate.toLocaleDateString()} · {tournament.status}
        </p>
      </div>

      {tournament.status === "in_progress" || tournament.currentPlayerId ? (
        <Link href={`/tournaments/${id}/bidding`} className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
          Go to live bidding
        </Link>
      ) : (
        tournament.status === "completed" && (
          <Link href={`/tournaments/${id}/bidding`} className="text-sm font-medium text-primary">
            View results
          </Link>
        )
      )}

      {isManager && tournament.status !== "completed" && (
        <TournamentManager
          tournamentId={id}
          members={members}
          pool={tournament.players.map((p) => ({ id: p.id, status: p.status, member: p.member }))}
          teams={tournament.bidTeams.map((t) => ({ id: t.id, teamName: t.teamName, remainingBudget: t.remainingBudget.toString(), ownerMember: t.ownerMember }))}
        />
      )}
    </div>
  );
}
