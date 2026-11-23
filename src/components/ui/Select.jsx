"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { fieldClasses } from "@/components/ui/field-classes";

function optionsFromChildren(children) {
  return Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === "option")
    .map((child) => ({
      value: child.props.value ?? "",
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    }));
}

// A fully custom dropdown: a visible styled trigger + listbox panel drive the
// UI, backed by a real (visually hidden, still focusable) <select> so form
// submission, `required` validity, and browser back/forward value restore
// all keep working exactly like a native select - no call site elsewhere in
// the app needs to change how it uses <Select>. Uncontrolled only
// (defaultValue), matching every current call site - no caller passes
// value/onChange, so controlled-mode support isn't built until one needs it.
export const Select = forwardRef(function Select(
  { className = "", children, defaultValue, disabled, required, name, id, ...props },
  forwardedRef
) {
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const [currentValue, setCurrentValue] = useState(defaultValue ?? "");

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const rootRef = useRef(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typeAheadRef = useRef({ text: "", timeout: null });
  const reactId = useId();
  const listboxId = `${id ?? reactId}-listbox`;

  const selectedOption = options.find((option) => option.value === currentValue);

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

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === currentValue);
    setHighlightedIndex(index >= 0 ? index : 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const node = listRef.current?.children[highlightedIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  // A native form.reset() resets the real select's .value without firing a
  // "change" event (that's standard DOM behavior, not a bug in the native
  // control), so without this the custom listbox/trigger label would go
  // stale - still showing the last picked option after the form reset.
  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form) return undefined;
    function handleReset() {
      // Reset fires before the browser applies it to form controls, so read
      // the restored value on the next tick instead of selectRef's current
      // (pre-reset) value.
      setTimeout(() => setCurrentValue(selectRef.current?.value ?? ""), 0);
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  function commitValue(nextValue) {
    // Set the real select's value via the native setter (not by relying on
    // React's value/defaultValue diffing) and dispatch a real "change" so
    // the select's own onChange above fires and updates currentValue - this
    // is what makes a pick made in the custom listbox actually reach the
    // real form control that gets submitted.
    if (selectRef.current) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        "value"
      )?.set;
      nativeSetter?.call(selectRef.current, nextValue);
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function selectOption(option) {
    if (!option || option.disabled) return;
    commitValue(option.value);
    setOpen(false);
    selectRef.current?.focus();
  }

  function moveHighlight(delta) {
    setHighlightedIndex((current) => {
      let next = current;
      for (let step = 0; step < options.length; step += 1) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        event.preventDefault();
        setHighlightedIndex(options.findIndex((option) => !option.disabled));
        break;
      case "End":
        event.preventDefault();
        for (let index = options.length - 1; index >= 0; index -= 1) {
          if (!options[index].disabled) {
            setHighlightedIndex(index);
            break;
          }
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectOption(options[highlightedIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const state = typeAheadRef.current;
          clearTimeout(state.timeout);
          state.text += event.key.toLowerCase();
          state.timeout = setTimeout(() => {
            state.text = "";
          }, 500);
          const match = options.findIndex((option) =>
            !option.disabled && option.label?.toString().toLowerCase().startsWith(state.text)
          );
          if (match >= 0) setHighlightedIndex(match);
        }
    }
  }

  return (
    <div ref={rootRef} className="relative group">
      {/* The real select stays focusable and in the tab order (not
          aria-hidden, not tabIndex={-1}) so it keeps native constraint
          validation (`required`'s "please select an item" bubble, which the
          browser can only anchor to a field the user can actually reach),
          form submission, and autofill/back-forward restore. It's visually
          hidden and sits on top of the styled button below, so focusing or
          opening it (keyboard or pointer) is what the user actually does;
          the button underneath is presentation + the dropdown trigger. */}
      <select
        ref={(node) => {
          selectRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        onChange={(event) => setCurrentValue(event.target.value)}
        onMouseDown={(event) => {
          // Suppress the native popup; the custom listbox below is what
          // actually drives selection. Focus still lands on this select.
          event.preventDefault();
          selectRef.current?.focus();
          if (!disabled) setOpen((value) => !value);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-activedescendant={open && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        {...props}
      >
        {children}
      </select>

      <div
        ref={triggerRef}
        aria-hidden="true"
        className={`${fieldClasses} pointer-events-none flex items-center justify-between gap-2 text-left group-focus-within:ring-2 group-focus-within:ring-accent/40 group-focus-within:border-accent ${className}`}
      >
        <span className={`min-w-0 truncate ${selectedOption && !selectedOption.disabled ? "" : "text-ink-muted"}`}>
          {selectedOption?.label ?? "Select…"}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1.5 max-h-60 w-full max-w-[min(90vw,28rem)] overflow-auto rounded-lg border border-border bg-paper-raised py-1 text-sm shadow-lg shadow-black/5"
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={`${option.value}-${index}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                title={typeof option.label === "string" ? option.label : undefined}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option)}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 ${
                  option.disabled
                    ? "cursor-not-allowed text-ink-muted/60"
                    : "cursor-pointer text-ink"
                } ${isHighlighted && !option.disabled ? "bg-accent-soft" : ""}`}
              >
                <span className={`truncate ${isSelected ? "font-medium text-accent" : ""}`}>{option.label}</span>
                {isSelected && (
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
