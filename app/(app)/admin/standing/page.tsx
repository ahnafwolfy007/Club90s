import { StandingRoll } from "@/components/admin/standing-roll";
import { RULES_ENFORCED_FROM_MONTH } from "@/lib/rulebook";

export default function AdminStandingPage() {
  return (
    <>
      <div>
        <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Standing</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Dues, arrears and sanctions per member. Assessed from {RULES_ENFORCED_FROM_MONTH} under §2.1&ndash;2.3;
          earlier months are kept as history and not judged against the rulebook.
        </p>
      </div>
      <StandingRoll />
    </>
  );
}
