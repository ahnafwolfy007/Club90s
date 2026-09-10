import type { AuthContext } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { getSectorIdByName } from "@/lib/db/sectors";
import { DIVISION } from "@/lib/rulebook";

/**
 * §7.2.1 — "Infractions will be reviewed by Division 6 and the Advisory Board."
 *
 * Admins are included because they hold the system-level equivalent, and
 * because the club needs someone able to act when a Division 6 seat is vacant
 * (§3.4.5 allows a week to fill one).
 */
export async function canDiscipline(ctx: AuthContext): Promise<boolean> {
  if (can.isAdmin(ctx) || can.isAdvisor(ctx)) return true;

  const divisionSixId = await getSectorIdByName(DIVISION.TOURNAMENT);
  return divisionSixId ? can.isPresidentOfSector(ctx, divisionSixId) : false;
}
