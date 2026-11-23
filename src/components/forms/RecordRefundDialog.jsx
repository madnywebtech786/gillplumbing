"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { recordRefundAction } from "@/server/actions/ledger";

export function RecordRefundDialog({ jobReportId }) {
  const [open, setOpen] = useState(false);
  const boundAction = recordRefundAction.bind(null, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Record refund
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record refund"
        description="Use this when money was actually returned to the customer."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="Amount" htmlFor="amount">
            <Input id="amount" name="amount" placeholder="0.00" required />
          </FieldWrapper>
          <FieldWrapper label="Reference (optional)" htmlFor="reference">
            <Input id="reference" name="reference" />
          </FieldWrapper>
          <FieldWrapper label="Reason" htmlFor="reason">
            <Textarea id="reason" name="reason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving...">Record refund</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
