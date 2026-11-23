"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deleteJobReportDraftAction } from "@/server/actions/jobReports";

export function DeleteDraftButton({ jobReportId }) {
  const [open, setOpen] = useState(false);
  const boundAction = deleteJobReportDraftAction.bind(null, jobReportId);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Delete draft
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this draft?"
        description="Drafts have no financial impact yet, so this can't be undone but doesn't affect any ledger."
      >
        <form action={boundAction} className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Back
          </Button>
          <SubmitButton variant="danger" pendingLabel="Deleting...">
            Delete draft
          </SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
