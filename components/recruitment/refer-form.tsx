"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

export function ReferForm() {
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/recruitment/applications", {
        method: "POST",
        body: JSON.stringify({ fullName, contactInfo, notes: notes || undefined }),
      });
      setDone(true);
      setFullName("");
      setContactInfo("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <p className="mb-2 text-sm font-medium">Refer a prospective member</p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input placeholder="Phone or email" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} required />
        <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {done && <p className="text-sm text-success">Submitted — the Recruitment President will review it.</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit"}
        </Button>
      </form>
    </Card>
  );
}
