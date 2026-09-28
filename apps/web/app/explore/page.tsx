import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorePage } from "@/modules/explore";

export const metadata: Metadata = {
  title: "Find a shop",
};

export default function Page() {
  // ExplorePage reads ?city= and ?category= via useSearchParams, which Next
  // requires to be wrapped in Suspense (same as the verify page).
  return (
    <Suspense>
      <ExplorePage />
    </Suspense>
  );
}
