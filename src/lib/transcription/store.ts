/**
 * 转录状态管理系统
 * 提供统一的状态管理和事件系统
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  TranscriptionTask,
  TranscriptionQueueState,
  TranscriptionStatus,
  TranscriptionPriority,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionEvent,
  TranscriptionUIState,
  ITranscriptionManager,
  TranscriptionError
} from '@/types/transcription';

/**
 * 转录状态 Store - Zustand 实现
 */
interface TranscriptionState {
  // 任务存储
  tasks: Map<string, TranscriptionTask>;
  tasksByFileId: Map<number, string>; // fileId -> taskId 映射

  // 队列状态
  queueState: TranscriptionQueueState;

  // UI 状态
  uiState: TranscriptionUIState;

  // 事件监听器
  eventListeners: Map<string, Set<Function>>;

  // 系统配置
  config: {
    maxConcurrency: number;
    defaultOptions: TranscriptionOptions;
    autoRetry: boolean;
    maxRetries: number;
  };
}

interface TranscriptionActions {
  // 任务管理
  addTask: (fileId: number, fileName: string, fileSize: number, options?: TranscriptionOptions) => string;
  updateTask: (taskId: string, updates: Partial<TranscriptionTask>) => void;
  removeTask: (taskId: string) => boolean;
  getTask: (taskId: string) => TranscriptionTask | null;
  getTaskByFileId: (fileId: number) => TranscriptionTask | null;

  // 队列管理
  updateQueueState: () => void;
  setMaxConcurrency: (max: number) => void;

  // 任务状态操作
  startTask: (taskId: string) => void;
  completeTask: (taskId: string, result: any) => void;
  failTask: (taskId: string, error: Error) => void;
  cancelTask: (taskId: string) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  updateTaskProgress: (taskId: string, progress: number, message?: string) => void;

  // UI 控制
  setUIState: (updates: Partial<TranscriptionUIState>) => void;
  toggleTranscriptionManager: () => void;

  // 事件系统
  emit: (event: TranscriptionEvent) => void;
  on: (eventType: string, callback: Function) => () => void;
  off: (eventType: string, callback: Function) => void;

  // 批量操作
  clearCompletedTasks: () => void;
  clearAllTasks: () => void;
  retryFailedTasks: () => void;
}

