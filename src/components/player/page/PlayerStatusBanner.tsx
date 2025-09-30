import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptRow } from "@/types/database";

interface PlayerStatusBannerProps {
  transcript?: TranscriptRow | null;
}

export function PlayerStatusBanner({ transcript }: PlayerStatusBannerProps) {
  if (!transcript || transcript.status === "completed") {
    return null;
  }

  const isFailed = transcript.status === "failed";
  const statusMessage = getStatusMessage(transcript.status);

  return (
    <div
      className={cn(
        "player-card flex items-center gap-3 text-sm",
        isFailed
          ? "bg-[var(--state-error-surface)] text-[var(--state-error-text)]"
          : "bg-[var(--state-info-surface)] text-[var(--state-info-text)]",
      )}
      style={{
        borderColor: isFailed ? "var(--state-error-border)" : "var(--state-info-border)",
      }}
    >
      {isFailed ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <span>{statusMessage}</span>
    </div>
  );
}

function getStatusMessage(status: TranscriptRow["status"]): string {
  switch (status) {
    case "pending":
      return "等待转录...";
    case "processing":
      return "正在转录...";
    case "failed":
      return "转录失败";
    default:
      return "";
  }
}
