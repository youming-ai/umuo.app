/**
 * Accessibility Features for Error Recovery Components
 * Provides comprehensive accessibility support including screen reader support,
 * keyboard navigation, voice control, and WCAG compliance
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Keyboard,
  Volume2,
  Eye,
  Mic,
  TextCursorInput,
  Accessibility,
  Settings,
  Info,
  ArrowUpDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  SkipForward,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AccessibilityOptions,
  RecoveryStep,
  RecoveryAction,
  RecoveryWorkflow,
  MobileOptimization
} from "./types";

// Accessibility context for managing global accessibility settings
interface AccessibilityContextType {
  options: AccessibilityOptions;
  updateOptions: (updates: Partial<AccessibilityOptions>) => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  triggerHaptic: (pattern: number | number[]) => void;
}

export const AccessibilityContext = React.createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({
  children,
  defaultOptions
}: {
  children: React.ReactNode;
  defaultOptions?: Partial<AccessibilityOptions>;
}) {
  const [options, setOptions] = useState<AccessibilityOptions>({
    screenReaderSupport: true,
    keyboardNavigation: true,
    highContrastMode: false,
    reducedMotion: false,
    voiceControl: false,
    largeTextMode: false,
    ariaLabels: {},
    keyboardShortcuts: {
      "next_step": "ArrowRight",
      "previous_step": "ArrowLeft",
      "pause_resume": " ",
      "toggle_help": "h",
      "show_shortcuts": "?",
      "focus_action": "Enter",
      "cancel_workflow": "Escape"
    },
    ...defaultOptions
  });

  const updateOptions = useCallback((updates: Partial<AccessibilityOptions>) => {
    setOptions(prev => ({ ...prev, ...updates }));
  }, []);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (!options.screenReaderSupport) return;

    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only fixed -top-[9999px] left-0";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [options.screenReaderSupport]);

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const value = { options, updateOptions, announce, triggerHaptic };

  return (
    <AccessibilityContext.Provider value={value}>
      <div className={cn(
        options.highContrastMode && "high-contrast-theme",
        options.reducedMotion && "reduce-motion",
        options.largeTextMode && "large-text-theme"
      )}>
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}

// Hook for using accessibility features
export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}

// Accessible Recovery Step Component
export function AccessibleRecoveryStep({
  step,
  isActive,
  isCompleted,
  hasError,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  accessibilityOptions,
  className,
  ...props
}: {
  step: RecoveryStep;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  onStepComplete: (stepId: string) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: any) => void;
  accessibilityOptions?: AccessibilityOptions;
  className?: string;
  [key: string]: any;
}) {
  const { announce } = useAccessibility();
  const [focusedActionIndex, setFocusedActionIndex] = useState(-1);
  const stepRef = useRef<HTMLDivElement>(null);

  // Auto-announce step changes
  useEffect(() => {
    if (isActive && accessibilityOptions?.screenReaderSupport) {
      const status = isCompleted ? "completed" : hasError ? "has errors" : "in progress";
      announce(`Step ${step.title} is now active and ${status}`, "assertive");
    }
  }, [isActive, isCompleted, hasError, step.title, announce, accessibilityOptions]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!accessibilityOptions?.keyboardNavigation) return;

    const actions = step.actions || [];

    switch (e.key) {
      case "ArrowDown":
      case "Tab":
        e.preventDefault();
        if (focusedActionIndex < actions.length - 1) {
          setFocusedActionIndex(prev => prev + 1);
          announce(`Focused on action: ${actions[focusedActionIndex + 1].label}`);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (focusedActionIndex > 0) {
          setFocusedActionIndex(prev => prev - 1);
          announce(`Focused on action: ${actions[focusedActionIndex - 1].label}`);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedActionIndex >= 0 && actions[focusedActionIndex]) {
          onActionExecute(step.id, actions[focusedActionIndex].id, { success: true });
          announce(`Executing action: ${actions[focusedActionIndex].label}`);
        }
        break;
      case "s":
        if (!step.required && onStepSkip) {
          e.preventDefault();
          onStepSkip(step.id);
          announce(`Skipping step: ${step.title}`);
        }
        break;
    }
  }, [accessibilityOptions, focusedActionIndex, step, onActionExecute, onStepSkip, announce]);

  return (
    <div
      ref={stepRef}
      className={cn(
        "recovery-step-accessible",
        accessibilityOptions?.highContrastMode && "border-2 border-current",
        className
      )}
      role="region"
      aria-label={`Recovery step: ${step.title}`}
      aria-describedby={`step-desc-${step.id}`}
      aria-current={isActive ? "step" : undefined}
      tabIndex={isActive ? 0 : -1}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {/* Step content with proper ARIA labels */}
      <div className="step-header">
        <h3 className="step-title" id={`step-title-${step.id}`}>{step.title}</h3>
        <p className="step-description" id={`step-desc-${step.id}`}>{step.description}</p>

        {/* Status indicator for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Step status: {isCompleted ? "completed" : hasError ? "error" : "pending"}
        </div>
      </div>

      {/* Instructions with proper labeling */}
      {step.instructions && step.instructions.length > 0 && (
        <div className="instructions" role="group" aria-label="Instructions">
          <h4>Instructions:</h4>
          <ol>
            {step.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Accessible actions */}
      {step.actions && step.actions.length > 0 && (
        <div className="actions" role="group" aria-label="Available actions">
          {step.actions.map((action, index) => (
            <AccessibleActionButton
              key={action.id}
              action={action}
              stepId={step.id}
              isFocused={focusedActionIndex === index}
              onFocus={() => setFocusedActionIndex(index)}
              onExecute={(result) => onActionExecute(step.id, action.id, result)}
              accessibilityOptions={accessibilityOptions}
            />
          ))}
        </div>
      )}

      {/* Error announcement */}
      {hasError && step.error && (
        <div
          className="error-message"
          role="alert"
          aria-live="assertive"
        >
          <h4>Error:</h4>
          <p>{step.error}</p>
        </div>
      )}
    </div>
  );
}

