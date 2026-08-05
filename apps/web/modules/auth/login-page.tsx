import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export function LoginPage() {
  return (
    <AuthShell
      title="Sign in to Queueup"
      description="Access your shop dashboard and manage today's live queue."
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
      <LoginForm />
    </AuthShell>
  );
}
