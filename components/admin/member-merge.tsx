"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type MemberOption = { id: string; fullName: string; email?: string };

export function MemberMerge({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [target, setTarget] = useState<MemberOption | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !q || target) return;
    const timeout = setTimeout(() => {
      apiFetch<{ members: MemberOption[] }>(`/api/v1/members?q=${encodeURIComponent(q)}`)
        .then((d) => setOptions(d.members.filter((m) => m.id !== memberId)))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, open, target, memberId]);

  async function merge(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/api/v1/admin/members/${memberId}/merge`, {
        method: "POST",
        body: JSON.stringify({ targetMemberId: target.id, currentPassword: password }),
      });
      router.push("/admin/members");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="self-start text-sm text-muted-foreground hover:text-primary">
        Merge this record into another member →
      </button>
    );
  }

  return (
    <Card>
      <p className="text-sm font-medium">Merge &ldquo;{memberName}&rdquo; into another member</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        All of this record&rsquo;s payment history moves to the member you pick, then this record is deleted. Use this
        when the finance sheet listed someone under a different spelling. This can&rsquo;t be undone.
      </p>

      <form onSubmit={merge} className="mt-3 flex flex-col gap-3">
        {target ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
            <span>
              Keep: <span className="font-medium text-primary-light">{target.fullName}</span>
            </span>
            <button type="button" onClick={() => setTarget(null)} className="text-sm text-primary">
              Change
            </button>
          </div>
        ) : (
          <>
            <Input placeholder="Search the member to keep…" value={q} onChange={(e) => setQ(e.target.value)} />
            {options.length > 0 && (
              <div className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-border">
                {options.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => {
                      setTarget(o);
                      setQ("");
                      setOptions([]);
                    }}
                    className="border-b border-border bg-surface px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                  >
                    {o.fullName}
                    {o.email && <span className="ml-2 text-xs text-muted-foreground">{o.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {target && (
          <Input
            type="password"
            placeholder="Your password (to confirm)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="danger" disabled={loading || !target || !password}>
            {loading ? "Merging…" : "Merge and delete this record"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
