import { ActivateForm } from "@/components/auth/activate-form";
import { Logo } from "@/components/ui/logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <Logo size={72} />
        <h1 className="gold-gradient font-display text-xl font-bold tracking-wide">Set a new password</h1>
      </div>
      {token ? (
        <ActivateForm token={token} submitLabel="Set new password" />
      ) : (
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          This reset link is missing its token. Check the link in your email, or ask an admin to send a new one.
        </p>
      )}
    </main>
  );
}
