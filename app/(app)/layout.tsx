import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";
import { CurrentUserProvider } from "@/lib/auth/current-user-context";
import { AppHeader } from "@/components/nav/app-header";
import { BottomNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Defense in depth: proxy.ts already redirects unauthenticated requests,
  // but it only checks cookie presence, not validity (SRS §7.3).
  if (!user) redirect("/login");

  return (
    <CurrentUserProvider
      user={{ memberId: user.memberId, fullName: user.fullName, roles: user.roles }}
    >
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex-1 pb-4">{children}</main>
        <BottomNav />
      </div>
    </CurrentUserProvider>
  );
}
