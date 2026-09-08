import { getCurrentUser } from "@/lib/auth/context";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Welcome, {user?.fullName}</h1>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Your roles: {user?.roles.length ? user.roles.map((r) => r.role).join(", ") : "Member"}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Matches, finance, and community modules are coming together next — this dashboard will surface your next
        match, payment status, and recent activity here.
      </p>
    </div>
  );
}
