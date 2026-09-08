import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/context";
import { can } from "@/lib/permissions/can";
import { parseSpreadsheet } from "@/lib/import/parse-spreadsheet";
import { runMemberImport } from "@/lib/import/members";
import { recordAudit } from "@/lib/audit/log";
import { Errors, handleApiError, ApiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserFromRequest(request);
    if (!ctx) throw Errors.unauthenticated();
    if (!can.runImport(ctx)) throw Errors.forbidden("Only Admins can run a member import.");

    const form = await request.formData();
    const file = form.get("file");
    const dryRun = form.get("dryRun") !== "false"; // default to dry-run unless explicitly disabled

    if (!(file instanceof File)) {
      throw new ApiError(422, "VALIDATION_ERROR", "A .csv or .xlsx file is required (field name: file).");
    }

    const rows = await parseSpreadsheet(file);
    const { results, summary, batchId } = await runMemberImport({
      rows,
      dryRun,
      fileName: file.name,
      importedByMemberId: ctx.memberId,
    });

    if (!dryRun) {
      await recordAudit({
        actorId: ctx.userId,
        action: "member_import.commit",
        entityType: "import_batch",
        entityId: batchId,
        after: summary,
      });
    }

    return NextResponse.json({ dryRun, batchId, summary, results });
  } catch (err) {
    return handleApiError(err);
  }
}
