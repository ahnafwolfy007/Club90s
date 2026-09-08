"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/finance", label: "Finance" },
  { href: "/community", label: "Community" },
  { href: "/more", label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-transparent"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
