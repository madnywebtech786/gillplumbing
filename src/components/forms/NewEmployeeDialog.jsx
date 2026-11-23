"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { NewEmployeeForm } from "@/components/forms/NewEmployeeForm";

export function NewEmployeeDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>New employee</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create employee"
        description="They'll be able to sign in immediately with the temporary password."
      >
        <NewEmployeeForm />
      </Dialog>
    </>
  );
}
