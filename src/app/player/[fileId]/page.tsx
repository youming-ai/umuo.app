"use client";

import { useParams } from "next/navigation";
import PlayerErrorBoundary from "@/components/player/PlayerErrorBoundary";
import PlayerPageComponent from "@/components/player/PlayerPage";

export default function PlayerPage() {
  const params = useParams();
  const fileId = params.fileId as string;

  return (
    <PlayerErrorBoundary>
      <PlayerPageComponent fileId={fileId} />
    </PlayerErrorBoundary>
  );
}

export const dynamic = "force-dynamic";
