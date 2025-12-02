/**
 * 转录进度管理器
 * 提供精确的进度反馈和状态跟踪
 */

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  progress: number; // 0-100
  estimatedDuration?: number; // 预估时间（毫秒）
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface TranscriptionProgress {
  fileId: number;
  totalSteps: number;
  currentStep: number;
  steps: ProgressStep[];
  overallProgress: number; // 0-100
  status: "idle" | "preparing" | "uploading" | "transcribing" | "postprocessing" | "completed" | "error";
  startTime?: number;
  estimatedCompletionTime?: number;
  error?: string;
}

/**
 * 进度管理器
 */
export class ProgressManager {
  private activeProgress: Map<number, TranscriptionProgress> = new Map();
  private progressCallbacks: Map<number, (progress: TranscriptionProgress) => void> = new Map();
  private progressUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每500ms更新一次进度
    this.progressUpdateInterval = setInterval(() => {
      this.updateAllProgress();
    }, 500);
  }

  /**
   * 开始转录进度跟踪
   */
  startTranscription(fileId: number, steps: Partial<ProgressStep>[]): TranscriptionProgress {
    const defaultSteps: ProgressStep[] = [
      {
        id: "preparing",
        name: "准备转录",
        description: "正在准备音频文件和参数",
        progress: 0,
        estimatedDuration: 2000,
      },
      {
        id: "uploading",
        name: "上传音频",
        description: "正在上传音频文件到服务器",
        progress: 0,
        estimatedDuration: 5000,
      },
      {
        id: "transcribing",
        name: "转录音频",
        description: "正在进行语音识别和转录",
        progress: 0,
        estimatedDuration: 30000, // 30秒基础时间
      },
      {
        id: "postprocessing",
        name: "后处理",
        description: "正在优化转录结果和添加注释",
        progress: 0,
        estimatedDuration: 15000,
      },
    ];

    // 合并自定义步骤
    const mergedSteps = defaultSteps.map((defaultStep, index) => ({
      ...defaultStep,
      ...(steps[index] || {}),
    }));

    const progress: TranscriptionProgress = {
      fileId,
      totalSteps: mergedSteps.length,
      currentStep: 0,
      steps: mergedSteps,
      overallProgress: 0,
      status: "preparing",
      startTime: Date.now(),
      estimatedCompletionTime: Date.now() + mergedSteps.reduce((sum, step) => sum + (step.estimatedDuration || 0), 0),
    };

    this.activeProgress.set(fileId, progress);
    this.notifyProgressChange(fileId);

    console.log(`📊 开始进度跟踪 (文件ID: ${fileId})`);
    return progress;
  }

  /**
   * 更新步骤进度
   */
  updateStepProgress(
    fileId: number,
    stepId: string,
    progress: number,
    details?: { error?: string; description?: string }
  ): void {
    const transcriptionProgress = this.activeProgress.get(fileId);
    if (!transcriptionProgress) return;

    const step = transcriptionProgress.steps.find(s => s.id === stepId);
    if (!step) return;

    // 更新步骤
    step.progress = Math.max(0, Math.min(100, progress));

    if (details?.error) {
      step.error = details.error;
      transcriptionProgress.status = "error";
      transcriptionProgress.error = details.error;
    }

    if (details?.description) {
      step.description = details.description;
    }

    // 计算整体进度
    this.calculateOverallProgress(fileId);
    this.notifyProgressChange(fileId);

    console.log(`📈 更新进度 (文件ID: ${fileId}, 步骤: ${stepId}, 进度: ${progress}%)`);
  }

  /**
   * 移动到下一个步骤
   */
  moveToNextStep(fileId: number): void {
    const transcriptionProgress = this.activeProgress.get(fileId);
    if (!transcriptionProgress || transcriptionProgress.currentStep >= transcriptionProgress.totalSteps - 1) {
      return;
    }

    // 完成当前步骤
    const currentStep = transcriptionProgress.steps[transcriptionProgress.currentStep];
    if (currentStep) {
      currentStep.progress = 100;
      currentStep.endTime = Date.now();
    }

    // 移动到下一步
    transcriptionProgress.currentStep++;

    // 更新状态
    const nextStep = transcriptionProgress.steps[transcriptionProgress.currentStep];
    if (nextStep) {
      nextStep.startTime = Date.now();

      // 根据步骤ID更新状态
      switch (nextStep.id) {
        case "preparing":
          transcriptionProgress.status = "preparing";
          break;
        case "uploading":
          transcriptionProgress.status = "uploading";
          break;
        case "transcribing":
          transcriptionProgress.status = "transcribing";
          break;
        case "postprocessing":
          transcriptionProgress.status = "postprocessing";
          break;
      }
    }

    this.calculateOverallProgress(fileId);
    this.notifyProgressChange(fileId);
  }

  /**
   * 完成转录
   */
  completeTranscription(fileId: number): void {
    const transcriptionProgress = this.activeProgress.get(fileId);
    if (!transcriptionProgress) return;

    // 完成所有步骤
    transcriptionProgress.steps.forEach(step => {
      step.progress = 100;
      if (!step.endTime) {
        step.endTime = Date.now();
      }
    });

    transcriptionProgress.currentStep = transcriptionProgress.totalSteps - 1;
    transcriptionProgress.overallProgress = 100;
    transcriptionProgress.status = "completed";

    this.notifyProgressChange(fileId);
    console.log(`✅ 转录完成 (文件ID: ${fileId})`);
  }

  /**
   * 转录失败
   */
  failTranscription(fileId: number, error: string): void {
    const transcriptionProgress = this.activeProgress.get(fileId);
    if (!transcriptionProgress) return;

    transcriptionProgress.status = "error";
    transcriptionProgress.error = error;

    // 标记当前步骤为失败
    const currentStep = transcriptionProgress.steps[transcriptionProgress.currentStep];
    if (currentStep) {
      currentStep.error = error;
      currentStep.progress = 0;
    }

    this.notifyProgressChange(fileId);
    console.error(`❌ 转录失败 (文件ID: ${fileId}): ${error}`);
  }

  /**
   * 注册进度回调
   */
  onProgress(fileId: number, callback: (progress: TranscriptionProgress) => void): void {
    this.progressCallbacks.set(fileId, callback);

    // 立即通知当前进度
    const currentProgress = this.activeProgress.get(fileId);
    if (currentProgress) {
      callback(currentProgress);
    }
  }

  /**
   * 移除进度回调
   */
  offProgress(fileId: number): void {
    this.progressCallbacks.delete(fileId);
  }

  /**
   * 获取当前进度
   */
  getProgress(fileId: number): TranscriptionProgress | null {
    return this.activeProgress.get(fileId) || null;
  }

  /**
   * 计算整体进度
   */
  private calculateOverallProgress(fileId: number): void {
    const transcriptionProgress = this.activeProgress.get(fileId);
    if (!transcriptionProgress) return;

    const { steps, currentStep } = transcriptionProgress;
    let overallProgress = 0;

    // 计算已完成步骤的进度
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (i < currentStep) {
        // 已完成的步骤
        overallProgress += 100;
      } else if (i === currentStep) {
        // 当前步骤
        overallProgress += step.progress;
      }
      // 后续步骤不计入进度
    }

    transcriptionProgress.overallProgress = overallProgress / steps.length;

    // 更新预估完成时间
    if (transcriptionProgress.startTime) {
      const elapsed = Date.now() - transcriptionProgress.startTime;
      if (transcriptionProgress.overallProgress > 0) {
        const totalEstimated = (elapsed / transcriptionProgress.overallProgress) * 100;
        transcriptionProgress.estimatedCompletionTime = transcriptionProgress.startTime + totalEstimated;
      }
    }
  }

  /**
   * 通知进度变化
   */
  private notifyProgressChange(fileId: number): void {
    const progress = this.activeProgress.get(fileId);
    const callback = this.progressCallbacks.get(fileId);

    if (progress && callback) {
      try {
        callback(progress);
      } catch (error) {
        console.error("进度回调执行失败:", error);
      }
    }
  }

  /**
   * 更新所有进度（定时器调用）
   */
  private updateAllProgress(): void {
    // 更新时间相关的进度信息
    this.activeProgress.forEach((progress, fileId) => {
      if (progress.status === "transcribing" || progress.status === "postprocessing") {
        // 为长时间运行的步骤添加模拟进度
        const currentStep = progress.steps[progress.currentStep];
        if (currentStep && currentStep.progress > 0 && currentStep.progress < 95) {
          // 缓慢增加进度，给用户反馈
          const increment = Math.random() * 2; // 0-2%的随机增量
          currentStep.progress = Math.min(95, currentStep.progress + increment);
          this.calculateOverallProgress(fileId);
        }
      }
    });
  }

  /**
   * 清理进度跟踪
   */
  cleanup(fileId: number): void {
    this.activeProgress.delete(fileId);
    this.progressCallbacks.delete(fileId);
  }

  /**
   * 清理所有进度
   */
  cleanupAll(): void {
    this.activeProgress.clear();
    this.progressCallbacks.clear();
  }

  /**
   * 销毁进度管理器
   */
  destroy(): void {
    this.cleanupAll();

    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  /**
   * 获取活跃进度统计
   */
  getStats(): {
    totalActive: number;
    byStatus: Record<string, number>;
  } {
    const stats = {
      totalActive: this.activeProgress.size,
      byStatus: {} as Record<string, number>,
    };

    this.activeProgress.forEach(progress => {
      stats.byStatus[progress.status] = (stats.byStatus[progress.status] || 0) + 1;
    });

    return stats;
  }
}

// 全局进度管理器实例
export const progressManager = new ProgressManager();

/**
 * 便捷Hook: useTranscriptionProgress
 */
export function useTranscriptionProgress(fileId: number) {
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);

  useEffect(() => {
    // 注册进度回调
    progressManager.onProgress(fileId, setProgress);

    // 获取当前进度
    const currentProgress = progressManager.getProgress(fileId);
    if (currentProgress) {
      setProgress(currentProgress);
    }

    // 清理
    return () => {
      progressManager.offProgress(fileId);
    };
  }, [fileId]);

  return progress;
}

// 导出类型和实例
export type { TranscriptionProgress, ProgressStep };