// Accessible Action Button
function AccessibleActionButton({
  action,
  stepId,
  isFocused,
  onFocus,
  onExecute,
  accessibilityOptions
}: {
  action: RecoveryAction;
  stepId: string;
  isFocused: boolean;
  onFocus: () => void;
  onExecute: (result: any) => void;
  accessibilityOptions?: AccessibilityOptions;
}) {
  const { announce } = useAccessibility();
  const [isExecuting, setIsExecuting] = useState(false);

  const handleClick = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    announce(`Executing action: ${action.label}`);

    try {
      const result = await action.handler();
      onExecute(result);
      announce(`Action completed: ${action.label}`, result.success ? "polite" : "assertive");
    } catch (error) {
      announce(`Action failed: ${action.label}`, "assertive");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <button
      className={cn(
        "action-button",
        isFocused && "ring-2 ring-primary ring-offset-2",
        accessibilityOptions?.largeTextMode && "text-lg p-4",
        accessibilityOptions?.highContrastMode && "border-2 border-current bg-transparent"
      )}
      type="button"
      aria-label={accessibilityOptions?.ariaLabels?.[action.id] || action.label}
      aria-describedby={action.description ? `action-desc-${action.id}` : undefined}
      aria-disabled={isExecuting}
      aria-busy={isExecuting}
      onClick={handleClick}
      onFocus={onFocus}
      disabled={isExecuting}
    >
      <span className="action-label">{action.label}</span>
      {action.description && (
        <span
          id={`action-desc-${action.id}`}
          className="action-description sr-only"
        >
          {action.description}
        </span>
      )}
      {isExecuting && (
        <span className="sr-only" aria-live="polite">
          Executing action...
        </span>
      )}
    </button>
  );
}

