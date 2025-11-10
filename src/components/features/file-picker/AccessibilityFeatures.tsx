"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Zap,
  Settings,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  End,
  PageUp,
  PageDown,
  SkipForward,
  SkipBack,
  Play,
  Pause,
  Square,
  Circle,
  AlertCircle,
  CheckCircle,
  Info,
  Accessibility,
  Type,
  Palette,
  Contrast,
  Moon,
  Sun,
  Text,
  Image,
  Mic,
  Camera,
  Upload,
  Download,
  Share,
  Trash2,
  Copy,
  Edit,
  Save,
  RefreshCw,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  MoreVertical,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AccessibilitySettings {
  // Screen reader settings
  enableScreenReader: boolean;
  announceActions: boolean;
  announceProgress: boolean;
  verboseMode: boolean;

  // Keyboard navigation
  enableKeyboardNavigation: boolean;
  enableShortcuts: boolean;
  focusVisible: boolean;
  skipLinks: boolean;

  // Visual accessibility
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusIndicators: boolean;

  // Voice control
  enableVoiceControl: boolean;
  voiceCommands: boolean;

  // Touch accessibility
  largeTouchTargets: boolean;
  hapticFeedback: boolean;
  swipeGestures: boolean;

  // Color and contrast
  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
  darkMode: boolean;
  customColors: boolean;

  // Magnification
  screenMagnifier: boolean;
  magnificationLevel: number;

  // Reading assistance
  readingGuide: boolean;
  dyslexicFont: boolean;
  letterSpacing: number;
  lineHeight: number;
}

interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  category: "navigation" | "file" | "accessibility" | "media";
}

interface AriaLabel {
  context: string;
  label: string;
  description?: string;
  state?: string;
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: "Tab",
    modifiers: [],
    action: "navigateNext",
    description: "Navigate to next element",
    category: "navigation"
  },
  {
    key: "Tab",
    modifiers: ["Shift"],
    action: "navigatePrevious",
    description: "Navigate to previous element",
    category: "navigation"
  },
  {
    key: "Enter",
    modifiers: [],
    action: "activate",
    description: "Activate focused element",
    category: "navigation"
  },
  {
    key: "Space",
    modifiers: [],
    action: "toggle",
    description: "Toggle checkbox or button",
    category: "navigation"
  },

  // File operations
  {
    key: "o",
    modifiers: ["Ctrl"],
    action: "openFile",
    description: "Open file picker",
    category: "file"
  },
  {
    key: "u",
    modifiers: ["Ctrl"],
    action: "upload",
    description: "Upload selected files",
    category: "file"
  },
  {
    key: "Delete",
    modifiers: [],
    action: "delete",
    description: "Delete selected file",
    category: "file"
  },
  {
    key: "a",
    modifiers: ["Ctrl"],
    action: "selectAll",
    description: "Select all files",
    category: "file"
  },

  // Accessibility
  {
    key: "Accessibility",
    modifiers: ["Alt"],
    action: "toggleAccessibility",
    description: "Toggle accessibility panel",
    category: "accessibility"
  },
  {
    key: "r",
    modifiers: ["Alt"],
    action: "toggleReader",
    description: "Toggle screen reader",
    category: "accessibility"
  },
  {
    key: "h",
    modifiers: ["Alt"],
    action: "toggleHighContrast",
    description: "Toggle high contrast",
    category: "accessibility"
  },

  // Media control
  {
    key: "Space",
    modifiers: ["Ctrl"],
    action: "playPause",
    description: "Play/pause media",
    category: "media"
  },
  {
    key: "ArrowRight",
    modifiers: ["Ctrl"],
    action: "seekForward",
    description: "Seek forward",
    category: "media"
  },
  {
    key: "ArrowLeft",
    modifiers: ["Ctrl"],
    action: "seekBackward",
    description: "Seek backward",
    category: "media"
  }
];

const ARIA_LABELS: Record<string, AriaLabel> = {
  filePicker: {
    context: "main",
    label: "Mobile file picker",
    description: "Upload files from your device, camera, or cloud storage"
  },
  cameraCapture: {
    context: "camera",
    label: "Camera capture",
    description: "Take photos or record videos with your device camera"
  },
  filePreview: {
    context: "preview",
    label: "File preview",
    description: "Preview and manage selected files",
    state: "dynamic"
  },
  fileUpload: {
    context: "upload",
    label: "File upload",
    description: "Upload selected files to the server"
  },
  recentFiles: {
    context: "recent",
    label: "Recent files",
    description: "Access your recently used files"
  }
};

const COLOR_BLIND_FILTERS = {
  protanopia: {
    filter: "url(#protanopia)",
    description: "Red-blind color filter"
  },
  deuteranopia: {
    filter: "url(#deuteranopia)",
    description: "Green-blind color filter"
  },
  tritanopia: {
    filter: "url(#tritanopia)",
    description: "Blue-blind color filter"
  },
  none: {
    filter: "none",
    description: "No color filter"
  }
};

