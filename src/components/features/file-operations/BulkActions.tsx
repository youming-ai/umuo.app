/**
 * BulkActions - Available bulk operations and action interface
 * Provides comprehensive action buttons with mobile optimization and keyboard shortcuts
 */

"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Trash2,
  Download,
  Share2,
  Mic,
  Copy,
  Move,
  Archive,
  FileOutput,
  FolderOpen,
  MoreHorizontal,
  Keyboard,
  Zap,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  BulkActionsProps,
  BulkAction,
  BulkOperationType,
  FileInfo,
  OperationPriority,
} from "./types";
import { FileOperationUtils, TouchUtils } from "./utils";

export default function BulkActions({
  selectedFiles,
  availableActions,
  onActionExecute,
  layout = "horizontal",
  showLabels = true,
  showDescriptions = false,
  showBadges = true,
  enableKeyboardShortcuts = true,
  enableLongPress = true,
  touchOptimized = true,
  enableHapticFeedback = true,
  className,
}: BulkActionsProps) {
  const { toast } = useToast();
  const [pressedAction, setPressedAction] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const actionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filter actions based on selection
  const filteredActions = React.useMemo(() => {
    return availableActions.filter(action => {
      // Check if action is available for current selection
      if (action.isAvailable && !action.isAvailable(selectedFiles)) {
        return false;
      }

      // Check if action is enabled for current selection
      if (action.isEnabled && !action.isEnabled(selectedFiles)) {
        return false;
      }

      return true;
    });
  }, [availableActions, selectedFiles]);

  // Group actions by priority and type
  const groupedActions = React.useMemo(() => {
    const primaryActions = filteredActions.filter(action =>
      action.priority === "high" || action.priority === "urgent"
    );
    const secondaryActions = filteredActions.filter(action =>
      action.priority === "normal"
    );
    const tertiaryActions = filteredActions.filter(action =>
      action.priority === "low"
    );

    return {
      primary: primaryActions,
      secondary: secondaryActions,
      tertiary: tertiaryActions,
    };
  }, [filteredActions]);

  // Handle action execution
  const handleActionExecute = useCallback((action: BulkAction, event?: React.MouseEvent) => {
    event?.preventDefault();

    if (action.requiresConfirmation) {
      // Action requires confirmation - this will be handled by parent component
      onActionExecute(action, selectedFiles);
    } else {
      // Direct execution
      onActionExecute(action, selectedFiles);
    }

    // Trigger haptic feedback
    if (enableHapticFeedback) {
      TouchUtils.triggerHapticFeedback(action.variant === "destructive" ? "heavy" : "medium");
    }
  }, [onActionExecute, selectedFiles, enableHapticFeedback]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      // Define keyboard shortcuts
      const shortcuts: Record<string, BulkOperationType> = {
        "delete": "delete",
        "d": "download",
        "s": "share",
        "t": "transcribe",
        "c": "copy",
        "m": "move",
        "e": "export",
      };

      const actionType = shortcuts[key];
      if (actionType && hasModifier) {
        const action = filteredActions.find(a => a.type === actionType);
        if (action && (!action.isEnabled || action.isEnabled(selectedFiles))) {
          event.preventDefault();
          handleActionExecute(action);
        }
      }

      // Show shortcuts help with ? key
      if (key === "?" && !hasModifier) {
        setShowKeyboardShortcuts(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcuts, filteredActions, selectedFiles, handleActionExecute]);

  // Handle long press for touch devices
  const handleTouchStart = useCallback((actionId: string) => {
    if (!enableLongPress || !touchOptimized) return;

    setPressedAction(actionId);

    // Long press to show keyboard shortcut
    const longPressTimer = setTimeout(() => {
      const action = filteredActions.find(a => a.id === actionId);
      if (action) {
        toast({
          title: "键盘快捷键",
          description: `使用 ${getKeyboardShortcut(action.type)} 来快速执行此操作`,
          duration: 2000,
        });
      }
    }, 500);

    return () => clearTimeout(longPressTimer);
  }, [enableLongPress, touchOptimized, filteredActions, toast]);

  const handleTouchEnd = useCallback(() => {
    setPressedAction(null);
  }, []);

  // Get keyboard shortcut for action type
  const getKeyboardShortcut = (type: BulkOperationType): string => {
    const shortcuts: Record<BulkOperationType, string> = {
      delete: "Ctrl+Del",
      download: "Ctrl+D",
      share: "Ctrl+S",
      transcribe: "Ctrl+T",
      move: "Ctrl+M",
      copy: "Ctrl+C",
      export: "Ctrl+E",
      organize: "Ctrl+O",
      compress: "N/A",
      extract: "N/A",
    };
    return shortcuts[type] || "N/A";
  };

  // Get action icon with fallback
  const getActionIcon = (action: BulkAction) => {
    return action.icon;
  };

  // Render action button
  const renderActionButton = (action: BulkAction, isCompact = false) => {
    const Icon = getActionIcon(action);
    const isEnabled = !action.isEnabled || action.isEnabled(selectedFiles);
    const keyboardShortcut = enableKeyboardShortcuts ? getKeyboardShortcut(action.type) : null;
    const actionId = action.id;

    return (
      <TooltipProvider key={action.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={(el) => {
                if (el) {
                  actionRefs.current.set(actionId, el);
                }
              }}
              variant={action.variant || "default"}
              size={isCompact ? "sm" : "default"}
              disabled={!isEnabled}
              onClick={(e) => handleActionExecute(action, e)}
              onTouchStart={() => handleTouchStart(actionId)}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "relative overflow-hidden transition-all",
                touchOptimized && "touch-manipulation active:scale-95",
                pressedAction === actionId && "scale-95",
                !showLabels && !isCompact && "p-2",
                action.priority === "urgent" && "ring-2 ring-destructive ring-offset-2",
                action.priority === "high" && "ring-2 ring-primary ring-offset-2",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", !showLabels && !isCompact && "h-5 w-5")} />

                {showLabels && (
                  <span className={cn("whitespace-nowrap", isCompact && "text-xs")}>
                    {action.label}
                  </span>
                )}

                {showBadges && action.priority === "urgent" && (
                  <Badge variant="destructive" className="h-5 px-1 text-xs">
                    紧急
                  </Badge>
                )}

                {showBadges && action.priority === "high" && (
                  <Badge variant="default" className="h-5 px-1 text-xs">
                    重要
                  </Badge>
                )}
              </div>

              {/* Keyboard shortcut hint */}
              {keyboardShortcut && showLabels && !isCompact && (
                <span className="absolute bottom-0 right-1 text-xs opacity-60">
                  {keyboardShortcut}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">{action.label}</div>
              {showDescriptions && action.description && (
                <div className="text-sm text-muted-foreground max-w-xs">
                  {action.description}
                </div>
              )}
              {keyboardShortcut && (
                <div className="text-xs text-muted-foreground">
                  快捷键: {keyboardShortcut}
                </div>
              )}
              {!isEnabled && (
                <div className="text-xs text-destructive">
                  需要选择符合条件的文件
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render action dropdown for overflow actions
  const renderActionDropdown = (actions: BulkAction[], label = "更多") => {
    const isEnabled = actions.length > 0;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" disabled={!isEnabled}>
            <MoreHorizontal className="h-4 w-4 mr-2" />
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action) => {
            const Icon = getActionIcon(action);
            const actionEnabled = !action.isEnabled || action.isEnabled(selectedFiles);
            const keyboardShortcut = enableKeyboardShortcuts ? getKeyboardShortcut(action.type) : null;

            return (
              <DropdownMenuItem
                key={action.id}
                disabled={!actionEnabled}
                onClick={() => handleActionExecute(action)}
                className={cn(
                  "cursor-pointer",
                  action.variant === "destructive" && "text-destructive focus:text-destructive",
                  action.priority === "urgent" && "font-semibold"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{action.label}</span>
                  {keyboardShortcut && (
                    <span className="text-xs text-muted-foreground">
                      {keyboardShortcut}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Render primary actions prominently
  const renderPrimaryActions = () => {
    if (groupedActions.primary.length === 0) return null;

    return (
      <div className={cn(
        "flex gap-2",
        layout === "vertical" && "flex-col",
        layout === "grid" && "grid grid-cols-2 gap-2"
      )}>
        {groupedActions.primary.map(action => renderActionButton(action))}
      </div>
    );
  };

  // Render secondary actions
  const renderSecondaryActions = () => {
    if (groupedActions.secondary.length === 0) return null;

    // Show first few actions directly, rest in dropdown
    const maxDirectActions = layout === "grid" ? 2 : layout === "vertical" ? 3 : 4;
    const directActions = groupedActions.secondary.slice(0, maxDirectActions);
    const overflowActions = groupedActions.secondary.slice(maxDirectActions);

    return (
      <div className="space-y-2">
        {directActions.length > 0 && (
          <div className={cn(
            "flex gap-2",
            layout === "vertical" && "flex-col",
            layout === "grid" && "grid grid-cols-2 gap-2"
          )}>
            {directActions.map(action => renderActionButton(action))}
          </div>
        )}

        {overflowActions.length > 0 && renderActionDropdown(overflowActions, "更多操作")}
      </div>
    );
  };

  // Render tertiary actions in dropdown
  const renderTertiaryActions = () => {
    if (groupedActions.tertiary.length === 0) return null;

    return renderActionDropdown(groupedActions.tertiary, "高级选项");
  };

  // Render keyboard shortcuts help
  const renderKeyboardShortcutsHelp = () => {
    if (!showKeyboardShortcuts) return null;

    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          键盘快捷键
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {filteredActions.map(action => {
            const shortcut = getKeyboardShortcut(action.type);
            if (shortcut === "N/A") return null;

            return (
              <div key={action.id} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {shortcut}
                </Badge>
                <span>{action.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          按 ? 键显示/隐藏快捷键帮助
        </div>
      </div>
    );
  };

  if (selectedFiles.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground p-4", className)}>
        <div className="flex flex-col items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          <span>请先选择文件以执行批量操作</span>
        </div>
      </div>
    );
  }

  if (filteredActions.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground p-4", className)}>
        <div className="flex flex-col items-center gap-2">
          <Shield className="h-8 w-8" />
          <span>没有可用的操作</span>
          <span className="text-sm">请选择其他文件或检查权限</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection summary */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <span className="font-medium">已选择 {selectedFiles.length} 个文件</span>
          <span className="text-sm text-muted-foreground ml-2">
            ({FileOperationUtils.formatFileSize(
              selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
            )})
          </span>
        </div>

        {enableKeyboardShortcuts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          >
            <Keyboard className="h-4 w-4 mr-1" />
            快捷键
          </Button>
        )}
      </div>

      {/* Primary actions */}
      {renderPrimaryActions()}

      <div className={cn(
        "flex gap-2",
        layout === "vertical" && "flex-col"
      )}>
        {/* Secondary actions */}
        {renderSecondaryActions()}

        {/* Tertiary actions */}
        {renderTertiaryActions()}
      </div>

      {/* Keyboard shortcuts help */}
      {renderKeyboardShortcutsHelp()}
    </div>
  );
}
