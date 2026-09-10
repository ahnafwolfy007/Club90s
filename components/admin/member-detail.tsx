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
  membershipClass: "senior" | "junior";
  squadType: "core" | "general";
  isFoundingMember: boolean;
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

  const [classSaving, setClassSaving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeMode, setRemoveMode] = useState<"deactivate" | "delete">("deactivate");
  const [confirmName, setConfirmName] = useState("");
  const [removePassword, setRemovePassword] = useState("");
  const [removeReason, setRemoveReason] = useState("");

  /** §2.1 / §6.1 / §3.2 — every other rule keys off these. */
  async function saveClassification(patch: Record<string, unknown>) {
    setError(null);
    setClassSaving(true);
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/classification`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setClassSaving(false);
    }
  }

  async function removeAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/api/v1/admin/members/${member.id}/remove`, {
        method: "POST",
        body: JSON.stringify({
          mode: removeMode,
          currentPassword: removePassword,
          confirmName,
          reason: removeReason || undefined,
        }),
      });
      router.push("/admin/members");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

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

      {/* §2.1 / §6.1 / §3.2 — classification drives dues, deadlines and jersey priority */}
      <Card accent>
        <p className="text-sm font-medium">Classification</p>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
          Sets what this member owes and when they can vote.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Membership (§2.1)</p>
            <div className="flex gap-2">
              {(["senior", "junior"] as const).map((value) => (
                <button
                  key={value}
                  disabled={classSaving}
                  onClick={() => saveClassification({ membershipClass: value })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    member.membershipClass === value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border-gold bg-muted text-muted-foreground hover:text-primary-light"
                  }`}
                >
                  {value === "senior" ? "Senior" : "Junior"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {member.membershipClass === "junior"
                ? "Exempt from monthly dues (§2.1.2). Poll closes Tuesday evening (§5.2.2)."
                : "Owes 200 BDT monthly (§2.2.1). Poll closes Wednesday evening (§5.2.3)."}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Squad (§6.1)</p>
            <div className="flex gap-2">
              {(["core", "general"] as const).map((value) => (
                <button
                  key={value}
                  disabled={classSaving}
                  onClick={() => saveClassification({ squadType: value })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    member.squadType === value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border-gold bg-muted text-muted-foreground hover:text-primary-light"
                  }`}
                >
                  {value === "core" ? "Competitive Core" : "General Pool"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {member.squadType === "core"
                ? "Priority on jersey numbers (§6.2.1); represents the club in tournaments."
                : "Internal sessions and friendlies; may share a Core member's number (§6.2.2)."}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={member.isFoundingMember}
              disabled={classSaving}
              onChange={(e) => saveClassification({ isFoundingMember: e.target.checked })}
            />
            Founding Member — lifetime honorary status (§3.2)
          </label>
        </div>
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

      {/* Removal — deactivation is the safe default; deletion is guarded */}
      <Card className="border-danger/25">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-danger">Remove from club</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Deactivating keeps every record and can be undone. Deleting is permanent.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setRemoveOpen((v) => !v)}>
            {removeOpen ? "Cancel" : "Remove"}
          </Button>
        </div>

        {removeOpen && (
          <form onSubmit={removeAccount} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex gap-2">
              {(["deactivate", "delete"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRemoveMode(mode)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    removeMode === mode
                      ? mode === "delete"
                        ? "bg-danger text-danger-foreground"
                        : "bg-primary text-primary-foreground"
                      : "border border-border-gold bg-muted text-muted-foreground"
                  }`}
                >
                  {mode === "deactivate" ? "Deactivate" : "Delete permanently"}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {removeMode === "deactivate"
                ? "Suspends their login, ends any active session and suspends their roles. Their history, payments and posts stay exactly as they are."
                : "Erases the account entirely. Refused if they have any payment history, since deleting them would detach those rows from the ledger — deactivate instead."}
            </p>

            <Input
              placeholder={`Type "${member.fullName}" to confirm`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              required
            />
            <Input placeholder="Reason (optional)" value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
            <Input
              type="password"
              placeholder="Your password (to confirm)"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
              required
            />
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? "Working…" : removeMode === "deactivate" ? "Deactivate account" : "Delete permanently"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
