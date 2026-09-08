import { prisma } from "@/lib/db/client";

export default async function AdminAuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { email: true } } },
  });

  return (
    <>
      <h1 className="text-lg font-semibold">Audit log</h1>
      <div className="flex flex-col gap-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{log.action}</span>
              <span className="text-xs text-muted-foreground">{log.createdAt.toLocaleString()}</span>
            </div>
            <p className="text-muted-foreground">
              {log.actor?.email ?? "system"} — {log.entityType}
              {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
            </p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-muted-foreground">No audit entries yet.</p>}
      </div>
    </>
  );
}
