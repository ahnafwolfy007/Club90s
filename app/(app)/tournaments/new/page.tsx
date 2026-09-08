import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { TournamentForm } from "@/components/tournaments/tournament-form";

export default async function NewTournamentPage() {
  const ctx = await getCurrentUser();
  const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
  if (!ctx || !tournamentSectorId || !can.manageTournament(ctx, tournamentSectorId)) redirect("/tournaments");

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">New tournament</h1>
      <TournamentForm />
    </div>
  );
}
