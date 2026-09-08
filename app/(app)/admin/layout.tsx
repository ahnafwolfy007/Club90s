import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUser();
  if (!ctx || !can.isAdmin(ctx)) redirect("/dashboard");

  return <div className="fade-up flex flex-col gap-4 px-4 py-4">{children}</div>;
}