export function useAccessibilityFeatures() {
  const [settings, setSettings] = useLocalStorage<AccessibilitySettings>("accessibility-settings", {
    enableScreenReader: false,
    announceActions: true,
    announceProgress: true,
    verboseMode: false,
    enableKeyboardNavigation: true,
    enableShortcuts: true,
    focusVisible: true,
    skipLinks: true,
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
    enableVoiceControl: false,
    voiceCommands: false,
    largeTouchTargets: false,
    hapticFeedback: true,
    swipeGestures: true,
    colorBlindMode: "none",
    darkMode: false,
    customColors: false,
    screenMagnifier: false,
    magnificationLevel: 1.5,
    readingGuide: false,
    dyslexicFont: false,
    letterSpacing: 0,
    lineHeight: 1.5
  });

  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcut[]>([]);
  const { triggerHaptic } = useHapticFeedback();

  // Screen reader announcements
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (!settings.enableScreenReader) return;

    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.style.width = "1px";
    announcement.style.height = "1px";
    announcement.style.overflow = "hidden";

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [settings.enableScreenReader]);

  // Announce file selection
  const announceFileSelection = useCallback((files: File[]) => {
    if (!settings.announceActions) return;

    const fileNames = files.map(f => f.name).join(", ");
    const message = `${files.length} file${files.length !== 1 ? 's' : ''} selected: ${fileNames}`;
    announce(message, "polite");
  }, [settings.announceActions, announce]);

  // Announce upload progress
  const announceUploadProgress = useCallback((progress: number) => {
    if (!settings.announceProgress) return;

    const message = `Upload progress: ${Math.round(progress)}% complete`;
    announce(message, "polite");
  }, [settings.announceProgress, announce]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!settings.enableShortcuts) return;

    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    if (event.metaKey) modifiers.push("Meta");

    const shortcut = DEFAULT_SHORTCUTS.find(sc =>
      sc.key === event.key &&
      sc.modifiers.length === modifiers.length &&
      sc.modifiers.every(m => modifiers.includes(m))
    );

    if (shortcut) {
      event.preventDefault();
      triggerHaptic("light");
      setActiveShortcuts(prev => [...prev, shortcut]);

      // Announce action
      if (settings.announceActions) {
        announce(`Shortcut activated: ${shortcut.description}`, "polite");
      }

      // Clear from active shortcuts after a delay
      setTimeout(() => {
        setActiveShortcuts(prev => prev.filter(s => s !== shortcut));
      }, 500);
    }
  }, [settings.enableShortcuts, settings.announceActions, triggerHaptic, announce]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (settings.enableKeyboardNavigation) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [settings.enableKeyboardNavigation, handleKeyDown]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty("--reduce-motion", "reduce");
    } else {
      root.style.removeProperty("--reduce-motion");
    }

    // Large text
    if (settings.largeText) {
      root.style.fontSize = "120%";
    } else {
      root.style.fontSize = "";
    }

    // Dark mode
    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Color blind filter
    if (settings.colorBlindMode !== "none") {
      root.style.filter = COLOR_BLIND_FILTERS[settings.colorBlindMode].filter;
    } else {
      root.style.filter = "none";
    }

    // Letter spacing and line height for dyslexia
    if (settings.dyslexicFont) {
      root.style.setProperty("--letter-spacing", `${settings.letterSpacing}px`);
      root.style.setProperty("--line-height", settings.lineHeight.toString());
      root.style.fontFamily = "OpenDyslexic, Arial, sans-serif";
    } else {
      root.style.removeProperty("--letter-spacing");
      root.style.removeProperty("--line-height");
      root.style.fontFamily = "";
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.style.setProperty("--focus-ring-width", "3px");
      root.style.setProperty("--focus-ring-color", "hsl(200, 100%, 50%)");
    } else {
      root.style.removeProperty("--focus-ring-width");
      root.style.removeProperty("--focus-ring-color");
    }

  }, [settings]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));

    // Announce setting changes
    if (settings.announceActions) {
      const changedKeys = Object.keys(newSettings);
      if (changedKeys.length > 0) {
        announce(`Accessibility settings updated: ${changedKeys.join(", ")}`, "polite");
      }
    }
  }, [settings.announceActions, announce, setSettings]);

  return {
    settings,
    updateSettings,
    activeShortcuts,
    announce,
    announceFileSelection,
    announceUploadProgress
  };
}

