import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyPage } from "@/modules/join";

type PageProps = {
  params: Promise<{ shopSlug: string }>;
};

export const metadata: Metadata = {
  title: "Confirming your spot",
};

export default async function Page({ params }: PageProps) {
  const { shopSlug } = await params;

  // VerifyPage reads ?token= via useSearchParams, which Next requires to be
  // wrapped in Suspense so the rest of the page can still be statically
  // served while that part waits on the client.
  return (
    <Suspense>
      <VerifyPage slug={shopSlug} />
    </Suspense>
  );
}
