import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { LiveBidding } from "@/components/tournaments/live-bidding";

export default async function TournamentBiddingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) notFound();

  const myTeam = await prisma.tournamentTeam.findFirst({ where: { tournamentId: id, ownerMemberId: ctx.memberId } });

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">{tournament.name} — Live bidding</h1>
      <LiveBidding tournamentId={id} myTeamId={myTeam?.id ?? null} />
    </div>
  );
}
