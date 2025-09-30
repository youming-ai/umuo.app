import { Suspense } from "react";
import { PageLoadingState } from "@/components/ui/LoadingState";
import HomePageClient from "./HomePageClient";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <HomePageClient />
    </Suspense>
  );
}
