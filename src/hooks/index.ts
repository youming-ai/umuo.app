// Re-export all hooks from their new locations

export { useTranscription } from "./api/useTranscription";
export { useTranscriptionManager } from "./api/useTranscriptionManager";
export type { UseFilesReturn } from "./db/useFiles";
export { useFiles } from "./db/useFiles";
export type { UseAppStateReturn } from "./ui/useAppState";
export { useAppState } from "./ui/useAppState";
export type { UseAudioPlayerReturn } from "./ui/useAudioPlayer";
export { useAudioPlayer } from "./ui/useAudioPlayer";
