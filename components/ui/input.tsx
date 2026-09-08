import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base text-card-foreground outline-none focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      />
    );
  },
);
