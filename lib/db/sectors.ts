import { prisma } from "@/lib/db/client";

export const WELL_KNOWN_SECTORS = {
  FINANCE: "Finance",
  TOURNAMENT: "Tournament",
  CLUB_TEAM: "Club Team",
  RECRUITMENT: "Recruitment",
  COMMUNICATIONS: "Communications",
} as const;

/** Sectors are admin-managed data, not an enum (SRS §22.1) — this just resolves a well-known name to its current id. */
export async function getSectorIdByName(name: string): Promise<string | null> {
  const sector = await prisma.sector.findUnique({ where: { name } });
  return sector?.id ?? null;
}
