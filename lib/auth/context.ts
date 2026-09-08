import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { SESSION_COOKIE, validateSessionToken } from "@/lib/auth/session";
import type { RoleName, MemberStatus, UserStatus } from "@/app/generated/prisma/enums";

export type AuthContext = {
  userId: string;
  email: string;
  userStatus: UserStatus;
  memberId: string;
  fullName: string;
  memberStatus: MemberStatus;
  roles: { role: RoleName; sectorId: string | null }[];
};

async function loadAuthContext(userId: string): Promise<AuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      member: {
        include: {
          roleAssignments: {
            where: { status: "active" },
            include: { role: true },
          },
        },
      },
    },
  });
  if (!user || !user.member) return null;

  return {
    userId: user.id,
    email: user.email,
    userStatus: user.status,
    memberId: user.member.id,
    fullName: user.member.fullName,
    memberStatus: user.member.status,
    roles: user.member.roleAssignments.map((ra) => ({ role: ra.role.name, sectorId: ra.sectorId })),
  };
}

/** For Server Components, layouts, and Server Actions (reads the cookie via next/headers). */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await validateSessionToken(token);
  if (!userId) return null;
  return loadAuthContext(userId);
}

/** For Route Handlers, which receive the request's cookies synchronously. */
export async function getCurrentUserFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await validateSessionToken(token);
  if (!userId) return null;
  return loadAuthContext(userId);
}
