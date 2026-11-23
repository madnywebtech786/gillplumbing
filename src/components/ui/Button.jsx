import { forwardRef } from "react";

const VARIANT_CLASSES = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:opacity-50",
  secondary:
    "bg-transparent text-ink border border-border hover:bg-paper-raised disabled:opacity-50",
  danger:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-muted hover:text-ink hover:bg-paper-raised disabled:opacity-50",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
