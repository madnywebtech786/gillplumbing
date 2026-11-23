"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { closeInquiryAction } from "@/server/actions/inquiries";

export function CloseInquiryDialog({ inquiryId }) {
  const [open, setOpen] = useState(false);
  const boundAction = closeInquiryAction.bind(null, inquiryId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Close inquiry
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Close this inquiry?"
        description="No booking will be created from it. This can't be undone, but the record stays visible in history."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="Reason" htmlFor="closeReason">
            <Textarea id="closeReason" name="closeReason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton variant="danger" pendingLabel="Closing...">
              Close inquiry
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
