import Image from "next/image";
import { ActivateForm } from "@/components/auth/activate-form";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.png" alt="CLUB 90s" width={72} height={86} priority />
        <h1 className="text-xl font-semibold">Activate your account</h1>
      </div>
      {token ? (
        <ActivateForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This activation link is missing its token. Check the link in your email, or ask an admin to resend it.
        </p>
      )}
    </main>
  );
}
