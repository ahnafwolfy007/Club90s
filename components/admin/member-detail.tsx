"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";
import { MemberMerge } from "@/components/admin/member-merge";
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

const PLACEHOLDER_EMAIL_SUFFIX = "@club90s.local";

export function MemberDetail({ member, sectors }: { member: MemberDetailData; sectors: { id: string; name: string }[] }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleName>("president");
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(member.email);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const isPlaceholderEmail = member.email.endsWith(PLACEHOLDER_EMAIL_SUFFIX);

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSaving(true);
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email: emailDraft }),
      });
      setEditingEmail(false);
      router.refresh();
    } catch (err) {
      setEmailError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setEmailSaving(false);
    }
  }

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

  /** Sends an activation link for a never-logged-in account, a reset link otherwise. */
  async function sendCredentialLink() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/send-password-reset`, { method: "POST" });
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

        {editingEmail ? (
          <form onSubmit={saveEmail} className="mt-1.5 flex flex-col gap-2">
            <Input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              autoFocus
              required
            />
            {emailError && (
              <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{emailError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" disabled={emailSaving}>
                {emailSaving ? "Saving…" : "Save email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingEmail(false);
                  setEmailDraft(member.email);
                  setEmailError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{member.email}</p>
            <button onClick={() => setEditingEmail(true)} className="text-sm font-medium text-primary hover:text-primary-light">
              Edit
            </button>
            {isPlaceholderEmail && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">no real email</span>
            )}
          </div>
        )}
      </div>

      <Card>
        <p className="text-sm font-medium">Account status: {member.userStatus}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isPlaceholderEmail
            ? "This member has no real email on file — edit it above before sending a link, or it'll go nowhere."
            : member.userStatus === "unactivated"
              ? "Hasn't set a password yet — send them an activation link."
              : "Sending a reset link doesn't disable their current password until they use it."}
        </p>
        <Button variant="secondary" className="mt-2" onClick={sendCredentialLink} disabled={loading || isPlaceholderEmail}>
          {resent ? "Sent ✓" : member.userStatus === "unactivated" ? "Send activation link" : "Send password reset link"}
        </Button>
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

      <MemberMerge memberId={member.id} memberName={member.fullName} />
    </div>
  );
}
