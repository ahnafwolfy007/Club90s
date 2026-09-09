/**
 * One-time migration of the club's real records out of Google Sheets.
 *
 *   1. Registration sheet  → member profiles + login accounts
 *   2. Finance sheet       → the ledger (monthly collections, expenses,
 *                            tournament income/expense, sponsorship)
 *
 * Run with `npx tsx prisma/import-club-data.ts [--wipe]`.
 *
 * Name matching between the two sheets is deliberately conservative: only
 * exact or token-reordered matches are linked automatically. Anything fuzzier
 * (e.g. "Minhaz Ahir" vs "Minhaz khan") gets its own record and is printed as a
 * review item, because silently merging two people's payment history is a much
 * worse outcome than a duplicate row an admin can reconcile later.
 */
import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { fetchSheetCsv, parseSheetMonth, parseAmount } from "@/lib/import/google-sheet";

const REGISTRATION_SHEET_ID = "13lqFl7uPqmi6HGxdNMitPs1uPfVywOwal5Z-NSvbv5w";
const FINANCE_SHEET_ID = "1Uww7z-4EBcERnzyq0laIAS8ABuY-o20gkl5CAcmvofk";
const ADMIN_EMAIL = "ahnafatique711@gmail.com";

// Rows in the Collection tab that summarise rather than describe a member.
const COLLECTION_SUMMARY_ROWS = new Set([
  "monthly total", "amount in wallet", "to receive", "sponsorship(headgear)", "",
]);
const EXPENSE_SUMMARY_ROWS = new Set(["monthly total", ""]);

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

/** Same tokens in any order, e.g. "Ahmed Masud" ≡ "Masud Ahmed". */
function tokenKey(name: string): string {
  return normalizeName(name).split(" ").filter(Boolean).sort().join(" ");
}

function parseDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, month, day, year] = m;
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "B Positive (B+)" → "B+"; falls back to a trimmed value for anything unexpected. */
function normalizeBloodGroup(raw: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parenthesised = value.match(/\(([ABO]{1,2}[+-])\)/i);
  if (parenthesised) return parenthesised[1].toUpperCase();
  const bare = value.match(/^([ABO]{1,2})\s*(positive|negative|\+|-)?/i);
  if (bare) {
    const sign = /neg|-/i.test(value) ? "-" : "+";
    return `${bare[1].toUpperCase()}${sign}`;
  }
  return value.slice(0, 10);
}

function placeholderEmail(name: string): string {
  const slug = normalizeName(name).replace(/\s+/g, ".") || "member";
  return `${slug}@club90s.local`;
}

async function wipe() {
  console.log("Wiping existing data…");
  // Order matters: children before parents, since FKs are enforced.
  await prisma.bid.deleteMany();
  await prisma.tournamentPlayer.deleteMany();
  await prisma.tournamentTeam.deleteMany();
  await prisma.teamPlayer.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.matchRsvpHistory.deleteMany();
  await prisma.matchRsvp.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.electionBallot.deleteMany();
  await prisma.electionVoter.deleteMany();
  await prisma.electionCandidate.deleteMany();
  await prisma.election.deleteMany();
  await prisma.recruitmentApplication.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.activationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.clubSetting.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  console.log("  wiped.");
}

async function seedReferenceData(adminMemberId: string) {
  const sectors = [
    { name: "Finance", description: "Membership dues, match/tournament fees, club expenses" },
    { name: "Tournament", description: "Intra-club tournaments and player-bidding drafts" },
    { name: "Club Team", description: "Weekly match team formation" },
    { name: "Recruitment", description: "Prospective member pipeline" },
    { name: "Communications", description: "Announcements and community feed moderation" },
  ];
  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { name: s.name },
      update: {},
      create: { ...s, createdById: adminMemberId },
    });
  }

  // Categories mirror the club's own expense sheet plus the standard income lines.
  const categories: { name: string; type: "income" | "expense" }[] = [
    { name: "Monthly Fee", type: "income" },
    { name: "Match Fee", type: "income" },
    { name: "Tournament Fee", type: "income" },
    { name: "Tournament Income", type: "income" },
    { name: "Sponsorship", type: "income" },
    { name: "Merchandise", type: "income" },
    { name: "Field Cost", type: "expense" },
    { name: "Water", type: "expense" },
    { name: "Others", type: "expense" },
    { name: "Tournament Expense", type: "expense" },
    { name: "Referee", type: "expense" },
    { name: "Jerseys", type: "expense" },
  ];
  for (const c of categories) {
    await prisma.financeCategory.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  const settings: Record<string, string> = {
    // The club's current standard contribution; Senior Board historically paid
    // more (see memberCategory), which the ledger records as actual amounts.
    monthly_fee: "1500",
    currency: "BDT",
    default_rsvp_deadline_hours: "24",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.clubSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, updatedById: adminMemberId },
    });
  }
}

