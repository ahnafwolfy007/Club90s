import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/context";
import { getMemberFeeStatus } from "@/lib/finance/fee-status";
import { Card, CardLabel, CardValue } from "@/components/ui/card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FEE_STATUS_STYLES: Record<string, string> = {
  paid: "text-success",
  overpaid: "text-success",
  partial: "text-warning",
  unpaid: "text-danger",
};

export default async function DashboardPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [nextMatch, feeStatus, announcements, birthdayMembers] = await Promise.all([
    prisma.match.findFirst({
      where: { status: "published", matchDate: { gte: today } },
      orderBy: { matchDate: "asc" },
      include: {
        rsvps: { where: { memberId: ctx.memberId } },
        _count: { select: { rsvps: { where: { response: "in", waitlisted: false } } } },
      },
    }),
    getMemberFeeStatus(ctx.memberId, currentMonth),
    prisma.announcement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { author: { select: { fullName: true } } },
    }),
    prisma.member.findMany({
      where: { status: "active", dob: { not: null } },
      select: { id: true, fullName: true, dob: true },
    }),
  ]);

  const myRsvp = nextMatch?.rsvps[0];
  const upcomingBirthdays = birthdayMembers
    .map((m) => {
      const dob = m.dob!;
      return { id: m.id, fullName: m.fullName, month: dob.getUTCMonth() + 1, day: dob.getUTCDate() };
    })
    .map((m) => ({ ...m, daysAway: daysUntil(m.month, m.day, now) }))
    .filter((m) => m.daysAway <= 14)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 3);

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Welcome back</p>
        <h1 className="gold-gradient font-display text-2xl font-semibold tracking-wide">{ctx.fullName}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card accent>
          <CardLabel>Dues this month</CardLabel>
          <CardValue className={FEE_STATUS_STYLES[feeStatus.status]}>
            {feeStatus.status === "paid" || feeStatus.status === "overpaid" ? "Paid" : feeStatus.status}
          </CardValue>
          <p className="tabular mt-0.5 text-xs text-muted-foreground">
            {feeStatus.amountPaid.toLocaleString()} / {feeStatus.amountDue.toLocaleString()}
          </p>
        </Card>
        <Card accent>
          <CardLabel>Your roles</CardLabel>
          <CardValue className="text-base">
            {ctx.roles.length > 0 ? ctx.roles.map((r) => r.role).join(", ") : "Member"}
          </CardValue>
        </Card>
      </div>

      <Card accent>
        <CardLabel>Next match</CardLabel>
        {nextMatch ? (
          <Link href={`/matches/${nextMatch.id}`} className="mt-1 block">
            <p className="font-medium">{nextMatch.title}</p>
            <p className="text-sm text-muted-foreground">
              {nextMatch.matchDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {" · "}
              {nextMatch.venueName}
              {" · "}
              <span className="tabular">
                {nextMatch._count.rsvps}/{nextMatch.maxPlayers} in
              </span>
            </p>
            <p className="mt-1.5 text-sm">
              {myRsvp ? (
                <span className={myRsvp.response === "in" ? "text-success" : "text-muted-foreground"}>
                  You&rsquo;re {myRsvp.response === "in" ? (myRsvp.waitlisted ? "on the waitlist" : "in") : myRsvp.response}
                </span>
              ) : (
                <span className="font-medium text-primary">Tap to RSVP →</span>
              )}
            </p>
          </Link>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No matches scheduled yet.</p>
        )}
      </Card>

      {upcomingBirthdays.length > 0 && (
        <Card accent>
          <CardLabel>Birthdays</CardLabel>
          <div className="mt-1.5 flex flex-col gap-1">
            {upcomingBirthdays.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>{b.fullName}</span>
                <span className="text-muted-foreground">
                  {b.daysAway === 0 ? "Today 🎂" : `${MONTHS[b.month - 1]} ${b.day}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {announcements.length > 0 && (
        <div>
          <p className="mb-2 font-display text-xs uppercase tracking-[0.12em] text-primary-dim">Announcements</p>
          <div className="flex flex-col gap-2">
            {announcements.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] text-primary">{a.type}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function daysUntil(month: number, day: number, from: Date): number {
  const fromMidnight = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  let next = Date.UTC(from.getUTCFullYear(), month - 1, day);
  if (next < fromMidnight) next = Date.UTC(from.getUTCFullYear() + 1, month - 1, day);
  return Math.round((next - fromMidnight) / 86400000);
}
