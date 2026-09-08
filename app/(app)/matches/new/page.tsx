import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { MatchForm } from "@/components/matches/match-form";

export default async function NewMatchPage() {
  const ctx = await getCurrentUser();
  const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
  if (!ctx || !clubTeamSectorId || !can.manageMatches(ctx, clubTeamSectorId)) redirect("/matches");

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">New match</h1>
      <MatchForm />
    </div>
  );
}
