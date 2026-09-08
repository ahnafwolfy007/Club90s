"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/auth/current-user-context";

export default function MorePage() {
  const user = useCurrentUser();
  const isAdmin = user.roles.some((r) => r.role === "admin");
  const isPresident = user.roles.some((r) => r.role === "president");

  const items = [
    { href: "/profile", label: "My profile" },
    { href: "/tournaments", label: "Tournaments" },
    { href: "/elections", label: "Elections" },
    { href: "/recruitment", label: "Refer a member" },
    ...(isAdmin || isPresident ? [{ href: "/admin", label: "Admin console" }] : []),
  ];

  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">More</h1>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="active:bg-muted">
              <p className="font-medium">{item.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
