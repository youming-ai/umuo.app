import { Suspense } from "react";
import { PageLoadingState } from "@/components/ui/LoadingState";
import FileManagerEnhanced from "@/components/features/file/FileManagerEnhanced";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <FileManagerEnhanced />
    </Suspense>
  );
}
