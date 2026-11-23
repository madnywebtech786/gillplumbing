"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { cancelBookingAction } from "@/server/actions/bookings";

export function CancelBookingDialog({ bookingId }) {
  const [open, setOpen] = useState(false);
  const boundAction = cancelBookingAction.bind(null, bookingId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this booking?"
        description="This can't be undone. The booking stays visible in history as cancelled."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="Reason" htmlFor="cancelReason">
            <Textarea id="cancelReason" name="cancelReason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <SubmitButton variant="danger" pendingLabel="Cancelling...">
              Cancel booking
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