async function main() {
  const shouldWipe = process.argv.includes("--wipe");

  console.log("Fetching sheets…");
  const [registration, collection, expense] = await Promise.all([
    fetchSheetCsv(REGISTRATION_SHEET_ID),
    fetchSheetCsv(FINANCE_SHEET_ID, "Collection"),
    fetchSheetCsv(FINANCE_SHEET_ID, "Expense"),
  ]);
  console.log(`  registration: ${registration.length - 1} rows`);
  console.log(`  collection:   ${collection.length - 1} rows`);
  console.log(`  expense:      ${expense.length - 1} rows`);

  if (shouldWipe) await wipe();

  // ---- 1. Registered members -------------------------------------------------
  console.log("\nImporting registered members…");
  const registeredByToken = new Map<string, { memberId: string; fullName: string }>();
  let created = 0;

  for (const row of registration.slice(1)) {
    const [, fullNameRaw, , , , dobRaw, bloodGroup, , phone, emailRaw, , , , , , emgName, emgPhone, jersey, position] = row;
    const fullName = fullNameRaw?.trim();
    const email = emailRaw?.trim().toLowerCase();
    if (!fullName || !email) continue;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue; // sheet has a duplicate submission

    const user = await prisma.user.create({ data: { email, status: "unactivated" } });
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        fullName,
        joiningDate: parseDate(row[0]) ?? new Date(),
        dob: parseDate(dobRaw) ?? null,
        bloodGroup: normalizeBloodGroup(bloodGroup),
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        jerseyNumber: Number.isFinite(Number.parseInt(jersey, 10)) ? Number.parseInt(jersey, 10) : null,
        emergencyContact: [emgName?.trim(), emgPhone?.trim()].filter(Boolean).join(" · ") || null,
        status: "active",
      },
    });
    registeredByToken.set(tokenKey(fullName), { memberId: member.id, fullName });
    created++;
  }
  console.log(`  created ${created} member accounts`);

  // Admin first, so reference rows have an author to attribute to.
  const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, include: { member: true } });
  if (!adminUser?.member) throw new Error(`Admin ${ADMIN_EMAIL} not found in the registration sheet.`);
  await seedReferenceData(adminUser.member.id);

  const roleNames = ["member", "president", "admin", "advisor"] as const;
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
  const alreadyAdmin = await prisma.roleAssignment.findFirst({
    where: { memberId: adminUser.member.id, roleId: adminRole.id, status: "active" },
  });
  if (!alreadyAdmin) {
    await prisma.roleAssignment.create({
      data: { memberId: adminUser.member.id, roleId: adminRole.id, grantedById: adminUser.member.id },
    });
  }
  console.log(`  granted admin to ${ADMIN_EMAIL}`);

  // ---- 2. Collections --------------------------------------------------------
  console.log("\nImporting collections…");
  const header = collection[0];
  const monthCols: { index: number; feeMonth: string }[] = [];
  header.forEach((label, i) => {
    const feeMonth = parseSheetMonth(label);
    if (feeMonth) monthCols.push({ index: i, feeMonth });
  });

  const monthlyFeeCat = await prisma.financeCategory.findUniqueOrThrow({ where: { name: "Monthly Fee" } });
  const matched: string[] = [];
  const placeholders: string[] = [];
  const reviewCandidates: string[] = [];
  let collectionTotal = 0;
  let txCount = 0;

  for (const row of collection.slice(1)) {
    const name = row[0]?.trim();
    if (!name || COLLECTION_SUMMARY_ROWS.has(name.toLowerCase())) continue;

    const category = row[1]?.trim() || null;
    let memberId: string;

    const exact = registeredByToken.get(tokenKey(name));
    if (exact) {
      memberId = exact.memberId;
      matched.push(`${name} → ${exact.fullName}`);
      if (category) await prisma.member.update({ where: { id: memberId }, data: { memberCategory: category } });
    } else {
      // Flag anyone sharing a name token with a registered member, so a human
      // can decide whether they're the same person.
      const tokens = new Set(normalizeName(name).split(" ").filter(Boolean));
      for (const [key, reg] of registeredByToken) {
        if (key.split(" ").some((t) => tokens.has(t))) {
          reviewCandidates.push(`"${name}" ~ "${reg.fullName}"`);
        }
      }
      const email = placeholderEmail(name);
      const existing = await prisma.user.findUnique({ where: { email }, include: { member: true } });
      if (existing?.member) {
        memberId = existing.member.id;
      } else {
        const user = await prisma.user.create({ data: { email, status: "unactivated" } });
        const member = await prisma.member.create({
          data: { userId: user.id, fullName: name, joiningDate: new Date(), status: "active", memberCategory: category },
        });
        memberId = member.id;
      }
      placeholders.push(name);
    }

    for (const { index, feeMonth } of monthCols) {
      const amount = parseAmount(row[index] ?? "");
      if (amount <= 0) continue;
      await prisma.financialTransaction.create({
        data: {
          type: "income",
          categoryId: monthlyFeeCat.id,
          amount,
          memberId,
          feeMonth,
          recordedById: adminUser.member.id,
          source: "migrated",
          dateEstimated: true,
          description: `Imported from club collection sheet (${feeMonth})`,
          createdAt: new Date(`${feeMonth}-01T12:00:00Z`),
        },
      });
      collectionTotal += amount;
      txCount++;
    }
  }
  console.log(`  ${txCount} collection transactions, total ${collectionTotal.toLocaleString()}`);
  console.log(`  matched to registered members: ${matched.length}`);
  console.log(`  finance-only records created:  ${placeholders.length}`);

  // ---- 3. Expenses & other ledger lines ---------------------------------------
  console.log("\nImporting expenses…");
  const expenseHeader = expense[0];
  const expenseMonthCols: { index: number; feeMonth: string }[] = [];
  expenseHeader.forEach((label, i) => {
    const feeMonth = parseSheetMonth(label);
    if (feeMonth) expenseMonthCols.push({ index: i, feeMonth });
  });

  let expenseTotal = 0;
  let expenseCount = 0;
  for (const row of expense.slice(1)) {
    const label = row[0]?.trim();
    if (!label || EXPENSE_SUMMARY_ROWS.has(label.toLowerCase())) continue;

    const cat = await prisma.financeCategory.findUnique({ where: { name: label } });
    const categoryId = cat?.id ?? (await prisma.financeCategory.create({ data: { name: label, type: "expense" } })).id;

    for (const { index, feeMonth } of expenseMonthCols) {
      const amount = parseAmount(row[index] ?? "");
      if (amount <= 0) continue;
      await prisma.financialTransaction.create({
        data: {
          type: "expense",
          categoryId,
          amount,
          recordedById: adminUser.member.id,
          source: "migrated",
          dateEstimated: true,
          description: `Imported from club expense sheet (${feeMonth})`,
          createdAt: new Date(`${feeMonth}-01T12:00:00Z`),
        },
      });
      expenseTotal += amount;
      expenseCount++;
    }
  }
  console.log(`  ${expenseCount} expense transactions, total ${expenseTotal.toLocaleString()}`);

  // Tournament and sponsorship lines live in the Collection tab's summary block.
  const extraLines: { label: string; category: string; type: "income" | "expense" }[] = [
    { label: "tournament income", category: "Tournament Income", type: "income" },
    { label: "tournament expense", category: "Tournament Expense", type: "expense" },
  ];
  let extraCount = 0;
  for (const row of collection) {
    const label = row[1]?.trim().toLowerCase();
    const spec = extraLines.find((l) => l.label === label);
    if (!spec) continue;
    const cat = await prisma.financeCategory.findUniqueOrThrow({ where: { name: spec.category } });
    for (const { index, feeMonth } of monthCols) {
      const amount = parseAmount(row[index] ?? "");
      if (amount <= 0) continue;
      await prisma.financialTransaction.create({
        data: {
          type: spec.type,
          categoryId: cat.id,
          amount,
          recordedById: adminUser.member.id,
          source: "migrated",
          dateEstimated: true,
          description: `Imported from club sheet — ${spec.category} (${feeMonth})`,
          createdAt: new Date(`${feeMonth}-01T12:00:00Z`),
        },
      });
      extraCount++;
      if (spec.type === "income") collectionTotal += amount;
      else expenseTotal += amount;
    }
  }

  const sponsorshipRow = collection.find((r) => r[0]?.trim().toLowerCase() === "sponsorship(headgear)");
  if (sponsorshipRow) {
    const amount = parseAmount(sponsorshipRow[1] ?? "");
    if (amount > 0) {
      const cat = await prisma.financeCategory.findUniqueOrThrow({ where: { name: "Sponsorship" } });
      await prisma.financialTransaction.create({
        data: {
          type: "income",
          categoryId: cat.id,
          amount,
          recordedById: adminUser.member.id,
          source: "migrated",
          dateEstimated: true,
          description: "Imported from club sheet — Sponsorship (HeadGear)",
        },
      });
      collectionTotal += amount;
      extraCount++;
    }
  }
  console.log(`  ${extraCount} tournament/sponsorship transactions`);

  // ---- Report ----------------------------------------------------------------
  console.log("\n──────── SUMMARY ────────");
  console.log(`Members:            ${await prisma.member.count()}`);
  console.log(`Transactions:       ${await prisma.financialTransaction.count()}`);
  console.log(`Total income:       ${collectionTotal.toLocaleString()}`);
  console.log(`Total expense:      ${expenseTotal.toLocaleString()}`);
  console.log(`Computed balance:   ${(collectionTotal - expenseTotal).toLocaleString()}`);

  if (placeholders.length) {
    console.log(`\nFinance-only members (placeholder @club90s.local emails — need real addresses before they can log in):`);
    placeholders.forEach((n) => console.log(`  · ${n}`));
  }
  if (reviewCandidates.length) {
    console.log(`\nPossible duplicates to review (NOT merged automatically):`);
    [...new Set(reviewCandidates)].forEach((c) => console.log(`  · ${c}`));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
