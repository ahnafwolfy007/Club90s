"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Category = { id: string; name: string; type: "income" | "expense" };
type MemberOption = { id: string; fullName: string };

const QUICK_AMOUNTS = [50, 100, 500];
const PAYMENT_METHODS = ["bKash", "Cash", "Other", "Unknown"] as const;

export function RecordPaymentForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [member, setMember] = useState<MemberOption | null>(null);

  const [categoryId, setCategoryId] = useState(categories.find((c) => c.name === "Monthly Fee")?.id ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("bKash");
  const [feeMonth, setFeeMonth] = useState(new Date().toISOString().slice(0, 7));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isMonthlyFee = selectedCategory?.name === "Monthly Fee";

  useEffect(() => {
    if (!q || member) return;
    const timeout = setTimeout(() => {
      apiFetch<{ members: MemberOption[] }>(`/api/v1/members?q=${encodeURIComponent(q)}`)
        .then((data) => setOptions(data.members))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, member]);

  const visibleOptions = member ? [] : options;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await apiFetch("/api/v1/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          type: selectedCategory?.type ?? "income",
          categoryId,
          amount: Number(amount),
          description: description || undefined,
          memberId: member?.id,
          paymentMethod,
          feeMonth: isMonthlyFee ? feeMonth : undefined,
        }),
      });
      setSaved(true);
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Member (optional — leave blank for club-level income/expense)</span>
        {member ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
            <span>{member.fullName}</span>
            <button type="button" onClick={() => setMember(null)} className="text-sm text-primary">
              Change
            </button>
          </div>
        ) : (
          <>
            <Input placeholder="Search member by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
            {visibleOptions.length > 0 && (
              <div className="flex flex-col overflow-hidden rounded-lg border border-border">
                {visibleOptions.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => {
                      setMember(o);
                      setQ("");
                      setOptions([]);
                    }}
                    className="border-b border-border bg-card px-3 py-2 text-left text-sm last:border-b-0 active:bg-muted"
                  >
                    {o.fullName}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Category</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-base"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      </label>

      {isMonthlyFee && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Month</span>
          <Input type="month" value={feeMonth} onChange={(e) => setFeeMonth(e.target.value)} />
        </label>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Amount</span>
        <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <div className="flex gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount((prev) => String((Number(prev) || 0) + q))}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
            >
              +{q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Payment method</span>
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setPaymentMethod(m)}
              className={`rounded-full px-3 py-1.5 text-sm ${paymentMethod === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <Input placeholder="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">Saved.</p>}
      <Button type="submit" disabled={loading || !amount}>
        {loading ? "Saving…" : "Save transaction"}
      </Button>
    </form>
  );
}
