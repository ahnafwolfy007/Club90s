import { prisma } from "@/lib/db/client";
import { ElectionManager } from "@/components/admin/election-manager";

export default async function AdminElectionsPage() {
  const [members, sectors, elections] = await Promise.all([
    prisma.member.findMany({ where: { status: "active" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.sector.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.election.findMany({ include: { sector: { select: { name: true } } }, orderBy: { startAt: "desc" } }),
  ]);

  return (
    <>
      <h1 className="text-lg font-semibold">Elections</h1>
      <ElectionManager
        members={members}
        sectors={sectors.map((s) => ({ id: s.id, name: s.name }))}
        elections={elections.map((e) => ({
          id: e.id,
          title: e.title,
          sectorName: e.sector.name,
          endAt: e.endAt.toISOString(),
          status: e.status,
          winningCandidateId: e.winningCandidateId,
        }))}
      />
    </>
  );
}
