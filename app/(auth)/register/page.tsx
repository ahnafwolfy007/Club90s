import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/ui/logo";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <Logo size={72} />
        <div className="text-center">
          <h1 className="gold-gradient font-display text-2xl font-bold tracking-wide">CLUB 90s</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Register</p>
        </div>
      </div>
      <RegisterForm />
    </main>
  );
}
