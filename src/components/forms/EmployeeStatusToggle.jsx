"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  deactivateEmployeeAction,
  reactivateEmployeeAction,
} from "@/server/actions/employees";

export function EmployeeStatusToggle({ employeeId, isActive }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      if (isActive) {
        await deactivateEmployeeAction(employeeId);
      } else {
        await reactivateEmployeeAction(employeeId);
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        variant={isActive ? "danger" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isActive ? "Deactivate" : "Reactivate"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={isActive ? "Deactivate employee?" : "Reactivate employee?"}
        description={
          isActive
            ? "They will immediately lose the ability to sign in. Their historical records stay intact."
            : "They will be able to sign in again."
        }
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={isActive ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