// Keyboard Navigation Helper
export function KeyboardNavigationHelper({
  accessibilityOptions,
  onToggleHelp
}: {
  accessibilityOptions?: AccessibilityOptions;
  onToggleHelp: () => void;
}) {
  if (!accessibilityOptions?.keyboardNavigation) return null;

  return (
    <Card className="keyboard-shortcuts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          {Object.entries(accessibilityOptions.keyboardShortcuts || {}).map(([action, shortcut]) => (
            <div key={action} className="flex justify-between">
              <span className="capitalize">{action.replace('_', ' ')}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">{shortcut}</kbd>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Voice Control Component
export function VoiceControl({
  onCommand,
  accessibilityOptions
}: {
  onCommand: (command: string, args?: any) => void;
  accessibilityOptions?: AccessibilityOptions;
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!accessibilityOptions?.voiceControl || typeof window === 'undefined') return;

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);

        // Process voice commands
        if (event.results[current].isFinal) {
          processVoiceCommand(transcript.toLowerCase());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [accessibilityOptions?.voiceControl]);

  const processVoiceCommand = (command: string) => {
    // Voice command mapping
    const commands: Record<string, string> = {
      "next step": "next_step",
      "next": "next_step",
      "previous step": "previous_step",
      "previous": "previous_step",
      "back": "previous_step",
      "pause": "pause",
      "resume": "resume",
      "stop": "cancel",
      "cancel": "cancel",
      "skip": "skip_step",
      "help": "show_help",
      "repeat": "repeat_last"
    };

    for (const [phrase, action] of Object.entries(commands)) {
      if (command.includes(phrase)) {
        onCommand(action);
        return;
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!accessibilityOptions?.voiceControl) return null;

  return (
    <Card className="voice-control">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          className="w-full gap-2"
        >
          <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
          {isListening ? "Stop Listening" : "Start Voice Control"}
        </Button>

        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Say things like "next step", "pause", "skip", or "help"
        </div>
      </CardContent>
    </Card>
  );
}

// High Contrast Mode Toggle
export function HighContrastToggle({
  accessibilityOptions,
  onToggle
}: {
  accessibilityOptions?: AccessibilityOptions;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Button
      variant={accessibilityOptions?.highContrastMode ? "default" : "outline"}
      onClick={() => onToggle(!accessibilityOptions?.highContrastMode)}
      className="gap-2"
    >
      <Eye className="h-4 w-4" />
      High Contrast
    </Button>
  );
}

// Reduced Motion Toggle
export function ReducedMotionToggle({
  accessibilityOptions,
  onToggle
}: {
  accessibilityOptions?: AccessibilityOptions;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Button
      variant={accessibilityOptions?.reducedMotion ? "default" : "outline"}
      onClick={() => onToggle(!accessibilityOptions?.reducedMotion)}
      className="gap-2"
    >
      <ArrowUpDown className="h-4 w-4" />
      Reduce Motion
    </Button>
  );
}

// Large Text Toggle
export function LargeTextToggle({
  accessibilityOptions,
  onToggle
}: {
  accessibilityOptions?: AccessibilityOptions;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Button
      variant={accessibilityOptions?.largeTextMode ? "default" : "outline"}
      onClick={() => onToggle(!accessibilityOptions?.largeTextMode)}
      className="gap-2"
    >
      <TextCursorInput className="h-4 w-4" />
      Large Text
    </Button>
  );
}

// Accessibility Settings Panel
export function AccessibilitySettings({
  accessibilityOptions,
  onOptionsChange,
  className
}: {
  accessibilityOptions?: AccessibilityOptions;
  onOptionsChange: (options: Partial<AccessibilityOptions>) => void;
  className?: string;
}) {
  return (
    <Card className={cn("accessibility-settings", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibility Settings
        </CardTitle>
        <CardDescription>
          Customize accessibility options for recovery workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Screen Reader Support */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Screen Reader Support</h4>
            <p className="text-sm text-muted-foreground">
              Enable announcements for screen readers
            </p>
          </div>
          <Button
            variant={accessibilityOptions?.screenReaderSupport ? "default" : "outline"}
            onClick={() => onOptionsChange({
              screenReaderSupport: !accessibilityOptions?.screenReaderSupport
            })}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Keyboard Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Keyboard Navigation</h4>
            <p className="text-sm text-muted-foreground">
              Use keyboard shortcuts to navigate
            </p>
          </div>
          <Button
            variant={accessibilityOptions?.keyboardNavigation ? "default" : "outline"}
            onClick={() => onOptionsChange({
              keyboardNavigation: !accessibilityOptions?.keyboardNavigation
            })}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>

        {/* High Contrast Mode */}
        <HighContrastToggle
          accessibilityOptions={accessibilityOptions}
          onToggle={(enabled) => onOptionsChange({ highContrastMode: enabled })}
        />

        {/* Reduced Motion */}
        <ReducedMotionToggle
          accessibilityOptions={accessibilityOptions}
          onToggle={(enabled) => onOptionsChange({ reducedMotion: enabled })}
        />

        {/* Large Text */}
        <LargeTextToggle
          accessibilityOptions={accessibilityOptions}
          onToggle={(enabled) => onOptionsChange({ largeTextMode: enabled })}
        />

        {/* Voice Control */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Voice Control</h4>
            <p className="text-sm text-muted-foreground">
              Control the interface with voice commands
            </p>
          </div>
          <Button
            variant={accessibilityOptions?.voiceControl ? "default" : "outline"}
            onClick={() => onOptionsChange({
              voiceControl: !accessibilityOptions?.voiceControl
            })}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Focus management utilities
export class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex = -1;

  constructor(private container: HTMLElement) {
    this.updateFocusableElements();
  }

  updateFocusableElements() {
    this.focusableElements = Array.from(
      this.container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  focusNext() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = this.currentFocusIndex <= 0
      ? this.focusableElements.length - 1
      : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  focusFirst() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = 0;
    this.focusableElements[0].focus();
  }

  trapFocus() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();

        if (e.shiftKey) {
          this.focusPrevious();
        } else {
          this.focusNext();
        }
      }
    };

    this.container.addEventListener('keydown', handleKeyDown);

    return () => {
      this.container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// CSS-in-JS for accessibility features
export const accessibilityStyles = `
  .high-contrast-theme {
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    --primary: 0 0% 0%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 0%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 0%;
    --accent: 0 0% 96%;
    --accent-foreground: 0 0% 0%;
    --destructive: 0 0% 0%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 0%;
    --input: 0 0% 0%;
    --ring: 0 0% 0%;
  }

  .large-text-theme {
    font-size: 125%;
    line-height: 1.6;
  }

  .large-text-theme .text-sm {
    font-size: 1rem;
  }

  .large-text-theme .text-xs {
    font-size: 0.875rem;
  }

  .reduce-motion *,
  .reduce-motion *::before,
  .reduce-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  .recovery-step-accessible:focus-within {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .action-button:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .action-button[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .reduce-motion *,
    .reduce-motion *::before,
    .reduce-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  @media (prefers-contrast: high) {
    .high-contrast-theme {
      --background: 0 0% 100%;
      --foreground: 0 0% 0%;
      --primary: 0 0% 0%;
      --primary-foreground: 0 0% 100%;
      --border: 0 0% 0%;
    }
  }
`;

export default {
  AccessibilityProvider,
  useAccessibility,
  AccessibleRecoveryStep,
  KeyboardNavigationHelper,
  VoiceControl,
  AccessibilitySettings,
  FocusManager,
  accessibilityStyles
};
