"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Input } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { rescheduleBookingAction } from "@/server/actions/bookings";
import { getTodayDayKey } from "@/lib/dates/business-time";

export function RescheduleBookingDialog({ bookingId }) {
  const [open, setOpen] = useState(false);
  const boundAction = rescheduleBookingAction.bind(null, bookingId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reschedule booking"
        description="The previous time is kept in the booking's history."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Date" htmlFor="scheduledDate">
              <DatePicker
                id="scheduledDate"
                name="scheduledDate"
                defaultValue={getTodayDayKey()}
                required
              />
            </FieldWrapper>
            <FieldWrapper label="Time" htmlFor="scheduledTime">
              <Input id="scheduledTime" name="scheduledTime" type="time" required />
            </FieldWrapper>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving...">Save new time</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
