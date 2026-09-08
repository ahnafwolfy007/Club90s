import Link from "next/link";
import { MemberList } from "@/components/admin/member-list";

export default function AdminMembersPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Members</h1>
        <Link href="/admin/members/import" className="text-sm font-medium text-primary">
          Import
        </Link>
      </div>
      <MemberList />
    </>
  );
}
