"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ImportRowResult = {
  row: number;
  outcome: "imported" | "skipped" | "failed" | "duplicate" | "invalid";
  email?: string;
  reason?: string;
};
type ImportSummary = { imported: number; skipped: number; failed: number; duplicate: number; invalid: number };
type ImportResponse = { dryRun: boolean; batchId: string | null; summary: ImportSummary; results: ImportRowResult[] };

const OUTCOME_STYLES: Record<ImportRowResult["outcome"], string> = {
  imported: "text-success",
  skipped: "text-muted-foreground",
  failed: "text-danger",
  duplicate: "text-warning",
  invalid: "text-danger",
};

export function MemberImport() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);

  async function run(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dryRun", String(dryRun));
      const res = await fetch("/api/v1/admin/import/members", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Import failed.");
        return;
      }
      setReport(data);
      if (!dryRun) setCommitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Upload a .csv or .xlsx with columns: full_name, email, phone, date_of_birth, joining_date, position,
          jersey_number, status.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReport(null);
            setCommitted(false);
          }}
        />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={!file || loading} onClick={() => run(true)}>
            {loading ? "Working…" : "Preview (dry run)"}
          </Button>
          <Button
            disabled={!file || loading || !report || committed}
            onClick={() => run(false)}
          >
            Commit import
          </Button>
        </div>
        {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {committed && <p className="text-sm text-success">Import committed. Activation emails were sent.</p>}
      </Card>

      {report && (
        <Card>
          <p className="mb-2 text-sm font-medium">
            {report.dryRun ? "Preview" : "Result"}: {report.summary.imported} imported, {report.summary.duplicate}{" "}
            duplicate, {report.summary.invalid} invalid, {report.summary.failed} failed, {report.summary.skipped}{" "}
            skipped
          </p>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Row</th>
                  <th className="py-1 pr-2">Email</th>
                  <th className="py-1 pr-2">Outcome</th>
                  <th className="py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r) => (
                  <tr key={r.row} className="border-t border-border">
                    <td className="py-1 pr-2">{r.row}</td>
                    <td className="py-1 pr-2">{r.email ?? "—"}</td>
                    <td className={`py-1 pr-2 font-medium ${OUTCOME_STYLES[r.outcome]}`}>{r.outcome}</td>
                    <td className="py-1 text-muted-foreground">{r.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
