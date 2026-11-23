"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { EmployeeCheckboxList } from "@/components/forms/EmployeeCheckboxList";
import { assignEmployeesAction } from "@/server/actions/bookings";

export function AssignEmployeesDialog({ bookingId, employees, assignedEmployeeIds }) {
  const [open, setOpen] = useState(false);
  const boundAction = assignEmployeesAction.bind(null, bookingId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Assign employees
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Assign employees"
        description="Track which employees were sent to do this job."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <EmployeeCheckboxList
            employees={employees}
            defaultSelectedIds={assignedEmployeeIds}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
