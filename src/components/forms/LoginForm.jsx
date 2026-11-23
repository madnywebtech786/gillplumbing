"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { FieldWrapper, Input } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <ErrorState message={state.error} />}

      <FieldWrapper label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FieldWrapper>

      <FieldWrapper label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FieldWrapper>

      <SubmitButton pendingLabel="Signing in..." className="w-full mt-2">
        Sign in
      </SubmitButton>
    </form>
  );
}
