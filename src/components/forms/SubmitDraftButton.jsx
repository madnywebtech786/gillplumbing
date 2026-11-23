"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { submitExistingJobReportAction } from "@/server/actions/jobReports";

export function SubmitDraftButton({ jobReportId }) {
  const boundAction = submitExistingJobReportAction.bind(null, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-2 items-end">
      {state?.error && <ErrorState message={state.error} />}
      <SubmitButton pendingLabel="Submitting...">Submit report</SubmitButton>
    </form>
  );
}
