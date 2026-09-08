"use client";

import { createContext, useContext } from "react";
import type { RoleName } from "@/app/generated/prisma/enums";

export type ClientUser = {
  memberId: string;
  fullName: string;
  roles: { role: RoleName; sectorId: string | null }[];
};

const CurrentUserContext = createContext<ClientUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: ClientUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): ClientUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}

export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  return user.roles.some((r) => r.role === "admin");
}
