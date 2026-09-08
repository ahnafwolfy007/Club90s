import type { AuthContext } from "@/lib/auth/context";

function hasRole(ctx: AuthContext, role: "admin" | "advisor" | "president" | "member", sectorId?: string): boolean {
  return ctx.roles.some((r) => r.role === role && (sectorId === undefined || r.sectorId === sectorId));
}

function isActive(ctx: AuthContext): boolean {
  return ctx.memberStatus === "active";
}

export const can = {
  isAdmin: (ctx: AuthContext) => hasRole(ctx, "admin"),
  isAdvisor: (ctx: AuthContext) => hasRole(ctx, "advisor"),
  isPresidentOfSector: (ctx: AuthContext, sectorId: string) => hasRole(ctx, "president", sectorId),
  isActiveMember: isActive,

  /** Admin, or a president scoped to the given sector. The one place "which sector" is checked (SRS Business Rule 11). */
  managesSector: (ctx: AuthContext, sectorId: string) => can.isAdmin(ctx) || can.isPresidentOfSector(ctx, sectorId),

  rsvpToMatch: (ctx: AuthContext) => isActive(ctx),
  manageMatches: (ctx: AuthContext, clubTeamSectorId: string) => can.managesSector(ctx, clubTeamSectorId),

  viewOwnFinance: () => true,
  viewMemberFinance: (ctx: AuthContext, financeSectorId: string, targetMemberId: string) =>
    ctx.memberId === targetMemberId || can.managesSector(ctx, financeSectorId),
  recordTransaction: (ctx: AuthContext, financeSectorId: string) => can.managesSector(ctx, financeSectorId),
  voidTransaction: (ctx: AuthContext, financeSectorId: string) => can.managesSector(ctx, financeSectorId),

  manageTournament: (ctx: AuthContext, tournamentSectorId: string) => can.managesSector(ctx, tournamentSectorId),

  postToFeed: (ctx: AuthContext) => isActive(ctx),
  moderateFeed: (ctx: AuthContext) => can.isAdmin(ctx),
  editOwnPost: (ctx: AuthContext, authorMemberId: string) => ctx.memberId === authorMemberId,

  createElection: (ctx: AuthContext) => can.isAdmin(ctx),
  confirmElectionResult: (ctx: AuthContext) => can.isAdmin(ctx),

  assignRole: (ctx: AuthContext) => can.isAdmin(ctx),
  manageSectors: (ctx: AuthContext) => can.isAdmin(ctx),
  runImport: (ctx: AuthContext) => can.isAdmin(ctx),
  viewAuditLogs: (ctx: AuthContext) => can.isAdmin(ctx),
  changeClubSettings: (ctx: AuthContext) => can.isAdmin(ctx),
};
