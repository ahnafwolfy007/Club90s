import type { CollectionMatrix } from "@/lib/finance/collection-matrix";
import { MatrixScroller } from "@/components/finance/matrix-scroller";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(feeMonth: string): string {
  const [year, month] = feeMonth.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
}

function cellClass(amount: number, amountDue: number): string {
  if (amount <= 0) return "text-foreground/15";
  if (amount >= amountDue) return "text-primary-light";
  return "text-success/80";
}

/**
 * The club's collection board: members down the side, months across the top.
 * The name column stays pinned while months scroll horizontally — the whole
 * point is comparing one member's row against the months around it.
 */
export function CollectionMatrixTable({ matrix }: { matrix: CollectionMatrix }) {
  if (matrix.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No active members yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-gold bg-card">
      <MatrixScroller className="max-h-[65vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 border-b-2 border-primary/25 bg-background px-3 py-3 text-left font-display text-xs font-semibold uppercase tracking-wider text-primary">
                Member
              </th>
              {matrix.months.map((m) => (
                <th
                  key={m}
                  className="whitespace-nowrap border-b-2 border-primary/25 bg-background px-3 py-3 text-center font-display text-xs font-semibold tracking-wider text-primary"
                >
                  {monthLabel(m)}
                </th>
              ))}
              <th className="whitespace-nowrap border-b-2 border-primary/25 bg-background px-3 py-3 text-center font-display text-xs font-semibold uppercase tracking-wider text-primary">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.memberId} className="group">
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-white/5 bg-card px-3 py-2.5 font-medium group-hover:text-primary-light">
                  {row.fullName}
                </td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.feeMonth}
                    className={`tabular whitespace-nowrap border-b border-white/5 px-3 py-2.5 text-center transition-colors group-hover:bg-primary/5 ${cellClass(cell.amount, matrix.amountDue)}`}
                  >
                    {cell.amount > 0 ? cell.amount.toLocaleString() : "—"}
                  </td>
                ))}
                <td className="tabular whitespace-nowrap border-b border-white/5 px-3 py-2.5 text-center font-semibold text-primary-light group-hover:bg-primary/5">
                  {row.total.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 whitespace-nowrap border-t border-primary/20 bg-primary/[0.06] px-3 py-3 font-display text-xs font-semibold uppercase tracking-wider text-primary">
                Monthly Total
              </td>
              {matrix.monthlyTotals.map((total, i) => (
                <td
                  key={matrix.months[i]}
                  className="tabular whitespace-nowrap border-t border-primary/20 bg-primary/[0.06] px-3 py-3 text-center font-semibold text-primary"
                >
                  {total.toLocaleString()}
                </td>
              ))}
              <td className="tabular whitespace-nowrap border-t border-primary/20 bg-primary/[0.06] px-3 py-3 text-center font-semibold text-primary">
                {matrix.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </MatrixScroller>
      <p className="border-t border-primary/10 bg-primary/[0.03] py-1.5 text-center text-[11px] tracking-[0.1em] text-primary-dim sm:hidden">
        ← swipe to scroll →
      </p>
    </div>
  );
}
