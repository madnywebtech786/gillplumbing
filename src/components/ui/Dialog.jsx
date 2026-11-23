"use client";

import { useEffect, useRef } from "react";

export function Dialog({ open, onClose, title, description, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose?.();
      }}
      className="rounded-lg border border-border bg-paper-raised p-6 w-full max-w-md backdrop:bg-ink/40 m-auto"
    >
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted mt-1">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
