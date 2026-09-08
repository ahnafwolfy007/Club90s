import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { Card } from "@/components/ui/card";

export default async function TournamentsPage() {
  const ctx = await getCurrentUser();
  const tournamentSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.TOURNAMENT);
  const canCreate = ctx && tournamentSectorId && can.manageTournament(ctx, tournamentSectorId);

  const tournaments = await prisma.tournament.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Tournaments</h1>
        {canCreate && (
          <Link href="/tournaments/new" className="text-sm font-medium text-primary">
            + New
          </Link>
        )}
      </div>
      {tournaments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tournaments yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <Card className="active:bg-muted">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.format} · {t.startDate.toLocaleDateString()} · {t.status}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
