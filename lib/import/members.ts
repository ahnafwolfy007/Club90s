import { prisma } from "@/lib/db/client";
import { memberImportRowSchema } from "@/lib/validation/members";
import { issueActivationToken } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { activationEmail } from "@/lib/email/templates";

export type ImportRowResult = {
  row: number;
  outcome: "imported" | "skipped" | "failed" | "duplicate" | "invalid";
  email?: string;
  reason?: string;
};

export type ImportSummary = {
  imported: number;
  skipped: number;
  failed: number;
  duplicate: number;
  invalid: number;
};

function summarize(results: ImportRowResult[]): ImportSummary {
  const summary: ImportSummary = { imported: 0, skipped: 0, failed: 0, duplicate: 0, invalid: 0 };
  for (const r of results) summary[r.outcome]++;
  return summary;
}

export async function runMemberImport(params: {
  rows: Record<string, string>[];
  dryRun: boolean;
  fileName: string;
  importedByMemberId: string;
}): Promise<{ results: ImportRowResult[]; summary: ImportSummary; batchId: string | null }> {
  const { rows, dryRun, fileName, importedByMemberId } = params;
  const results: ImportRowResult[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const raw = rows[i];
    const parsed = memberImportRowSchema.safeParse(raw);

    if (!parsed.success) {
      results.push({
        row: rowNumber,
        outcome: "invalid",
        email: raw.email,
        reason: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const email = data.email;

    if (seenEmails.has(email)) {
      results.push({ row: rowNumber, outcome: "duplicate", email, reason: "Duplicate email within this file." });
      continue;
    }
    seenEmails.add(email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      results.push({ row: rowNumber, outcome: "duplicate", email, reason: "A member with this email already exists." });
      continue;
    }

    if (dryRun) {
      results.push({ row: rowNumber, outcome: "imported", email, reason: "Would be imported." });
      continue;
    }

    try {
      const fullName = data.full_name.trim();
      const joiningDate = data.joining_date ? new Date(data.joining_date) : new Date();
      const dob = data.date_of_birth ? new Date(data.date_of_birth) : null;
      const jerseyNumber = data.jersey_number ? Number.parseInt(data.jersey_number, 10) : null;
      const status = (data.status || "active") as "active" | "inactive" | "pending";

      const user = await prisma.user.create({ data: { email, status: "unactivated" } });
      await prisma.member.create({
        data: {
          userId: user.id,
          fullName,
          joiningDate,
          dob,
          position: data.position || null,
          jerseyNumber: Number.isFinite(jerseyNumber) ? jerseyNumber : null,
          phone: data.phone || null,
          status,
        },
      });

      const token = await issueActivationToken(user.id);
      const activationUrl = `${process.env.APP_URL}/activate?token=${token}`;
      const email_ = activationEmail(fullName, activationUrl);
      await sendEmail(user.email, email_.subject, email_.text, email_.html);

      results.push({ row: rowNumber, outcome: "imported", email });
    } catch (err) {
      results.push({
        row: rowNumber,
        outcome: "failed",
        email,
        reason: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  }

  const summary = summarize(results);
  let batchId: string | null = null;

  if (!dryRun) {
    const batch = await prisma.importBatch.create({
      data: {
        type: "members",
        fileName,
        importedById: importedByMemberId,
        summary: summary as unknown as object,
      },
    });
    batchId = batch.id;
  }

  return { results, summary, batchId };
}
