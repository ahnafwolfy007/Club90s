import { HTMLAttributes } from "react";

export function Card({
  className = "",
  accent = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border-gold bg-card p-4 transition-colors ${accent ? "gold-topline" : ""} ${className}`}
      {...props}
    />
  );
}

export function CardLabel({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-[11px] uppercase tracking-[0.12em] text-muted-foreground ${className}`}
      {...props}
    />
  );
}

export function CardValue({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`tabular text-xl font-semibold text-primary-light ${className}`} {...props} />;
}
