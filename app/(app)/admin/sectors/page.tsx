import { prisma } from "@/lib/db/client";
import { SectorManager } from "@/components/admin/sector-manager";

export default async function AdminSectorsPage() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <h1 className="text-lg font-semibold">Sectors</h1>
      <SectorManager sectors={sectors} />
    </>
  );
}
