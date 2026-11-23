"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Textarea } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { voidJobReportAction } from "@/server/actions/jobReports";

export function VoidJobReportDialog({ jobReportId }) {
  const [open, setOpen] = useState(false);
  const boundAction = voidJobReportAction.bind(null, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Void report
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Void this job report?"
        description="The report stays visible as voided. Its financial transactions are reversed, not deleted."
      >
        <form action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper label="Reason" htmlFor="voidReason">
            <Textarea id="voidReason" name="voidReason" rows={3} required />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <SubmitButton variant="danger" pendingLabel="Voiding...">
              Void report
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
