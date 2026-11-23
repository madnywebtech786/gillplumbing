"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/Table";

// Makes an entire table row navigate to `href`, not just the link inside one
// cell. Clicking any interactive element inside the row (links, buttons,
// toggles) still works normally and does not also trigger the row
// navigation, so nested actions (e.g. an employee status toggle) are safe.
export function ClickableRow({ href, children, ...props }) {
  const router = useRouter();

  return (
    <TableRow
      href={href}
      onClick={(event) => {
        if (event.target.closest("a, button, input, select, textarea")) {
          return;
        }
        router.push(href);
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}
