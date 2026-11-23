"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { reverseTransactionAction } from "@/server/actions/ledger";

export function ReverseTransactionDialog({ transactionId, jobReportId }) {
  const [open, setOpen] = useState(false);
  const boundAction = reverseTransactionAction.bind(null, transactionId, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Reverse
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reverse this transaction?"
        description="Posts an opposite entry to correct an incorrect ledger row. The original row is kept for history."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="Reason" htmlFor="reason">
            <Textarea id="reason" name="reason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <SubmitButton variant="danger" pendingLabel="Reversing...">
              Reverse transaction
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
