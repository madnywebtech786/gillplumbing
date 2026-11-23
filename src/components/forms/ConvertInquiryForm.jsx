"use client";

import { useActionState } from "react";
import { convertInquiryToBookingAction } from "@/server/actions/bookings";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { getTodayDayKey } from "@/lib/dates/business-time";

export function ConvertInquiryForm({ inquiryId }) {
  const boundAction = convertInquiryToBookingAction.bind(null, inquiryId);
  const [state, action] = useActionState(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <ErrorState message={state.error} />}

      <FieldWrapper label="Service type" htmlFor="serviceName">
        <Input id="serviceName" name="serviceName" placeholder="e.g. Drain cleaning" required />
      </FieldWrapper>

      <FieldWrapper label="Service description (optional)" htmlFor="serviceDescription">
        <Textarea id="serviceDescription" name="serviceDescription" rows={2} />
      </FieldWrapper>

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

      <FieldWrapper label="Expected duration, minutes (optional)" htmlFor="expectedDurationMinutes">
        <Input
          id="expectedDurationMinutes"
          name="expectedDurationMinutes"
          type="number"
          min={15}
          max={600}
          step={15}
        />
      </FieldWrapper>

      <FieldWrapper label="Internal notes (optional)" htmlFor="internalNotes">
        <Textarea id="internalNotes" name="internalNotes" rows={2} />
      </FieldWrapper>

      <SubmitButton pendingLabel="Converting..." className="mt-2">
        Create booking
      </SubmitButton>
    </form>
  );
}
