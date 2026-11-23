import { LoginForm } from "@/components/forms/LoginForm";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Plumbing Ops
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Sign in to manage bookings, job reports, and billing.
        </p>
      </div>
      <LoginForm />
    </Card>
  );
}
