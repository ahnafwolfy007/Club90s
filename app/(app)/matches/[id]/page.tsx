import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName, WELL_KNOWN_SECTORS } from "@/lib/db/sectors";
import { RsvpButtons } from "@/components/matches/rsvp-buttons";
import { Card } from "@/components/ui/card";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) notFound();

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      organizer: { select: { fullName: true } },
      rsvps: { include: { member: { select: { id: true, fullName: true } } } },
    },
  });
  if (!match) notFound();

  const clubTeamSectorId = await getSectorIdByName(WELL_KNOWN_SECTORS.CLUB_TEAM);
  const isManager = clubTeamSectorId ? can.manageMatches(ctx, clubTeamSectorId) : false;

  const confirmed = match.rsvps.filter((r) => r.response === "in" && !r.waitlisted);
  const waitlisted = match.rsvps.filter((r) => r.response === "in" && r.waitlisted);
  const maybe = match.rsvps.filter((r) => r.response === "maybe");
  const out = match.rsvps.filter((r) => r.response === "out");
  const myRsvp = match.rsvps.find((r) => r.memberId === ctx.memberId);
  const deadlinePassed = new Date() > match.rsvpDeadline;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="text-lg font-semibold">{match.title}</h1>
        <p className="text-sm text-muted-foreground">
          {match.matchDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {" · "}
          {match.venueName}
        </p>
        {match.venueAddress && <p className="text-sm text-muted-foreground">{match.venueAddress}</p>}
        {match.fee && <p className="text-sm text-muted-foreground">Fee: {match.fee.toString()}</p>}
      </div>

      <RsvpButtons
        matchId={match.id}
        currentResponse={myRsvp?.response ?? null}
        disabled={deadlinePassed || match.status !== "published"}
      />
      {deadlinePassed && <p className="text-sm text-muted-foreground">RSVP deadline has passed.</p>}
      {myRsvp?.response === "in" && myRsvp.waitlisted && (
        <p className="text-sm text-warning">You&rsquo;re on the waitlist — you&rsquo;ll be notified if a spot opens up.</p>
      )}

      <Card>
        <p className="mb-2 text-sm font-medium">
          Confirmed {confirmed.length}/{match.maxPlayers}
        </p>
        <NameList names={confirmed.map((r) => r.member.fullName)} empty="No one confirmed yet." />
        {waitlisted.length > 0 && (
          <>
            <p className="mb-2 mt-3 text-sm font-medium">Waitlist ({waitlisted.length})</p>
            <NameList names={waitlisted.map((r) => r.member.fullName)} empty="" />
          </>
        )}
      </Card>

      {isManager && (
        <Card>
          <p className="mb-2 text-sm font-medium">Organizer view</p>
          <p className="text-sm text-muted-foreground">
            Maybe: {maybe.length} · Out: {out.length} · No response tracked separately from the club roster.
          </p>
          <div className="mt-3 flex gap-4">
            <Link href={`/matches/${match.id}/teams`} className="text-sm font-medium text-primary">
              Form teams
            </Link>
            <Link href={`/matches/${match.id}/edit`} className="text-sm font-medium text-primary">
              Edit match
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function NameList({ names, empty }: { names: string[]; empty: string }) {
  if (names.length === 0) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return <p className="text-sm text-muted-foreground">{names.join(", ")}</p>;
}
