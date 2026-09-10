import { prisma } from "@/lib/db/client";
import { DisciplineRegister } from "@/components/admin/discipline-register";

export default async function AdminDisciplinePage() {
  const members = await prisma.member.findMany({
    where: { status: { not: "inactive" } },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <div>
        <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Discipline</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Warnings, suspensions and fines under §7.2. Reviewed by Division 6 and the Advisory Board (§7.2.1).
        </p>
      </div>
      <DisciplineRegister members={members} />
    </>
  );
}
