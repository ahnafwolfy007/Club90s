"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Summary = { total: number; sent: number; failed: number; activations: number; resets: number };

export function PasswordResetBroadcast() {
  const [open, setOpen] = useState(false);
  const [onlyUnactivated, setOnlyUnactivated] = useState(true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ summary: Summary }>("/api/v1/admin/password-resets/broadcast", {
        method: "POST",
        body: JSON.stringify({ currentPassword: password, onlyUnactivated }),
      });
      setSummary(res.summary);
      setPassword("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="self-start text-sm font-medium text-primary">
        Email everyone a login link →
      </button>
    );
  }

  return (
    <Card accent>
      <p className="text-sm font-medium">Email members a set-password link</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Members who&rsquo;ve never logged in get an activation link; everyone else gets a password reset. Existing
        passwords keep working until each person uses their link.
      </p>

      <form onSubmit={send} className="mt-3 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUnactivated} onChange={(e) => setOnlyUnactivated(e.target.checked)} />
          Only members who haven&rsquo;t activated yet
        </label>
        <Input
          type="password"
          placeholder="Your password (to confirm)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {summary && (
          <p className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
            Sent {summary.sent} of {summary.total} ({summary.activations} activation, {summary.resets} reset)
            {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading || !password}>
            {loading ? "Sending…" : "Send emails"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
