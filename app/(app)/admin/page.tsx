import Link from "next/link";
import { Card } from "@/components/ui/card";

const SECTIONS = [
  { href: "/admin/members", label: "Members", description: "Search, review, and manage member accounts." },
  { href: "/admin/members/import", label: "Import members", description: "Bulk-import from a spreadsheet." },
  { href: "/admin/standing", label: "Standing", description: "Who owes dues, who's suspended, who's cleared." },
  { href: "/admin/discipline", label: "Discipline", description: "Issue, lift or clear penalties under §7.2." },
  { href: "/admin/sectors", label: "Divisions", description: "The six Divisions of the Executive Committee (§4)." },
  { href: "/admin/elections", label: "Elections", description: "Create elections and confirm results." },
  { href: "/admin/recruitment", label: "Recruitment", description: "Review prospective member applications." },
  { href: "/admin/audit-logs", label: "Audit logs", description: "Review every sensitive action taken." },
];

export default function AdminHomePage() {
  return (
    <>
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Admin console</h1>
      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors active:bg-muted">
              <p className="font-medium">{s.label}</p>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
