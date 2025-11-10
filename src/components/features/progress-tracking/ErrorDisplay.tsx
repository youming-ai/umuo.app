"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/utils";

export interface ErrorDisplayProps {
  error: {
    type: string;
    message: string;
    suggestedAction: string;
  };
  compact?: boolean;
  onRetry?: () => void;
  className?: string;
}

const errorTypeConfig = {
  network: {
    icon: WifiOff,
    title: "Connection Error",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  },
  timeout: {
    icon: Clock,
    title: "Timeout Error",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  },
  auth: {
    icon: AlertCircle,
    title: "Authentication Error",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
  },
  quota: {
    icon: AlertCircle,
    title: "Quota Exceeded",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
  },
  processing: {
    icon: AlertCircle,
    title: "Processing Error",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
  },
  generic: {
    icon: AlertCircle,
    title: "Error",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
  },
};

function getErrorTypeConfig(type: string) {
  return errorTypeConfig[type as keyof typeof errorTypeConfig] || errorTypeConfig.generic;
}

export function ErrorDisplay({
  error,
  compact = false,
  onRetry,
  className,
}: ErrorDisplayProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const config = getErrorTypeConfig(error.type);
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-md border",
        config.bgColor,
        className
      )}>
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{error.message}</p>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-auto p-0 text-xs font-normal text-primary hover:text-primary/80 mt-1"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-2", config.bgColor, className)}>
      <CardContent className="p-4">
        {/* Error Header */}
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn("text-sm font-semibold", config.color)}>
              {config.title}
            </h4>
            <p className="text-sm text-foreground mt-1">
              {error.message}
            </p>
          </div>
        </div>

        {/* Suggested Action */}
        {error.suggestedAction && (
          <div className="mt-3 p-3 bg-background/50 rounded-md">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Suggestion:</span>{" "}
              {error.suggestedAction}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {onRetry && (
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        )}

        {/* Error Details (Collapsible) */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {isDetailsOpen ? "Hide" : "Show"} technical details
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-3 bg-muted/50 rounded-md space-y-2">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Error Type:</span>
                  <span className="font-mono">{error.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono">
                    {new Date().toLocaleISOString()}
                  </span>
                </div>
              </div>

              {/* Recovery Tips based on error type */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-foreground mb-2">Recovery Tips:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {error.type === "network" && (
                    <>
                      <li>• Check your internet connection</li>
                      <li>• Try switching to a different network</li>
                      <li>• Wait a moment and retry</li>
                    </>
                  )}
                  {error.type === "timeout" && (
                    <>
                      <li>• Check if the file is very large</li>
                      <li>• Try with a smaller file first</li>
                      <li>• Ensure stable internet connection</li>
                    </>
                  )}
                  {error.type === "auth" && (
                    <>
                      <li>• Verify your API key is correct</li>
                      <li>• Check if your subscription is active</li>
                      <li>• Contact support if the issue persists</li>
                    </>
                  )}
                  {error.type === "quota" && (
                    <>
                      <li>• Check your usage limits</li>
                      <li>• Upgrade your plan if needed</li>
                      <li>• Try again later when quota resets</li>
                    </>
                  )}
                  {error.type === "processing" && (
                    <>
                      <li>• Try a different audio format</li>
                      <li>• Ensure audio quality is good</li>
                      <li>• Check if file is corrupted</li>
                    </>
                  )}
                  {(!error.type || error.type === "generic") && (
                    <>
                      <li>• Refresh the page and try again</li>
                      <li>• Check your internet connection</li>
                      <li>• Contact support if the issue persists</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
