"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Completeness = {
  complete: boolean;
  missingLabels: string[];
  completedCount: number;
  totalRequired: number;
};

type Fields = Record<string, string>;

/** Grouped the way the club's original registration form was laid out. */
const SECTIONS: { title: string; note?: string; fields: { key: string; label: string; type?: string; required?: boolean }[] }[] = [
  {
    title: "Identity",
    fields: [
      { key: "fullName", label: "Full name", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      { key: "bloodGroup", label: "Blood group", required: true },
      { key: "nidNumber", label: "NID number", required: true },
    ],
  },
  {
    title: "Family",
    fields: [
      { key: "fathersName", label: "Father's name", required: true },
      { key: "mothersName", label: "Mother's name", required: true },
      { key: "spouseName", label: "Spouse's name (if any)" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "phone", label: "Phone number", type: "tel", required: true },
      { key: "address", label: "Address", required: true },
    ],
  },
  {
    title: "Emergency contact",
    note: "Visible only to admins.",
    fields: [
      { key: "emergencyContactName", label: "Contact name", required: true },
      { key: "emergencyContactPhone", label: "Contact phone", type: "tel", required: true },
    ],
  },
  {
    title: "Work & study",
    fields: [
      { key: "occupation", label: "Occupation", required: true },
      { key: "workplace", label: "Workplace (if any)" },
      { key: "educationalInstitution", label: "Educational institution (if any)" },
    ],
  },
  {
    title: "Football",
    fields: [
      { key: "position", label: "Preferred position", required: true },
      { key: "jerseyNumber", label: "Jersey number", type: "number" },
      { key: "interests", label: "Interests outside football" },
    ],
  },
];

export function RegistrationForm() {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({});
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ member: Record<string, unknown>; completeness: Completeness; verified: boolean }>(
      "/api/v1/members/me/registration",
    ).then((data) => {
      const seed: Fields = {};
      for (const section of SECTIONS) {
        for (const field of section.fields) {
          const value = data.member[field.key];
          if (value === null || value === undefined) continue;
          seed[field.key] = field.type === "date" ? String(value).slice(0, 10) : String(value);
        }
      }
      setFields(seed);
      setCompleteness(data.completeness);
      setVerified(data.verified);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const section of SECTIONS) {
        for (const field of section.fields) {
          const raw = fields[field.key]?.trim() ?? "";
          if (field.type === "number") {
            payload[field.key] = raw === "" ? null : Number(raw);
          } else {
            payload[field.key] = raw === "" ? null : raw;
          }
        }
      }

      const result = await apiFetch<{ completeness: Completeness; verified: boolean }>(
        "/api/v1/members/me/registration",
        { method: "PATCH", body: JSON.stringify(payload) },
      );
      setCompleteness(result.completeness);
      setVerified(result.verified);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const progress = completeness
    ? Math.round((completeness.completedCount / completeness.totalRequired) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card accent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{verified ? "Fully verified" : "Registration incomplete"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {completeness
                ? `${completeness.completedCount} of ${completeness.totalRequired} required details on file`
                : "Loading…"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              verified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {progress}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {completeness && !completeness.complete && (
          <p className="mt-2 text-xs text-muted-foreground">
            Still needed: {completeness.missingLabels.join(", ")}
          </p>
        )}
      </Card>

      <form onSubmit={save} className="flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <p className="text-sm font-medium">{section.title}</p>
            {section.note && <p className="mt-0.5 text-xs text-muted-foreground">{section.note}</p>}
            <div className="mt-3 flex flex-col gap-3">
              {section.fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    {field.label}
                    {field.required && <span className="ml-1 text-primary">*</span>}
                  </span>
                  <Input
                    type={field.type ?? "text"}
                    value={fields[field.key] ?? ""}
                    onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}

        {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {saved && !verified && <p className="text-sm text-success">Saved — fill the remaining fields to finish verifying.</p>}
        {saved && verified && <p className="text-sm text-success">Saved. Your registration is complete.</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save details"}
        </Button>
      </form>
    </div>
  );
}
