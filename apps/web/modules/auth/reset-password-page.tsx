import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordPage({ token }: { token: string | null }) {
  return (
    <AuthShell
      title="Choose a new password"
      description="After saving it you'll be signed out everywhere, then you can sign in with the new password."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-ink underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
