"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ClientApiError } from "@/lib/api/client";

const OPTIONS = [
  { value: "in", label: "I'm in" },
  { value: "maybe", label: "Maybe" },
  { value: "out", label: "Out" },
] as const;

export function RsvpButtons({
  matchId,
  currentResponse,
  disabled,
}: {
  matchId: string;
  currentResponse: "in" | "out" | "maybe" | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(response: string) {
    setLoading(response);
    setError(null);
    try {
      await apiFetch(`/api/v1/matches/${matchId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ response }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = currentResponse === opt.value;
          return (
            <button
              key={opt.value}
              disabled={disabled || loading !== null}
              onClick={() => respond(opt.value)}
              className={`rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {loading === opt.value ? "…" : opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
