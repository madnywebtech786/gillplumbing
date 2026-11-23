"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { fieldClasses } from "@/components/ui/field-classes";

// react-day-picker only applies the `today`/`selected` modifier classes
// (from `classNames` below) to the day CELL, not the button inside it - the
// button gets just the static day_button class - so "today" styling never
// reached the visible circle. A custom DayButton reads the modifiers
// directly and builds the button's className itself, same pattern as the
// library's own default (see node_modules/react-day-picker DayButton.js).
function DayButton({ day, modifiers, className, ...buttonProps }) {
  const ref = useRef(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const todayClass =
    modifiers.today && !modifiers.selected
      ? "ring-2 ring-inset ring-accent font-semibold text-accent"
      : "";
  const selectedClass = modifiers.selected ? "bg-accent text-white hover:bg-accent-hover" : "";

  return (
    <button
      ref={ref}
      className={`${className} ${todayClass} ${selectedClass}`}
      {...buttonProps}
    />
  );
}

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parses a YYYY-MM-DD day-key string as a local calendar date (year, month,
// day), never through Date's ISO-string parsing - that reads the string as
// UTC midnight, which displays as the previous day in any timezone behind
// UTC. This mirrors how the rest of the app treats work/booking dates as
// business-timezone day keys, not instants (src/lib/dates/business-time.js).
function dayKeyToLocalDate(dayKey) {
  const match = DAY_KEY_PATTERN.exec(dayKey ?? "");
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function localDateToDayKey(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  if (!date) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const calendarClassNames = {
  months: "flex flex-col",
  month: "flex flex-col gap-3",
  month_caption: "flex items-center justify-center h-8 px-9",
  caption_label: "text-sm font-semibold text-ink",
  nav: "flex items-center justify-between absolute inset-x-1 top-0 h-8",
  button_previous:
    "h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-paper hover:text-ink disabled:opacity-30 disabled:pointer-events-none",
  button_next:
    "h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-paper hover:text-ink disabled:opacity-30 disabled:pointer-events-none",
  chevron: "fill-current",
  month_grid: "border-collapse",
  weekdays: "flex",
  weekday: "h-8 w-8 flex items-center justify-center text-xs font-medium text-ink-muted",
  weeks: "flex flex-col gap-0.5",
  week: "flex gap-0.5",
  day: "h-8 w-8 p-0 text-center align-middle",
  day_button:
    "h-8 w-8 rounded-md text-sm text-ink hover:bg-paper transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
  // today/selected are styled in the custom DayButton below instead of
  // here: this classNames map only reaches the day CELL, not the button.
  outside: "text-ink-muted/50",
  disabled: "text-ink-muted/30 pointer-events-none",
  hidden: "invisible",
};

const calendarComponents = { DayButton };

// Custom day-grid date picker: native <input type="date"> popups are the
// OS's own UI and can't be restyled at all, so the only way to make a
// themed one is a real calendar component. react-day-picker supplies the
// date-grid logic (month math, keyboard nav, locale weekdays); everything
// visual is Tailwind classes passed via classNames above. A visually-hidden
// but focusable <input type="date"> stays as the actual form field so
// `required`, FormData submission, and browser back/forward restore all
// keep working exactly like a plain date input elsewhere in the app.
export const DatePicker = forwardRef(function DatePicker(
  { id, name, defaultValue, required, disabled, className = "", ...props },
  forwardedRef
) {
  const [dayKey, setDayKey] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selectedDate = dayKeyToLocalDate(dayKey);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // A native form.reset() resets the real input's .value without firing a
  // "change" event (dispatched before controls are restored, per spec), so
  // without this the custom display would go stale after a form reset.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    function handleReset() {
      setTimeout(() => setDayKey(inputRef.current?.value ?? ""), 0);
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  function commitDayKey(nextDayKey) {
    setDayKey(nextDayKey);
    if (inputRef.current) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeSetter?.call(inputRef.current, nextDayKey);
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return (
    <div ref={rootRef} className="relative group">
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        type="date"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        onChange={(event) => setDayKey(event.target.value)}
        onMouseDown={(event) => {
          // Suppress the native date-picker popup; our calendar panel below
          // is what actually drives selection. Focus still lands here.
          event.preventDefault();
          inputRef.current?.focus();
          if (!disabled) setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (["Enter", " ", "ArrowDown"].includes(event.key) && !open) {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            setOpen(false);
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        {...props}
      />

      <div
        aria-hidden="true"
        className={`${fieldClasses} pointer-events-none flex items-center justify-between gap-2 text-left group-focus-within:ring-2 group-focus-within:ring-accent/40 group-focus-within:border-accent ${className}`}
      >
        <span className={selectedDate ? "" : "text-ink-muted"}>
          {selectedDate ? formatDisplayDate(selectedDate) : "Select date…"}
        </span>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M6.5 3v3M13.5 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 rounded-lg border border-border bg-paper-raised p-2 shadow-lg shadow-black/5">
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              commitDayKey(date ? localDateToDayKey(date) : "");
              setOpen(false);
              inputRef.current?.focus();
            }}
            classNames={calendarClassNames}
            components={calendarComponents}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
});
