import { ActivateForm } from "@/components/auth/activate-form";
import { Logo } from "@/components/ui/logo";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <Logo size={72} />
        <h1 className="gold-gradient font-display text-xl font-bold tracking-wide">Activate your account</h1>
      </div>
      {token ? (
        <ActivateForm token={token} />
      ) : (
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          This activation link is missing its token. Check the link in your email, or ask an admin to resend it.
        </p>
      )}
    </main>
  );
}
