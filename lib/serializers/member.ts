import type { AuthContext } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";

type MemberRow = {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dob: Date | null;
  position: string | null;
  jerseyNumber: number | null;
  preferredFoot: string | null;
  status: string;
  phone: string | null;
  emergencyContact: string | null;
  joiningDate: Date;
  user: { email: string };
};

/**
 * Field-level visibility per requester role (SRS §29) — enforced here, at the
 * API boundary, not left to the frontend to selectively hide.
 */
export function serializeMember(member: MemberRow, viewer: AuthContext, financeSectorId: string | null) {
  const isSelf = viewer.memberId === member.id;
  const isPrivileged =
    can.isAdmin(viewer) || (financeSectorId ? can.isPresidentOfSector(viewer, financeSectorId) : false);
  const canSeeRestricted = isSelf || isPrivileged;

  return {
    id: member.id,
    fullName: member.fullName,
    profilePhotoUrl: member.profilePhotoUrl,
    position: member.position,
    jerseyNumber: member.jerseyNumber,
    preferredFoot: member.preferredFoot,
    status: member.status,
    joiningDate: member.joiningDate,
    // Birthday is day/month only for anyone but self/admin (SRS §14) — the
    // year is never exposed here even to Finance, only full DOB to self/admin.
    birthday: member.dob ? { day: member.dob.getUTCDate(), month: member.dob.getUTCMonth() + 1 } : null,
    ...(canSeeRestricted && {
      email: member.user.email,
      phone: member.phone,
      dob: member.dob,
      emergencyContact: isSelf || can.isAdmin(viewer) ? member.emergencyContact : undefined,
    }),
  };
}
