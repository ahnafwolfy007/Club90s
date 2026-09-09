"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";

type MemberSummary = {
  id: string;
  fullName: string;
  status: string;
  position: string | null;
  email?: string;
};

const PLACEHOLDER_EMAIL_SUFFIX = "@club90s.local";

export function MemberList() {
  const [q, setQ] = useState("");
  const [onlyMissingEmail, setOnlyMissingEmail] = useState(false);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      apiFetch<{ members: MemberSummary[] }>(`/api/v1/members?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((data) => setMembers(data.members))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [q]);

  const missingEmailCount = members.filter((m) => m.email?.endsWith(PLACEHOLDER_EMAIL_SUFFIX)).length;
  const visible = onlyMissingEmail ? members.filter((m) => m.email?.endsWith(PLACEHOLDER_EMAIL_SUFFIX)) : members;

  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {missingEmailCount > 0 && (
        <button
          onClick={() => setOnlyMissingEmail((v) => !v)}
          className={`self-start rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            onlyMissingEmail ? "bg-warning text-background" : "border border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          {onlyMissingEmail ? "Showing" : ""} {missingEmailCount} without a real email {onlyMissingEmail ? "· tap to clear" : ""}
        </button>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((m) => {
            const missingEmail = m.email?.endsWith(PLACEHOLDER_EMAIL_SUFFIX);
            return (
              <Link key={m.id} href={`/admin/members/${m.id}`}>
                <Card className="flex items-center justify-between active:bg-muted">
                  <div>
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {missingEmail ? "No real email on file" : (m.email ?? m.position ?? "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {missingEmail && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">fix email</span>}
                    <StatusBadge status={m.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/15 text-success",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-warning/15 text-warning",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>{status}</span>
  );
}
