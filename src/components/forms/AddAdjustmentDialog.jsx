"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { addAdjustmentAction } from "@/server/actions/ledger";

export function AddAdjustmentDialog({ jobReportId }) {
  const [open, setOpen] = useState(false);
  const boundAction = addAdjustmentAction.bind(null, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Adjust bill
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Adjust billed amount"
        description="Posts a ledger adjustment for the difference. The original charge is kept."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="New billed amount" htmlFor="newBilledAmount">
            <Input id="newBilledAmount" name="newBilledAmount" placeholder="0.00" required />
          </FieldWrapper>
          <FieldWrapper label="Reason" htmlFor="reason">
            <Textarea id="reason" name="reason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving...">Post adjustment</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
