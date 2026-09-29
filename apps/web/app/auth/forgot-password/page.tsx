import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
