import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

const DEFAULT_SECTORS = [
  { name: "Finance", description: "Membership dues, match/tournament fees, club expenses" },
  { name: "Tournament", description: "Intra-club tournaments and player-bidding drafts" },
  { name: "Club Team", description: "Weekly match team formation" },
  { name: "Recruitment", description: "Prospective member pipeline" },
  { name: "Communications", description: "Announcements and community feed moderation" },
];

const FINANCE_CATEGORIES: { name: string; type: "income" | "expense" }[] = [
  { name: "Monthly Fee", type: "income" },
  { name: "Match Fee", type: "income" },
  { name: "Tournament Fee", type: "income" },
  { name: "Sponsorship", type: "income" },
  { name: "Merchandise", type: "income" },
  { name: "Registration Income", type: "income" },
  { name: "Turf Cost", type: "expense" },
  { name: "Referee", type: "expense" },
  { name: "Jerseys", type: "expense" },
  { name: "Trophies", type: "expense" },
  { name: "Prize Money", type: "expense" },
  { name: "Other", type: "expense" },
];

const CLUB_SETTINGS: Record<string, string> = {
  monthly_fee: "500.00",
  currency: "BDT",
  default_rsvp_deadline_hours: "24",
};

async function main() {
  console.log("Seeding roles...");
  const roleNames = ["member", "president", "admin", "advisor"] as const;
  const roles = new Map<string, string>();
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles.set(name, role.id);
  }

  console.log("Seeding bootstrap admin...");
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const adminName = process.env.SEED_ADMIN_NAME || "Club Admin";

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  let adminMemberId: string;

  if (existingUser) {
    const member = await prisma.member.findUnique({ where: { userId: existingUser.id } });
    if (!member) throw new Error(`User ${adminEmail} exists without a member profile — inconsistent state.`);
    adminMemberId = member.id;
    console.log(`Bootstrap admin already exists (${adminEmail}), skipping creation.`);
  } else {
    const passwordHash = await hashPassword(adminPassword);
    const user = await prisma.user.create({
      data: { email: adminEmail, passwordHash, status: "active" },
    });
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        fullName: adminName,
        joiningDate: new Date(),
        status: "active",
      },
    });
    adminMemberId = member.id;

    // Bootstrap self-grant: the very first admin has no other admin to grant
    // them the role, so they grant it to themselves. Every subsequent role
    // grant goes through the normal Tier 2 admin flow (SRS §7.4).
    await prisma.roleAssignment.create({
      data: { memberId: member.id, roleId: roles.get("admin")!, grantedById: member.id },
    });
    console.log(`Created bootstrap admin ${adminEmail} — change the seed password after first login.`);
  }

  console.log("Seeding sectors...");
  const sectorIds = new Map<string, string>();
  for (const sector of DEFAULT_SECTORS) {
    const row = await prisma.sector.upsert({
      where: { name: sector.name },
      update: {},
      create: { ...sector, createdById: adminMemberId },
    });
    sectorIds.set(sector.name, row.id);
  }

  console.log("Seeding finance categories...");
  for (const category of FINANCE_CATEGORIES) {
    await prisma.financeCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log("Seeding club settings...");
  for (const [key, value] of Object.entries(CLUB_SETTINGS)) {
    await prisma.clubSetting.upsert({
      where: { key },
      update: {},
      create: { key, value, updatedById: adminMemberId },
    });
  }

  console.log("Seed complete.");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
