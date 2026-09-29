import type { Metadata } from "next";
import { ResetPasswordPage } from "@/modules/auth";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;

  // Read on the server and passed down, so the form never needs
  // useSearchParams (and the Suspense boundary that would come with it).
  // A repeated ?token= can only come from a hand-edited link.
  return <ResetPasswordPage token={typeof token === "string" ? token : null} />;
}
