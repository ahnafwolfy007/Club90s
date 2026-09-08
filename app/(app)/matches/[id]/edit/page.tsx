import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { MatchForm } from "@/components/matches/match-form";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
  if (!ctx || !clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) redirect(`/matches/${id}`);

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) notFound();

  const pad = (n: number) => String(n).padStart(2, "0");
  const d = match.startTime;

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Edit match</h1>
      <MatchForm
        initial={{
          id: match.id,
          title: match.title,
          matchDate: match.matchDate.toISOString().slice(0, 10),
          startTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          venueName: match.venueName,
          venueAddress: match.venueAddress ?? "",
          fee: match.fee ? match.fee.toString() : "",
          maxPlayers: String(match.maxPlayers),
          rsvpDeadline: match.rsvpDeadline.toISOString().slice(0, 16),
        }}
      />
    </div>
  );
}
