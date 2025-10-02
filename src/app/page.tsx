import { Suspense } from "react";
import { PageLoadingState } from "@/components/ui/LoadingState";
import FileManager from "./FileManager";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <FileManager />
    </Suspense>
  );
}
