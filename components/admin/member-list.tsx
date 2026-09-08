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

export function MemberList() {
  const [q, setQ] = useState("");
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

  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Link key={m.id} href={`/admin/members/${m.id}`}>
              <Card className="flex items-center justify-between active:bg-muted">
                <div>
                  <p className="font-medium">{m.fullName}</p>
                  <p className="text-sm text-muted-foreground">{m.email ?? m.position ?? ""}</p>
                </div>
                <StatusBadge status={m.status} />
              </Card>
            </Link>
          ))}
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
