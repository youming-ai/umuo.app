/**
 * Accessibility Utilities for Mobile File Management
 * Provides WCAG 2.1 compliant accessibility features
 */

export interface AriaLabels {
  fileCard: {
    select: string;
    play: string;
    delete: string;
    share: string;
    download: string;
    preview: string;
    transcriptionStatus: string;
    fileSize: string;
    uploadDate: string;
  };
  bulkOperations: {
    select: string;
    delete: string;
    transcribe: string;
    download: string;
    share: string;
    clearSelection: string;
  };
  search: {
    search: string;
    filter: string;
    sort: string;
    clearFilters: string;
  };
}

export const defaultAriaLabels: AriaLabels = {
  fileCard: {
    select: "选择文件",
    play: "播放文件",
    delete: "删除文件",
    share: "分享文件",
    download: "下载文件",
    preview: "预览文件",
    transcriptionStatus: "转录状态",
    fileSize: "文件大小",
    uploadDate: "上传日期",
  },
  bulkOperations: {
    select: "选择文件进行批量操作",
    delete: "删除选中的文件",
    transcribe: "转录选中的文件",
    download: "下载选中的文件",
    share: "分享选中的文件",
    clearSelection: "清除选择",
  },
  search: {
    search: "搜索文件",
    filter: "过滤文件",
    sort: "排序文件",
    clearFilters: "清除所有过滤器",
  },
};

/**
 * Accessibility manager for mobile file management
 */
export class AccessibilityManager {
  private labels: AriaLabels;
  private announceRegion: HTMLElement | null = null;

  constructor(labels: Partial<AriaLabels> = {}) {
    this.labels = {
      fileCard: { ...defaultAriaLabels.fileCard, ...labels.fileCard },
      bulkOperations: { ...defaultAriaLabels.bulkOperations, ...labels.bulkOperations },
      search: { ...defaultAriaLabels.search, ...labels.search },
    };

    this.initAnnounceRegion();
  }

  /**
   * Initialize screen reader announce region
   */
  private initAnnounceRegion() {
    // Create announce region for screen readers
    this.announceRegion = document.createElement("div");
    this.announceRegion.setAttribute("aria-live", "polite");
    this.announceRegion.setAttribute("aria-atomic", "true");
    this.announceRegion.setAttribute("class", "sr-only");
    document.body.appendChild(this.announceRegion);
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string) {
    if (this.announceRegion) {
      this.announceRegion.textContent = message;

      // Clear after announcement to allow repeated announcements
      setTimeout(() => {
        if (this.announceRegion) {
          this.announceRegion.textContent = "";
        }
      }, 1000);
    }
  }

  /**
   * Get aria-label for file card
   */
  getFileCardAriaLabel(file: {
    name: string;
    size?: number;
    status?: string;
    uploadedAt?: Date;
    isSelected?: boolean;
  }): string {
    const status = this.getTranscriptionStatusText(file.status);
    const size = file.size ? this.formatFileSize(file.size) : "未知大小";
    const date = file.uploadedAt ? this.formatDate(file.uploadedAt) : "未知日期";
    const selected = file.isSelected ? "，已选择" : "";

    return `文件 ${file.name}，${status}，大小 ${size}，上传于 ${date}${selected}`;
  }

  /**
   * Get aria-label for bulk operation
   */
  getBulkOperationAriaLabel(operation: keyof AriaLabels["bulkOperations"], count: number): string {
    const operationLabel = this.labels.bulkOperations[operation];
    return `${operationLabel}（${count} 个文件）`;
  }

