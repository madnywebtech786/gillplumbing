import { forwardRef } from "react";
import { fieldClasses } from "@/components/ui/field-classes";

export function FieldWrapper({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`${fieldClasses} [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea ref={ref} className={`${fieldClasses} resize-y ${className}`} {...props} />
  );
});

export { Select } from "@/components/ui/Select";

export const Checkbox = forwardRef(function Checkbox({ className = "", ...props }, ref) {
  return (
    <span className="relative inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className={`peer h-4.5 w-4.5 appearance-none rounded-[5px] border border-border bg-paper-raised transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute h-3 w-3 scale-0 text-white transition-transform peer-checked:scale-100"
      >
        <path
          d="M3.5 8.5L6.5 11.5L12.5 4.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
});
