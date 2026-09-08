import { cache } from "react";
import { prisma } from "@/lib/db/client";

export const WELL_KNOWN_SECTORS = {
  FINANCE: "Finance",
  TOURNAMENT: "Tournament",
  CLUB_TEAM: "Club Team",
  RECRUITMENT: "Recruitment",
  COMMUNICATIONS: "Communications",
} as const;

/**
 * Sectors are admin-managed data, not an enum (SRS §22.1) — this resolves a
 * well-known name to its current id. Cached per request: permission checks hit
 * this on nearly every page, and the sector list barely ever changes.
 */
export const getSectorIdByName = cache(async function getSectorIdByName(name: string): Promise<string | null> {
  const sector = await prisma.sector.findUnique({ where: { name } });
  return sector?.id ?? null;
});
