import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { MemberDetail } from "@/components/admin/member-detail";

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [member, sectors] = await Promise.all([
    prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, status: true } },
        roleAssignments: { where: { status: "active" }, include: { role: true, sector: true } },
      },
    }),
    prisma.sector.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!member) notFound();

  return (
    <MemberDetail
      member={{
        id: member.id,
        fullName: member.fullName,
        email: member.user.email,
        userStatus: member.user.status,
        memberStatus: member.status,
        membershipClass: member.membershipClass,
        squadType: member.squadType,
        isFoundingMember: member.isFoundingMember,
        roleAssignments: member.roleAssignments.map((ra) => ({
          id: ra.id,
          role: ra.role.name,
          sectorName: ra.sector?.name ?? null,
        })),
      }}
      sectors={sectors.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
