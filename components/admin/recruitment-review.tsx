"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Application = {
  id: string;
  fullName: string;
  contactInfo: string;
  status: string;
  notes: string | null;
  submittedBy: { fullName: string } | null;
};

export function RecruitmentReview() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<{ applications: Application[] }>("/api/v1/recruitment/applications").then((d) => setApplications(d.applications));
  }
  useEffect(load, []);

  async function approve(id: string) {
    const email = prompt("Email address to create this member's account with:");
    if (!email) return;
    try {
      await apiFetch(`/api/v1/recruitment/applications/${id}/approve`, { method: "POST", body: JSON.stringify({ email }) });
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  async function reject(id: string) {
    const notes = prompt("Reason (optional):") ?? undefined;
    try {
      await apiFetch(`/api/v1/recruitment/applications/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) });
      load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  if (!applications) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      ) : (
        applications.map((a) => (
          <Card key={a.id}>
            <p className="font-medium">{a.fullName}</p>
            <p className="text-sm text-muted-foreground">{a.contactInfo}</p>
            {a.submittedBy && <p className="text-xs text-muted-foreground">Referred by {a.submittedBy.fullName}</p>}
            <p className="mt-1 text-sm">
              Status: <span className="font-medium">{a.status}</span>
            </p>
            {(a.status === "submitted" || a.status === "in_review") && (
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={() => approve(a.id)}>
                  Approve
                </Button>
                <Button variant="danger" onClick={() => reject(a.id)}>
                  Reject
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