export const useTranscriptionStore = create<TranscriptionState & TranscriptionActions>()(
  devtools(
    (set, get) => ({
      // 初始状态
      tasks: new Map(),
      tasksByFileId: new Map(),

      queueState: {
        queued: [],
        processing: [],
        completed: [],
        failed: [],
        isProcessing: false,
        maxConcurrency: 2,
        currentConcurrency: 0,
        stats: {
          totalProcessed: 0,
          successCount: 0,
          failureCount: 0,
          averageProcessingTime: 0,
          queueLength: 0,
        },
      },

      uiState: {
        showTranscriptionManager: false,
        showProgressDetails: true,
        autoStartTranscription: true,
        defaultLanguage: 'ja',
        defaultPriority: 'normal',
        showNotifications: true,
        filterBy: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },

      eventListeners: new Map(),

      config: {
        maxConcurrency: 2,
        defaultOptions: {
          language: 'ja',
          autoStart: true,
          priority: 'normal',
          enablePostProcessing: true,
          maxRetries: 2,
          timeoutMs: 300000,
        },
        autoRetry: true,
        maxRetries: 2,
      },

      // 任务管理方法
      addTask: (fileId: number, fileName: string, fileSize: number, options?: TranscriptionOptions) => {
        const state = get();
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 检查文件是否已有任务
        if (state.tasksByFileId.has(fileId)) {
          const existingTaskId = state.tasksByFileId.get(fileId)!;
          const existingTask = state.tasks.get(existingTaskId);
          if (existingTask && existingTask.status !== 'failed' && existingTask.status !== 'completed') {
            throw new TranscriptionError(
              'File already has an active transcription task',
              'DUPLICATE_TASK',
              { fileId, existingTaskId }
            );
          }
        }

        const now = new Date();
        const task: TranscriptionTask = {
          id: taskId,
          fileId,
          fileName,
          fileSize,
          status: 'idle',
          priority: options?.priority || state.config.defaultOptions.priority || 'normal',
          progress: {
            fileId,
            status: 'idle',
            progress: 0,
            createdAt: now,
            options: { ...state.config.defaultOptions, ...options },
          },
        };

        set((prevState) => {
          const newTasks = new Map(prevState.tasks);
          const newTasksByFileId = new Map(prevState.tasksByFileId);

          newTasks.set(taskId, task);
          newTasksByFileId.set(fileId, taskId);

          return {
            tasks: newTasks,
            tasksByFileId: newTasksByFileId,
          };
        });

        // 发出事件
        get().emit({ type: 'task_added', taskId, task });

        // 如果配置为自动开始，将任务加入队列
        if (task.options.autoStart !== false) {
          get().startTask(taskId);
        }

        return taskId;
      },

      updateTask: (taskId: string, updates: Partial<TranscriptionTask>) => {
        set((prevState) => {
          const newTasks = new Map(prevState.tasks);
          const task = newTasks.get(taskId);

          if (!task) return prevState;

          const updatedTask = { ...task, ...updates };
          newTasks.set(taskId, updatedTask);

          return { tasks: newTasks };
        });

        // 更新队列状态
        get().updateQueueState();

        // 发出事件
        const updatedTask = get().getTask(taskId);
        if (updatedTask) {
          get().emit({ type: 'task_progress', taskId, progress: updatedTask.progress.progress });
        }
      },

      removeTask: (taskId: string) => {
        const task = get().getTask(taskId);
        if (!task) return false;

        // 不能移除正在处理的任务
        if (task.status === 'processing') {
          throw new TranscriptionError(
            'Cannot remove task that is currently processing',
            'TASK_IN_PROGRESS',
            { taskId }
          );
        }

        set((prevState) => {
          const newTasks = new Map(prevState.tasks);
          const newTasksByFileId = new Map(prevState.tasksByFileId);

          newTasks.delete(taskId);
          newTasksByFileId.delete(task.fileId);

          return {
            tasks: newTasks,
            tasksByFileId: newTasksByFileId,
          };
        });

        get().updateQueueState();
        return true;
      },

      getTask: (taskId: string) => {
        return get().tasks.get(taskId) || null;
      },

      getTaskByFileId: (fileId: number) => {
        const taskId = get().tasksByFileId.get(fileId);
        return taskId ? get().tasks.get(taskId) || null : null;
      },

      // 队列管理
      updateQueueState: () => {
        const { tasks } = get();
        const allTasks = Array.from(tasks.values());

        const queued = allTasks.filter(t => t.status === 'queued' || t.status === 'idle');
        const processing = allTasks.filter(t => t.status === 'processing');
        const completed = allTasks
          .filter(t => t.status === 'completed')
          .sort((a, b) => b.progress.completedAt!.getTime() - a.progress.completedAt!.getTime())
          .slice(0, 10); // 只保留最近10个完成的任务
        const failed = allTasks
          .filter(t => t.status === 'failed')
          .sort((a, b) => b.progress.createdAt.getTime() - a.progress.createdAt.getTime())
          .slice(0, 10); // 只保留最近10个失败的任务

        // 计算统计信息
        const allCompletedTasks = allTasks.filter(t => t.status === 'completed');
        const allFailedTasks = allTasks.filter(t => t.status === 'failed');

        const stats = {
          totalProcessed: allCompletedTasks.length + allFailedTasks.length,
          successCount: allCompletedTasks.length,
          failureCount: allFailedTasks.length,
          averageProcessingTime: calculateAverageProcessingTime(allCompletedTasks),
          queueLength: queued.length,
        };

        set((prevState) => ({
          queueState: {
            ...prevState.queueState,
            queued,
            processing,
            completed,
            failed,
            isProcessing: processing.length > 0,
            currentConcurrency: processing.length,
            stats,
          },
        }));

        // 发出队列更新事件
        get().emit({
          type: 'queue_updated',
          state: get().queueState
        });
      },

      setMaxConcurrency: (max: number) => {
        set((prevState) => ({
          config: { ...prevState.config, maxConcurrency: max },
          queueState: { ...prevState.queueState, maxConcurrency: max },
        }));
      },

      // 任务状态操作
      startTask: (taskId: string) => {
        const task = get().getTask(taskId);
        if (!task) return;

        const now = new Date();
        get().updateTask(taskId, {
          status: 'queued',
          progress: {
            ...task.progress,
            status: 'queued',
            startedAt: now,
          },
        });
      },

      completeTask: (taskId: string, result: any) => {
        const task = get().getTask(taskId);
        if (!task) return;

        const now = new Date();
        const actualDuration = task.progress.startedAt
          ? (now.getTime() - task.progress.startedAt.getTime()) / 1000
          : 0;

        get().updateTask(taskId, {
          status: 'completed',
          progress: {
            ...task.progress,
            status: 'completed',
            progress: 100,
            message: '转录完成',
            completedAt: now,
            actualDuration,
            result: {
              text: result.text || '',
              duration: result.duration,
              segmentsCount: result.segments?.length || 0,
              language: result.language,
            },
          },
        });

        get().emit({
          type: 'task_completed',
          taskId,
          task: get().getTask(taskId)!,
          result
        });
      },

      failTask: (taskId: string, error: Error) => {
        const task = get().getTask(taskId);
        if (!task) return;

        const now = new Date();
        const actualDuration = task.progress.startedAt
          ? (now.getTime() - task.progress.startedAt.getTime()) / 1000
          : 0;

        get().updateTask(taskId, {
          status: 'failed',
          progress: {
            ...task.progress,
            status: 'failed',
            message: error.message,
            error: error.message,
            completedAt: now,
            actualDuration,
          },
        });

        get().emit({
          type: 'task_failed',
          taskId,
          task: get().getTask(taskId)!,
          error
        });
      },

      cancelTask: (taskId: string) => {
        const task = get().getTask(taskId);
        if (!task) return;

        get().updateTask(taskId, {
          status: 'cancelled',
          progress: {
            ...task.progress,
            status: 'cancelled',
            message: '用户取消',
          },
        });

        get().emit({
          type: 'task_cancelled',
          taskId,
          task: get().getTask(taskId)!
        });
      },

      pauseTask: (taskId: string) => {
        const task = get().getTask(taskId);
        if (!task) return;

        get().updateTask(taskId, {
          status: 'paused',
          progress: {
            ...task.progress,
            status: 'paused',
            message: '已暂停',
          },
        });
      },

      resumeTask: (taskId: string) => {
        const task = get().getTask(taskId);
        if (!task || task.status !== 'paused') return;

        get().startTask(taskId);
      },

      updateTaskProgress: (taskId: string, progress: number, message?: string) => {
        const task = get().getTask(taskId);
        if (!task) return;

        get().updateTask(taskId, {
          progress: {
            ...task.progress,
            progress: Math.max(0, Math.min(100, progress)),
            message: message || task.progress.message,
          },
        });
      },

      // UI 控制
      setUIState: (updates: Partial<TranscriptionUIState>) => {
        set((prevState) => ({
          uiState: { ...prevState.uiState, ...updates },
        }));
      },

      toggleTranscriptionManager: () => {
        set((prevState) => ({
          uiState: {
            ...prevState.uiState,
            showTranscriptionManager: !prevState.uiState.showTranscriptionManager,
          },
        }));
      },

      // 事件系统
      emit: (event: TranscriptionEvent) => {
        const { eventListeners } = get();
        const listeners = eventListeners.get(event.type);

        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback(event);
            } catch (error) {
              console.error(`Error in event listener for ${event.type}:`, error);
            }
          });
        }
      },

      on: (eventType: string, callback: Function) => {
        const { eventListeners } = get();

        if (!eventListeners.has(eventType)) {
          eventListeners.set(eventType, new Set());
        }

        eventListeners.get(eventType)!.add(callback);

        // 返回取消监听的函数
        return () => {
          const listeners = eventListeners.get(eventType);
          if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
              eventListeners.delete(eventType);
            }
          }
        };
      },

      off: (eventType: string, callback: Function) => {
        const { eventListeners } = get();
        const listeners = eventListeners.get(eventType);

        if (listeners) {
          listeners.delete(callback);
        }
      },

      // 批量操作
      clearCompletedTasks: () => {
        const { tasks } = get();
        const tasksToRemove = Array.from(tasks.entries())
          .filter(([_, task]) => task.status === 'completed')
          .map(([taskId]) => taskId);

        tasksToRemove.forEach(taskId => {
          get().removeTask(taskId);
        });
      },

      clearAllTasks: () => {
        set({
          tasks: new Map(),
          tasksByFileId: new Map(),
        });
        get().updateQueueState();
      },

      retryFailedTasks: () => {
        const { tasks } = get();
        const failedTasks = Array.from(tasks.values())
          .filter(task => task.status === 'failed');

        failedTasks.forEach(task => {
          get().startTask(task.id);
        });
      },
    }),
    {
      name: 'transcription-store',
    }
  )
);

// 辅助函数：计算平均处理时间
function calculateAverageProcessingTime(completedTasks: TranscriptionTask[]): number {
  if (completedTasks.length === 0) return 0;

  const totalTime = completedTasks.reduce((sum, task) => {
    return sum + (task.progress.actualDuration || 0);
  }, 0);

  return totalTime / completedTasks.length;
}

// 导出选择器
export const useTranscriptionTasks = () =>
  useTranscriptionStore(state => Array.from(state.tasks.values()));

export const useTranscriptionQueue = () =>
  useTranscriptionStore(state => state.queueState);

export const useTranscriptionConfig = () =>
  useTranscriptionStore(state => state.config);

export const useTranscriptionUI = () =>
  useTranscriptionStore(state => state.uiState);

// 便捷 hooks
export const useTaskByFileId = (fileId: number) =>
  useTranscriptionStore(state => state.getTaskByFileId(fileId));

export const useTasksByStatus = (status: TranscriptionStatus) =>
  useTranscriptionStore(state =>
    Array.from(state.tasks.values()).filter(task => task.status === status)
  );
