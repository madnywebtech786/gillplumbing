"use client";

import { useActionState } from "react";
import { updateBookingStatusAction } from "@/server/actions/bookings";
import { Select } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { BOOKING_STATUS_DISPLAY } from "@/lib/status-display";
import { BOOKING_STATUS_TRANSITIONS } from "@/constants/statuses";

export function BookingStatusForm({ bookingId, currentStatus }) {
  const boundAction = updateBookingStatusAction.bind(null, bookingId);
  const [state, action] = useActionState(boundAction, undefined);
  const allowedStatuses = BOOKING_STATUS_TRANSITIONS[currentStatus] || [];

  if (allowedStatuses.length === 0) {
    return null;
  }

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        {state?.error && <ErrorState message={state.error} />}
        <Select name="status" defaultValue="" className="min-w-40">
          <option value="" disabled>
            Change status to...
          </option>
          {allowedStatuses
            .filter((status) => status !== "CANCELLED")
            .map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_DISPLAY[status]?.label ?? status}
              </option>
            ))}
        </Select>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving...">
        Update
      </SubmitButton>
    </form>
  );
}
