"use client";

import { useActionState } from "react";
import { createInquiryAction } from "@/server/actions/inquiries";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";

export function NewInquiryForm() {
  const [state, action] = useActionState(createInquiryAction, undefined);

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

      <FieldWrapper label="Call summary" htmlFor="callSummary">
        <Textarea
          id="callSummary"
          name="callSummary"
          rows={4}
          placeholder="What does the customer need?"
          required
        />
      </FieldWrapper>

      <SubmitButton pendingLabel="Saving..." className="mt-2">
        Create inquiry
      </SubmitButton>
    </form>
  );
}
