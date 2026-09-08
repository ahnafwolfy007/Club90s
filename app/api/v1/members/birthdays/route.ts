import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { Errors, handleApiError } from "@/lib/api/errors";

function dayOfYearDistance(month: number, day: number, from: Date): number {
  const year = from.getFullYear();
  let next = new Date(Date.UTC(year, month - 1, day));
  const fromMidnight = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  if (next < fromMidnight) next = new Date(Date.UTC(year + 1, month - 1, day));
  return Math.round((next.getTime() - fromMidnight.getTime()) / 86400000);
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();

    const members = await prisma.member.findMany({
      where: { status: "active", dob: { not: null } },
      select: { id: true, fullName: true, dob: true },
    });

    const now = new Date();
    // Day/month only — never expose birth year to other members (SRS §14).
    const withDistance = members.map((m) => {
      const dob = m.dob!;
      const month = dob.getUTCMonth() + 1;
      const day = dob.getUTCDate();
      return { id: m.id, fullName: m.fullName, month, day, daysAway: dayOfYearDistance(month, day, now) };
    });

    withDistance.sort((a, b) => a.daysAway - b.daysAway);

    return NextResponse.json({
      today: withDistance.filter((m) => m.daysAway === 0),
      upcoming: withDistance.filter((m) => m.daysAway > 0 && m.daysAway <= 30),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
