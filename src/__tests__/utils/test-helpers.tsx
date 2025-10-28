import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 创建测试用的 QueryClient
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// 简化的 Provider 包装器
const TestProviders = ({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}) => {
  const testQueryClient = queryClient || createTestQueryClient();
  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
};

// 自定义渲染函数
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    queryClient?: QueryClient;
  },
) => {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => <TestProviders queryClient={queryClient}>{children}</TestProviders>,
    ...renderOptions,
  });
};

// 重新导出所有 testing-library 的工具
export * from "@testing-library/react";
export { customRender as render };

// 专门的文件上传测试工具
export const createFileDropEvent = (files: File[]) => {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
    },
  };
};

// 音频播放测试工具
export const createMockAudioElement = () => {
  const audio = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    src: "",
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    paused: true,
    ended: false,
    loop: false,
    playbackRate: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as any;

  Object.defineProperty(audio, "readyState", {
    value: 4, // HAVE_ENOUGH_DATA
    writable: true,
  });

  return audio;
};

// 创建模拟文件
export const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const bits = new Array(size).fill(0);
  return new File(bits, name, { type });
};

// 创建模拟转录任务
export const createMockTranscriptionTask = (overrides: Partial<any> = {}) => ({
  id: "test-task-1",
  fileId: 1,
  fileName: "test-audio.mp3",
  fileSize: 1024,
  status: "completed",
  priority: "normal",
  progress: {
    fileId: 1,
    status: "completed",
    progress: 100,
    message: "转录完成",
    createdAt: new Date(),
    startedAt: new Date(),
    completedAt: new Date(),
    estimatedDuration: 120,
    actualDuration: 115,
  },
  result: {
    text: "这是一个测试转录结果",
    duration: 120,
    segmentsCount: 10,
    language: "ja",
    model: "whisper-large-v3-turbo",
    processingTime: 115000,
  },
  createdAt: new Date(),
  ...overrides,
});

// 异步测试工具
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// 事件触发工具
export const fireKeyboardEvent = (element: HTMLElement, eventType: string, key: string) => {
  const event = new KeyboardEvent(eventType, { key });
  element.dispatchEvent(event);
};

export const fireMouseEvent = (
  element: HTMLElement,
  eventType: string,
  options: MouseEventInit = {},
) => {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
};

// 导出常用工具
export { vi };
