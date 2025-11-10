/**
 * Integration Examples and Demo Components
 * Shows how to use the error recovery components in various scenarios
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Play,
  Code,
  Smartphone,
  Monitor,
  Settings,
  HelpCircle,
  Target,
  Zap,
  CheckCircle,
  X,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

import RecoveryWorkflowComponent from "./RecoveryWorkflow";
import MobileRecoveryInterface from "./MobileRecoveryInterface";
import { AccessibilityProvider, AccessibilitySettings } from "./accessibility";
import { useErrorRecovery, useRecoveryTemplates } from "./hooks";
import { AppError, TranscriptionError, ErrorHandler } from "@/lib/utils/error-handler";
import {
  RecoveryWorkflow,
  RecoveryStep,
  RecoveryTemplate,
  MobileOptimization,
  AccessibilityOptions
} from "./types";

// Example error scenarios
const exampleErrors = {
  networkError: new TranscriptionError(
    "Network connection failed",
    "network",
    {
      code: "NETWORK_ERROR",
      statusCode: 503,
      suggestedAction: "Check your internet connection and try again",
      retryable: true
    }
  ),
  apiKeyError: new TranscriptionError(
    "Invalid API key provided",
    "api_key",
    {
      code: "INVALID_API_KEY",
      statusCode: 401,
      suggestedAction: "Update your GROQ_API_KEY environment variable",
      retryable: false
    }
  ),
  fileTooLargeError: new TranscriptionError(
    "File size exceeds 25MB limit",
    "file_too_large",
    {
      code: "FILE_TOO_LARGE",
      statusCode: 413,
      suggestedAction: "Compress the audio file or split it into smaller chunks",
      retryable: true
    }
  ),
  quotaExceededError: new TranscriptionError(
    "API quota exceeded. Please check your billing.",
    "quota_exceeded",
    {
      code: "QUOTA_EXCEEDED",
      statusCode: 402,
      suggestedAction: "Upgrade your plan or wait for quota reset",
      retryable: false
    }
  )
};

// Example workflows
const exampleWorkflows: RecoveryWorkflow[] = [
  {
    id: "network-recovery-workflow",
    name: "Network Connection Recovery",
    description: "Steps to resolve network connectivity issues",
    errorType: "network",
    steps: [
      {
        id: "check-connection",
        title: "Check Internet Connection",
        description: "Verify your device is connected to the internet",
        instructions: [
          "Check if other websites load in your browser",
          "Try opening a new tab and visiting google.com",
          "Check your Wi-Fi or ethernet connection status"
        ],
        type: "verification",
        required: true,
        completed: false,
        inProgress: false,
        estimatedDuration: 30,
        actions: [
          {
            id: "test-connection",
            label: "Test Connection",
            description: "Run a quick connectivity test",
            type: "primary",
            variant: "button",
            handler: async () => {
              // Simulate connection test
              await new Promise(resolve => setTimeout(resolve, 2000));
              const isOnline = navigator.onLine;
              return {
                success: isOnline,
                message: isOnline ? "Connection successful" : "No internet connection",
                details: { online: isOnline, timestamp: new Date() }
              };
            }
          }
        ]
      },
      {
        id: "retry-request",
        title: "Retry the Request",
        description: "Attempt the operation again",
        instructions: [
          "Ensure you have a stable internet connection",
          "Click the retry button to attempt the operation again"
        ],
        type: "action",
        required: true,
        completed: false,
        inProgress: false,
        estimatedDuration: 10,
        actions: [
          {
            id: "retry-operation",
            label: "Retry Operation",
            description: "Retry the failed operation",
            type: "primary",
            variant: "button",
            handler: async () => {
              await new Promise(resolve => setTimeout(resolve, 3000));
              return {
                success: true,
                message: "Operation completed successfully",
                details: { retryCount: 1, timestamp: new Date() }
              };
            }
          }
        ]
      }
    ],
    currentStepIndex: 0,
    status: "pending",
    progress: 0,
    allowSkipSteps: false,
    allowParallel: false,
    autoAdvance: true,
    estimatedDuration: 40
  },
  {
    id: "api-key-recovery-workflow",
    name: "API Key Configuration",
    description: "Fix invalid or missing API key issues",
    errorType: "api_key",
    steps: [
      {
        id: "verify-api-key",
        title: "Verify API Key",
        description: "Check if API key is properly configured",
        instructions: [
          "Open your environment variables",
          "Look for GROQ_API_KEY variable",
          "Ensure the key is valid and not expired"
        ],
        type: "information",
        required: true,
        completed: false,
        inProgress: false,
        estimatedDuration: 60
      },
      {
        id: "update-api-key",
        title: "Update API Key",
        description: "Update your API key configuration",
        instructions: [
          "Get a new API key from Groq dashboard",
          "Update your .env.local file",
          "Restart the application"
        ],
        type: "action",
        required: true,
        completed: false,
        inProgress: false,
        estimatedDuration: 120,
        actions: [
          {
            id: "open-groq-dashboard",
            label: "Open Groq Dashboard",
            description: "Navigate to Groq API dashboard",
            type: "primary",
            variant: "button",
            handler: async () => {
              window.open("https://console.groq.com/keys", "_blank");
              return {
                success: true,
                message: "Dashboard opened in new tab"
              };
            }
          }
        ]
      }
    ],
    currentStepIndex: 0,
    status: "pending",
    progress: 0,
    allowSkipSteps: false,
    allowParallel: false,
    autoAdvance: false,
    estimatedDuration: 180
  }
];

// Example templates
const exampleTemplates: RecoveryTemplate[] = [
  {
    id: "basic-troubleshooting-template",
    name: "Basic Troubleshooting",
    description: "General troubleshooting steps for common issues",
    errorTypes: ["network", "timeout", "server_error"],
    steps: [
      {
        id: "refresh-page",
        title: "Refresh Page",
        description: "Refresh the current page to clear temporary issues",
        instructions: ["Click refresh button or press F5", "Wait for page to reload"],
        type: "action",
        required: true,
        completed: false,
        inProgress: false,
        estimatedDuration: 5
      },
      {
        id: "check-browser-console",
        title: "Check Browser Console",
        description: "Look for additional error messages",
        instructions: ["Open developer tools (F12)", "Check console tab for errors"],
        type: "verification",
        required: false,
        completed: false,
        inProgress: false,
        estimatedDuration: 30
      }
    ],
    configurable: true,
    allowCustomization: true
  }
];

// Mobile optimization settings
const mobileOptimization: MobileOptimization = {
  swipeGestures: true,
  hapticFeedback: true,
  touchOptimized: true,
  compactMode: false,
  gestureConfig: {
    leftSwipeAction: "next_step",
    rightSwipeAction: "retry_action",
    longPressAction: "show_details"
  }
};

// Accessibility options
const accessibilityOptions: AccessibilityOptions = {
  screenReaderSupport: true,
  keyboardNavigation: true,
  highContrastMode: false,
  reducedMotion: false,
  voiceControl: false,
  largeTextMode: false,
  ariaLabels: {
    "next_step": "Proceed to next step",
    "previous_step": "Go back to previous step",
    "retry_action": "Retry the current action"
  },
  keyboardShortcuts: {
    "next_step": "ArrowRight",
    "previous_step": "ArrowLeft",
    "pause_resume": " ",
    "toggle_help": "h"
  }
};

// Integration Examples Component
export function ErrorRecoveryExamples() {
  const [selectedError, setSelectedError] = useState<AppError>(exampleErrors.networkError);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showSettings, setShowSettings] = useState(false);

  const handleWorkflowComplete = useCallback((workflow: RecoveryWorkflow, results: any[]) => {
    console.log("Workflow completed:", workflow.name, results);
    alert(`Recovery workflow "${workflow.name}" completed successfully!`);
  }, []);

  const handleErrorResolve = useCallback((error: AppError) => {
    console.log("Error resolved:", error);
  }, []);

  const handleErrorPersist = useCallback((error: AppError) => {
    console.log("Error persisted:", error);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Error Recovery UI Examples</h1>
        <p className="text-muted-foreground">
          Comprehensive error recovery components with mobile optimization and accessibility features
        </p>
      </div>

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
          <TabsTrigger value="code">Code Examples</TabsTrigger>
        </TabsList>

        {/* Live Demo */}
        <TabsContent value="demo" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Error Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Select Error Type
                </CardTitle>
                <CardDescription>
                  Choose an error to see the recovery workflow in action
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(exampleErrors).map(([key, error]) => (
                  <Button
                    key={key}
                    variant={selectedError.message === error.message ? "default" : "outline"}
                    onClick={() => setSelectedError(error)}
                    className="w-full justify-start gap-2 h-auto p-3"
                  >
                    <div className="text-left">
                      <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-sm text-muted-foreground">{error.message}</div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>View Mode</span>
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === "desktop" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("desktop")}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("mobile")}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full gap-2"
                >
                  <AccessibilityProvider>
                    <Settings className="h-4 w-4" />
                    Accessibility Settings
                  </AccessibilityProvider>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recovery Interface */}
          {viewMode === "desktop" ? (
            <RecoveryWorkflowComponent
              error={selectedError}
              availableWorkflows={exampleWorkflows}
              onWorkflowComplete={handleWorkflowComplete}
              onErrorResolve={handleErrorResolve}
              onErrorPersist={handleErrorPersist}
              userPreferences={{
                autoRetry: true,
                showDetailedSteps: true,
                enableSounds: false,
                enableAnimations: true,
                preferredLanguage: "en",
                accessibilityMode: false,
                skipOptionalSteps: false,
                confirmationLevel: "important"
              }}
              mobileOptimization={mobileOptimization}
              accessibilityOptions={accessibilityOptions}
            />
          ) : (
            <div className="max-w-md mx-auto">
              <Card className="h-[600px]">
                <CardContent className="p-0 h-full">
                  <MobileRecoveryInterface
                    workflow={exampleWorkflows[0]}
                    session={{
                      id: "demo-session",
                      workflow: exampleWorkflows[0],
                      originalError: selectedError,
                      userPreferences: {
                        autoRetry: true,
                        showDetailedSteps: true,
                        enableSounds: true,
                        enableAnimations: true,
                        preferredLanguage: "en",
                        accessibilityMode: false,
                        skipOptionalSteps: false,
                        confirmationLevel: "important"
                      },
                      analytics: {
                        workflowId: exampleWorkflows[0].id,
                        errorType: selectedError.type,
                        startTime: new Date(),
                        stepsCompleted: 0,
                        totalSteps: exampleWorkflows[0].steps.length,
                        success: false,
                        skippedSteps: [],
                        retryAttempts: 0,
                        userActions: [],
                        userAgent: navigator.userAgent,
                        sessionId: "demo-session"
                      },
                      history: []
                    }}
                    onWorkflowStart={() => console.log("Workflow started")}
                    onWorkflowComplete={handleWorkflowComplete}
                    onWorkflowCancel={() => console.log("Workflow cancelled")}
                    onStepComplete={(stepId, result) => console.log("Step completed:", stepId, result)}
                    onStepError={(stepId, error) => console.log("Step error:", stepId, error)}
                    onStepSkip={(stepId) => console.log("Step skipped:", stepId)}
                    onActionExecute={(stepId, actionId, result) => console.log("Action executed:", stepId, actionId, result)}
                    mobileOptimization={mobileOptimization}
                    accessibilityOptions={accessibilityOptions}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Integration Guide */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Integration Guide
              </CardTitle>
              <CardDescription>
                How to integrate error recovery components into your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">1. Import Components</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`import RecoveryWorkflowComponent from '@/components/ui/error-recovery/RecoveryWorkflow';
import { useErrorRecovery } from '@/components/ui/error-recovery/hooks';
import { AppError, ErrorHandler } from '@/lib/utils/error-handler';`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">2. Create an Error</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`const error = new TranscriptionError(
  "Network connection failed",
  "network",
  {
    code: "NETWORK_ERROR",
    statusCode: 503,
    suggestedAction: "Check your internet connection",
    retryable: true
  }
);`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">3. Use the Recovery Component</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`function ErrorRecoveryExample({ error }: { error: AppError }) {
  const {
    workflows,
    activeWorkflow,
    startWorkflow,
    completeStep,
    cancelWorkflow
  } = useErrorRecovery(error, {
    autoStart: false,
    enableAnalytics: true
  });

  return (
    <RecoveryWorkflowComponent
      error={error}
      availableWorkflows={workflows}
      onWorkflowStart={startWorkflow}
      onWorkflowComplete={handleWorkflowComplete}
      onErrorResolve={handleErrorResolve}
      mobileOptimization={{
        swipeGestures: true,
        hapticFeedback: true,
        touchOptimized: true
      }}
      accessibilityOptions={{
        screenReaderSupport: true,
        keyboardNavigation: true
      }}
    />
  );
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile Features */}
        <TabsContent value="mobile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span className="text-sm">Touch-optimized controls</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span className="text-sm">Swipe gesture navigation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span className="text-sm">Haptic feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span className="text-sm">Compact view mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span className="text-sm">Responsive layouts</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Gesture Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <ChevronRight className="h-4 w-4" />
                    <span>Swipe Left</span>
                  </div>
                  <Badge variant="secondary">Next Step</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Swipe Right</span>
                  </div>
                  <Badge variant="secondary">Previous/Retry</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <ChevronLeft className="h-4 w-4 rotate-90" />
                    <span>Swipe Up</span>
                  </div>
                  <Badge variant="secondary">Expand View</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                    <span>Swipe Down</span>
                  </div>
                  <Badge variant="secondary">Minimize View</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mobile Interface Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Switch to Mobile view in the Live Demo tab to experience the mobile-optimized interface
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Examples */}
        <TabsContent value="code" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`import RecoveryWorkflowComponent from '@/components/ui/error-recovery/RecoveryWorkflow';
import { AppError, ErrorHandler } from '@/lib/utils/error-handler';

function MyComponent() {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = (error: any) => {
    const appError = ErrorHandler.classifyError(error);
    setError(appError);
  };

  if (error) {
    return (
      <RecoveryWorkflowComponent
        error={error}
        onWorkflowComplete={() => setError(null)}
        onErrorResolve={() => setError(null)}
      />
    );
  }

  return <div>My normal content</div>;
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`import RecoveryWorkflowComponent from '@/components/ui/error-recovery/RecoveryWorkflow';
import { useErrorRecovery } from '@/components/ui/error-recovery/hooks';

function AdvancedRecovery({ error }: { error: AppError }) {
  const {
    workflows,
    activeWorkflow,
    startWorkflow,
    completeStep,
    analytics
  } = useErrorRecovery(error, {
    autoStart: true,
    enableAnalytics: true,
    userPreferences: {
      autoRetry: true,
      showDetailedSteps: true,
      enableSounds: true
    },
    mobileOptimization: {
      swipeGestures: true,
      hapticFeedback: true,
      touchOptimized: true
    },
    accessibilityOptions: {
      screenReaderSupport: true,
      keyboardNavigation: true,
      highContrastMode: false
    }
  });

  return (
    <RecoveryWorkflowComponent
      error={error}
      availableWorkflows={workflows}
      recommendations={recommendations}
      onWorkflowComplete={handleComplete}
      enableAnalytics={true}
      allowCustomWorkflow={true}
    />
  );
}`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`const customWorkflow: RecoveryWorkflow = {
  id: "custom-workflow",
  name: "Custom Recovery Workflow",
  description: "Tailored recovery steps for specific error",
  errorType: "custom_error",
  steps: [
    {
      id: "analyze-error",
      title: "Analyze Error",
      description: "Detailed error analysis",
      instructions: ["Review error details", "Identify root cause"],
      type: "information",
      required: true,
      completed: false,
      inProgress: false,
      estimatedDuration: 60
    },
    {
      id: "custom-action",
      title: "Custom Action",
      description: "Perform custom recovery action",
      instructions: ["Execute custom logic"],
      type: "action",
      required: true,
      completed: false,
      inProgress: false,
      estimatedDuration: 30,
      actions: [
        {
          id: "execute-custom",
          label: "Execute Custom Logic",
          type: "primary",
          variant: "button",
          handler: async () => {
            // Custom recovery logic here
            return { success: true, message: "Custom action completed" };
          }
        }
      ]
    }
  ],
  currentStepIndex: 0,
  status: "pending",
  progress: 0,
  allowSkipSteps: false,
  allowParallel: false,
  autoAdvance: true,
  estimatedDuration: 90
};`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Accessibility Settings Modal */}
      {showSettings && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Accessibility Settings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AccessibilityProvider>
              <AccessibilitySettings
                accessibilityOptions={accessibilityOptions}
                onOptionsChange={(updates) => {
                  console.log("Accessibility options updated:", updates);
                }}
              />
            </AccessibilityProvider>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export individual components for direct usage
export { exampleErrors, exampleWorkflows, exampleTemplates };

// Default export
export default ErrorRecoveryExamples;
