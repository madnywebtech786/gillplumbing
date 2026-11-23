"use client";

import { useActionState } from "react";
import { createEmployeeAction } from "@/server/actions/employees";
import { FieldWrapper, Input } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";

export function NewEmployeeForm() {
  const [state, action] = useActionState(createEmployeeAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <ErrorState message={state.error} />}

      <FieldWrapper label="Full name" htmlFor="name">
        <Input id="name" name="name" required />
      </FieldWrapper>

      <FieldWrapper label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </FieldWrapper>

      <FieldWrapper label="Phone (optional)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" />
      </FieldWrapper>

      <FieldWrapper
        label="Temporary password"
        htmlFor="password"
        hint="Share this with the employee. They can use it to sign in right away."
      >
        <Input id="password" name="password" type="text" minLength={8} required />
      </FieldWrapper>

      <SubmitButton pendingLabel="Creating..." className="mt-2">
        Create employee
      </SubmitButton>
    </form>
  );
}