// Accessibility Panel Component
export function AccessibilityPanel() {
  const { settings, updateSettings, activeShortcuts } = useAccessibilityFeatures();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Open accessibility settings"
          className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg"
        >
          <Accessibility className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5" />
            Accessibility Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6">
            {/* Screen Reader Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Screen Reader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="screen-reader">Enable Screen Reader</Label>
                  <Switch
                    id="screen-reader"
                    checked={settings.enableScreenReader}
                    onCheckedChange={(checked) =>
                      updateSettings({ enableScreenReader: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="announce-actions">Announce Actions</Label>
                  <Switch
                    id="announce-actions"
                    checked={settings.announceActions}
                    onCheckedChange={(checked) =>
                      updateSettings({ announceActions: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="announce-progress">Announce Progress</Label>
                  <Switch
                    id="announce-progress"
                    checked={settings.announceProgress}
                    onCheckedChange={(checked) =>
                      updateSettings({ announceProgress: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="verbose-mode">Verbose Mode</Label>
                  <Switch
                    id="verbose-mode"
                    checked={settings.verboseMode}
                    onCheckedChange={(checked) =>
                      updateSettings({ verboseMode: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visual Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Visual Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="high-contrast">High Contrast</Label>
                  <Switch
                    id="high-contrast"
                    checked={settings.highContrast}
                    onCheckedChange={(checked) =>
                      updateSettings({ highContrast: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reduced-motion">Reduced Motion</Label>
                  <Switch
                    id="reduced-motion"
                    checked={settings.reducedMotion}
                    onCheckedChange={(checked) =>
                      updateSettings({ reducedMotion: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="large-text">Large Text</Label>
                  <Switch
                    id="large-text"
                    checked={settings.largeText}
                    onCheckedChange={(checked) =>
                      updateSettings({ largeText: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="focus-indicators">Focus Indicators</Label>
                  <Switch
                    id="focus-indicators"
                    checked={settings.focusIndicators}
                    onCheckedChange={(checked) =>
                      updateSettings({ focusIndicators: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color Blind Mode</Label>
                  <Select
                    value={settings.colorBlindMode}
                    onValueChange={(value: AccessibilitySettings["colorBlindMode"]) =>
                      updateSettings({ colorBlindMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="protanopia">Protanopia (Red-blind)</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia (Green-blind)</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia (Blue-blind)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyboard-nav">Enable Keyboard Navigation</Label>
                  <Switch
                    id="keyboard-nav"
                    checked={settings.enableKeyboardNavigation}
                    onCheckedChange={(checked) =>
                      updateSettings({ enableKeyboardNavigation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="shortcuts">Enable Keyboard Shortcuts</Label>
                  <Switch
                    id="shortcuts"
                    checked={settings.enableShortcuts}
                    onCheckedChange={(checked) =>
                      updateSettings({ enableShortcuts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="focus-visible">Focus Visible</Label>
                  <Switch
                    id="focus-visible"
                    checked={settings.focusVisible}
                    onCheckedChange={(checked) =>
                      updateSettings({ focusVisible: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="skip-links">Skip Links</Label>
                  <Switch
                    id="skip-links"
                    checked={settings.skipLinks}
                    onCheckedChange={(checked) =>
                      updateSettings({ skipLinks: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Touch Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Touch Accessibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="large-targets">Large Touch Targets</Label>
                  <Switch
                    id="large-targets"
                    checked={settings.largeTouchTargets}
                    onCheckedChange={(checked) =>
                      updateSettings({ largeTouchTargets: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="haptic">Haptic Feedback</Label>
                  <Switch
                    id="haptic"
                    checked={settings.hapticFeedback}
                    onCheckedChange={(checked) =>
                      updateSettings({ hapticFeedback: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="gestures">Swipe Gestures</Label>
                  <Switch
                    id="gestures"
                    checked={settings.swipeGestures}
                    onCheckedChange={(checked) =>
                      updateSettings({ swipeGestures: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DEFAULT_SHORTCUTS.map((shortcut) => (
                    <div key={`${shortcut.key}-${shortcut.modifiers.join("-")}`}
                         className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {shortcut.modifiers.map(m => `${m}+`).join("")}{shortcut.key}
                        </kbd>
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      {activeShortcuts.includes(shortcut) && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ARIA helpers
export function useAriaHelpers() {
  const getAriaLabel = useCallback((context: string, state?: string): string => {
    const config = ARIA_LABELS[context];
    if (!config) return "";

    let label = config.label;
    if (config.description) {
      label += `, ${config.description}`;
    }
    if (state && config.state === "dynamic") {
      label += `, ${state}`;
    }
    return label;
  }, []);

  const getAriaDescription = useCallback((context: string): string => {
    const config = ARIA_LABELS[context];
    return config?.description || "";
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.style.width = "1px";
    announcement.style.height = "1px";
    announcement.style.overflow = "hidden";

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return {
    getAriaLabel,
    getAriaDescription,
    announceToScreenReader
  };
}
