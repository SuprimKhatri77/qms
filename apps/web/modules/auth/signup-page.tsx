import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { SignupForm } from "./signup-form";

export function SignupPage() {
  return (
    <AuthShell
      roomy
      title="Create your shop account"
      description="Register once, then run walk-in queues from a live dashboard."
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-ink underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
