import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const TEST_MEMBERS = [
  { email: "rafi@club90s.local", fullName: "Rafi Ahmed", position: "Midfielder", jerseyNumber: 10 },
  { email: "tanvir@club90s.local", fullName: "Tanvir Hasan", position: "Defender", jerseyNumber: 4 },
  { email: "shanto@club90s.local", fullName: "Shanto Islam", position: "Forward", jerseyNumber: 9 },
];
const PASSWORD = "TestPass123!";

async function main() {
  for (const m of TEST_MEMBERS) {
    const existing = await prisma.user.findUnique({ where: { email: m.email } });
    if (existing) {
      console.log(`Skipping ${m.email} (exists)`);
      continue;
    }
    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.create({ data: { email: m.email, passwordHash, status: "active" } });
    await prisma.member.create({
      data: {
        userId: user.id,
        fullName: m.fullName,
        joiningDate: new Date(),
        position: m.position,
        jerseyNumber: m.jerseyNumber,
        status: "active",
      },
    });
    console.log(`Created ${m.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
