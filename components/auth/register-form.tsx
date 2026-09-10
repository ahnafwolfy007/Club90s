"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/api/client";

type Step = "details" | "code";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/register/start", {
        method: "POST",
        body: JSON.stringify({ fullName, email }),
      });
      setStep("code");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/register/verify", {
        method: "POST",
        body: JSON.stringify({ email, code, fullName, password }),
      });
      router.push("/profile/registration");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "details") {
    return (
      <form onSubmit={sendCode} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Full name</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Email</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Sending code…" : "Send verification code"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already a member?{" "}
          <a href="/login" className="text-primary hover:text-primary-light">
            Sign in
          </a>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={completeRegistration} className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        We sent a six-digit code to <span className="text-foreground">{email}</span>. It expires in 10 minutes.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Verification code</span>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className="text-center text-2xl tracking-[0.5em]"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Choose a password</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Confirm password</span>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || code.length !== 6} className="mt-1 w-full">
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setStep("details");
          setCode("");
          setError(null);
        }}
        className="text-center text-xs text-muted-foreground hover:text-primary"
      >
        Wrong email? Go back
      </button>
    </form>
  );
}
