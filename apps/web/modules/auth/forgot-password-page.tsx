import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a link to choose a new password."
      footer={
        <>
          New shop?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-ink underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
