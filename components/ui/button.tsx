import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-light shadow-[0_0_0_1px_rgba(201,168,76,0.35)] hover:shadow-[0_4px_20px_rgba(201,168,76,0.25)]",
  secondary: "bg-muted text-foreground border border-border-gold hover:border-primary/40 hover:text-primary-light",
  danger: "bg-danger text-danger-foreground hover:opacity-90",
  ghost: "bg-transparent text-primary hover:text-primary-light",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
