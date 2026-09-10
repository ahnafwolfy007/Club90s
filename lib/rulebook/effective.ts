/**
 * When the rulebook starts biting.
 *
 * §9.2 sets the Effective Date, and the club's direction is that enforcement
 * runs forward only: every historical record is kept, but nothing before this
 * point is judged against rules that didn't exist at the time. Without this
 * guard, switching the rulebook on would instantly suspend members over months
 * of pre-existing arrears and issue no-show penalties for matches played under
 * the old regime.
 */

/** Dues periods (`YYYY-MM`) from this month onward are assessed under the rulebook. */
export const RULES_ENFORCED_FROM_MONTH = "2026-09";

/** Datable events (matches, no-shows, attendance) from this instant onward are enforced. */
export const RULES_ENFORCED_FROM = new Date("2026-09-10T00:00:00Z");

/** Drops `YYYY-MM` periods that predate enforcement, so old debt never triggers a sanction. */
export function monthsSubjectToRules(months: string[], fromMonth: string = RULES_ENFORCED_FROM_MONTH): string[] {
  return months.filter((month) => month >= fromMonth);
}

/** Whether an event that happened at `when` falls under the rulebook at all. */
export function eventSubjectToRules(when: Date, from: Date = RULES_ENFORCED_FROM): boolean {
  return when >= from;
}
