import { describe, it, expect } from "vitest";
import { can } from "./can";
import type { AuthContext } from "@/lib/auth/context";

const FINANCE_SECTOR = "sector-finance";
const TOURNAMENT_SECTOR = "sector-tournament";

function ctx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: "user-1",
    email: "member@club90s.local",
    userStatus: "active",
    memberId: "member-1",
    fullName: "Test Member",
    memberStatus: "active",
    roles: [],
    ...overrides,
  };
}

describe("can — permission matrix (SRS §7.2)", () => {
  it("a plain member has no admin, president, or finance capability", () => {
    const member = ctx();
    expect(can.isAdmin(member)).toBe(false);
    expect(can.recordTransaction(member, FINANCE_SECTOR)).toBe(false);
    expect(can.assignRole(member)).toBe(false);
    expect(can.manageSectors(member)).toBe(false);
  });

  it("an admin can manage every sector, not just ones they hold a role in", () => {
    const admin = ctx({ roles: [{ role: "admin", sectorId: null }] });
    expect(can.managesSector(admin, FINANCE_SECTOR)).toBe(true);
    expect(can.managesSector(admin, TOURNAMENT_SECTOR)).toBe(true);
    expect(can.recordTransaction(admin, FINANCE_SECTOR)).toBe(true);
  });

  it("a president is scoped to their own sector only (SRS Business Rule 11)", () => {
    const financePresident = ctx({ roles: [{ role: "president", sectorId: FINANCE_SECTOR }] });
    expect(can.managesSector(financePresident, FINANCE_SECTOR)).toBe(true);
    expect(can.managesSector(financePresident, TOURNAMENT_SECTOR)).toBe(false);
    expect(can.manageTournament(financePresident, TOURNAMENT_SECTOR)).toBe(false);
  });

  it("holding president in one sector does not grant admin-only capabilities", () => {
    const financePresident = ctx({ roles: [{ role: "president", sectorId: FINANCE_SECTOR }] });
    expect(can.isAdmin(financePresident)).toBe(false);
    expect(can.assignRole(financePresident)).toBe(false);
    expect(can.createElection(financePresident)).toBe(false);
  });

  it("a member can always view their own finance history but not another member's", () => {
    const member = ctx({ memberId: "member-1" });
    expect(can.viewMemberFinance(member, FINANCE_SECTOR, "member-1")).toBe(true);
    expect(can.viewMemberFinance(member, FINANCE_SECTOR, "member-2")).toBe(false);
  });

  it("the Finance President can view any member's finance history", () => {
    const financePresident = ctx({ roles: [{ role: "president", sectorId: FINANCE_SECTOR }] });
    expect(can.viewMemberFinance(financePresident, FINANCE_SECTOR, "someone-else")).toBe(true);
  });

  it("an inactive member cannot RSVP even though the role check alone would pass", () => {
    const inactive = ctx({ memberStatus: "inactive" });
    expect(can.isActiveMember(inactive)).toBe(false);
  });

  it("only the post's author can edit it via editOwnPost, regardless of role", () => {
    const admin = ctx({ memberId: "admin-1", roles: [{ role: "admin", sectorId: null }] });
    expect(can.editOwnPost(admin, "someone-elses-post-author-id")).toBe(false);
    expect(can.editOwnPost(admin, "admin-1")).toBe(true);
  });
});
