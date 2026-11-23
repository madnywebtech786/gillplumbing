"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AppError({ error }) {
  const isForbidden = error?.message?.startsWith("Forbidden");

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Card className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-ink">
          {isForbidden ? "You don't have access to this page" : "Something went wrong"}
        </h1>
        <p className="text-sm text-ink-muted mt-2">
          {isForbidden
            ? "This area is restricted to admin accounts."
            : "Please try again, or go back to your dashboard."}
        </p>
        <Link href="/dashboard" className="inline-block mt-4">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
