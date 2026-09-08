"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Sector = { id: string; name: string; description: string | null; isActive: boolean };

export function SectorManager({ sectors }: { sectors: Sector[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/admin/sectors", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      });
      setName("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {sectors.map((s) => (
          <Card key={s.id}>
            <p className="font-medium">{s.name}</p>
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium">New sector</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input placeholder="Name (e.g. Merchandise)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create sector"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
