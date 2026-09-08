import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.png" alt="CLUB 90s" width={72} height={86} priority />
        <h1 className="text-xl font-semibold">CLUB 90s</h1>
      </div>
      <LoginForm next={next && next.startsWith("/") ? next : "/dashboard"} />
    </main>
  );
}