  /**
   * Get file accessibility properties
   */
  getFileAccessibilityProps(file: {
    id: number;
    name: string;
    status?: string;
    isSelected?: boolean;
  }) {
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": this.getFileCardAriaLabel(file),
      "aria-selected": file.isSelected || false,
      "aria-describedby": `file-status-${file.id} file-size-${file.id}`,
    };
  }

  /**
   * Get search input accessibility props
   */
  getSearchAccessibilityProps(hasValue: boolean) {
    return {
      "aria-label": this.labels.search.search,
      "aria-describedby": hasValue ? "search-clear-hint" : undefined,
      "autoComplete": "off",
      "spellCheck": "false",
    };
  }

  /**
   * Handle keyboard navigation for file grid
   */
  handleFileGridKeyboard(event: React.KeyboardEvent, {
    items,
    selectedIndex,
    onSelect,
    onPreview,
  }: {
    items: any[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onPreview: (index: number) => void;
  }) {
    const { key } = event;

    switch (key) {
      case "ArrowRight":
        event.preventDefault();
        if (selectedIndex < items.length - 1) {
          onSelect(selectedIndex + 1);
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (selectedIndex > 0) {
          onSelect(selectedIndex - 1);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        const nextIndex = selectedIndex + 2; // Assuming 2 column grid
        if (nextIndex < items.length) {
          onSelect(nextIndex);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        const prevIndex = selectedIndex - 2; // Assuming 2 column grid
        if (prevIndex >= 0) {
          onSelect(prevIndex);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onPreview(selectedIndex);
        break;
      case "a":
      case "A":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // Select all functionality would be handled by parent
          this.announce("已选择所有文件");
        }
        break;
      case "Escape":
        event.preventDefault();
        // Clear selection functionality would be handled by parent
        this.announce("已清除选择");
        break;
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Check if high contrast mode is enabled
   */
  prefersHighContrast(): boolean {
    return window.matchMedia("(prefers-contrast: high)").matches;
  }

  /**
   * Get appropriate animation duration based on user preferences
   */
  getAnimationDuration(defaultDuration: number): number {
    return this.prefersReducedMotion() ? 0 : defaultDuration;
  }

  /**
   * Focus management for modal dialogs
   */
  trapFocus(element: HTMLElement) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable?.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener("keydown", handleKeydown);
    firstFocusable?.focus();

    // Return cleanup function
    return () => {
      element.removeEventListener("keydown", handleKeydown);
    };
  }

  /**
   * Helper methods
   */
  private getTranscriptionStatusText(status?: string): string {
    switch (status) {
      case "completed":
        return "转录已完成";
      case "transcribing":
        return "转录中";
      case "error":
        return "转录失败";
      default:
        return "未转录";
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.announceRegion) {
      document.body.removeChild(this.announceRegion);
      this.announceRegion = null;
    }
  }
}

// Create singleton instance
export const accessibilityManager = new AccessibilityManager();

// React hook for accessibility features
export function useAccessibility(customLabels?: Partial<AriaLabels>) {
  const manager = React.useMemo(
    () => new AccessibilityManager(customLabels),
    [customLabels]
  );

  React.useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  return {
    announce: manager.announce.bind(manager),
    getFileCardAriaLabel: manager.getFileCardAriaLabel.bind(manager),
    getBulkOperationAriaLabel: manager.getBulkOperationAriaLabel.bind(manager),
    getFileAccessibilityProps: manager.getFileAccessibilityProps.bind(manager),
    getSearchAccessibilityProps: manager.getSearchAccessibilityProps.bind(manager),
    handleFileGridKeyboard: manager.handleFileGridKeyboard.bind(manager),
    trapFocus: manager.trapFocus.bind(manager),
    prefersReducedMotion: manager.prefersReducedMotion.bind(manager),
    prefersHighContrast: manager.prefersHighContrast.bind(manager),
    getAnimationDuration: manager.getAnimationDuration.bind(manager),
  };
}

// Utility HOC for making components accessible
export function withAccessibility<T extends object>(
  Component: React.ComponentType<T>,
  accessibilityProps?: Partial<AriaLabels>
) {
  return function AccessibleComponent(props: T) {
    const accessibility = useAccessibility(accessibilityProps);

    return <Component {...props} accessibility={accessibility} />;
  };
}
