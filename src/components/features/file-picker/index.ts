// Main export for the mobile file picker system
export { default as MobileFilePicker } from "./MobileFilePicker";
export { default as CameraCapture } from "./CameraCapture";
export { default as FilePreview } from "./FilePreview";
export { default as FileSourceSelector } from "./FileSourceSelector";
export { default as RecentFiles } from "./RecentFiles";
export { default as MobileFileValidation, useMobileFileValidation } from "./MobileFileValidation";

// Hooks
export { useMobileFilePicker } from "./hooks/useMobileFilePicker";
export { useHapticFeedback, useHapticSettings } from "./hooks/useHapticFeedback";
export { useMobilePermissions, usePermissionManager } from "./hooks/useMobilePermissions";
export { useNetworkStatus } from "./hooks/useNetworkStatus";

// Types and utilities
export type { FileSource, RecentFile, FileOptimization, ValidationSummary } from "./types";
export {
  SUPPORTED_MOBILE_FORMATS,
  MOBILE_VALIDATION_PRESETS,
  getMobileOptimizationSettings
} from "./utils";

// Integration helpers
export { MobileFilePickerProvider } from "./context/MobileFilePickerContext";
export { useMobileFilePickerIntegration } from "./hooks/useMobileFilePickerIntegration";
