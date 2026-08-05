import type { Metadata } from "next";
import { SignupPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Create account",
};

export default function Page() {
  return <SignupPage />;
}
