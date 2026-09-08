"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";
import type { RoleName } from "@/app/generated/prisma/enums";

type RoleAssignmentRow = { id: string; role: RoleName; sectorName: string | null };
type MemberDetailData = {
  id: string;
  fullName: string;
  email: string;
  userStatus: string;
  memberStatus: string;
  roleAssignments: RoleAssignmentRow[];
};

const ROLE_OPTIONS: RoleName[] = ["member", "president", "admin", "advisor"];

export function MemberDetail({ member, sectors }: { member: MemberDetailData; sectors: { id: string; name: string }[] }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleName>("president");
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function assignRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/admin/roles/assign", {
        method: "POST",
        body: JSON.stringify({
          memberId: member.id,
          role,
          sectorId: role === "president" ? sectorId : null,
          currentPassword: password,
        }),
      });
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function removeRole(assignmentId: string) {
    const currentPassword = prompt("Re-enter your password to confirm removing this role:");
    if (!currentPassword) return;
    try {
      await apiFetch(`/api/v1/admin/roles/${assignmentId}/remove`, {
        method: "POST",
        body: JSON.stringify({ currentPassword }),
      });
      router.refresh();
    } catch (err) {
      alert(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  async function resendActivation() {
    setLoading(true);
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/resend-activation`, { method: "POST" });
      setResent(true);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{member.fullName}</h1>
        <p className="text-sm text-muted-foreground">{member.email}</p>
      </div>

      <Card>
        <p className="text-sm font-medium">Account status: {member.userStatus}</p>
        {member.userStatus === "unactivated" && (
          <Button variant="secondary" className="mt-2" onClick={resendActivation} disabled={loading}>
            {resent ? "Sent" : "Resend activation email"}
          </Button>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Current roles</p>
        {member.roleAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Just a Member.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {member.roleAssignments.map((ra) => (
              <li key={ra.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {ra.role}
                  {ra.sectorName ? ` — ${ra.sectorName}` : ""}
                </span>
                <button onClick={() => removeRole(ra.id)} className="text-sm text-danger">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium">Assign a role</p>
        <form onSubmit={assignRole} className="flex flex-col gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleName)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {role === "president" && (
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
            >
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <Input
            type="password"
            placeholder="Your password (to confirm)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Assigning…" : "Assign role"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
