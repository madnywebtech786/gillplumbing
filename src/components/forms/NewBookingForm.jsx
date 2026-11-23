"use client";

import { useActionState } from "react";
import { createBookingAction } from "@/server/actions/bookings";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { getTodayDayKey } from "@/lib/dates/business-time";

export function NewBookingForm() {
  const [state, action] = useActionState(createBookingAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <ErrorState message={state.error} />}

      <FieldWrapper label="Customer name" htmlFor="customerName">
        <Input id="customerName" name="customerName" required />
      </FieldWrapper>

      <FieldWrapper label="Phone number" htmlFor="customerPhone">
        <Input id="customerPhone" name="customerPhone" type="tel" required />
      </FieldWrapper>

      <FieldWrapper label="Service address" htmlFor="addressLine1">
        <Input id="addressLine1" name="addressLine1" placeholder="Street address" required />
      </FieldWrapper>

      <FieldWrapper label="City (optional)" htmlFor="addressCity">
        <Input id="addressCity" name="addressCity" />
      </FieldWrapper>

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

      <SubmitButton pendingLabel="Saving..." className="mt-2">
        Create booking
      </SubmitButton>
    </form>
  );
}
