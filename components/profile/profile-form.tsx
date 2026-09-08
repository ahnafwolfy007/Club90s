"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type MemberDetail = {
  id: string;
  fullName: string;
  position: string | null;
  jerseyNumber: number | null;
  preferredFoot: string | null;
  phone: string | null;
  dob: string | null;
  emergencyContact: string | null;
  email: string;
};

export function ProfileForm({ member }: { member: MemberDetail }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(member.fullName);
  const [position, setPosition] = useState(member.position ?? "");
  const [jerseyNumber, setJerseyNumber] = useState(member.jerseyNumber?.toString() ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [dob, setDob] = useState(member.dob ? member.dob.slice(0, 10) : "");
  const [emergencyContact, setEmergencyContact] = useState(member.emergencyContact ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await apiFetch("/api/v1/members/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          position: position || null,
          jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
          phone: phone || null,
          dob: dob || null,
          emergencyContact: emergencyContact || null,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Full name">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </Field>
      <Field label="Email">
        <Input value={member.email} disabled className="opacity-60" />
      </Field>
      <Field label="Position">
        <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Midfielder" />
      </Field>
      <Field label="Jersey number">
        <Input
          type="number"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          min={0}
          max={999}
        />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
      </Field>
      <Field label="Date of birth">
        <Input value={dob} onChange={(e) => setDob(e.target.value)} type="date" />
      </Field>
      <Field label="Emergency contact (optional, admin-only visibility)">
        <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
      </Field>
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">Saved.</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
