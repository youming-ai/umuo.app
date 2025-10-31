/**
 * FileUpload组件测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileUpload } from "@/components/features/file/FileUpload";

// Mock File API
global.File = class File {
  constructor(public chunks: any[], public name: string, public type: string) {}
} as any;

global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload({ target: this } as any);
    }, 0);
  }
} as any;

describe("FileUpload Component", () => {
  const mockOnFilesAdded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render upload area", () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    expect(screen.getByText(/拖拽文件到此处/i)).toBeInTheDocument();
    expect(screen.getByText(/或点击选择文件/i)).toBeInTheDocument();
    expect(screen.getByText(/支持 MP3、WAV、M4A 格式/i)).toBeInTheDocument();
  });

  it("should handle file selection via click", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const fileInput = screen.getByRole("button", { name: /选择文件/i });
    expect(fileInput).toBeInTheDocument();
  });

  it("should validate file types", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });

    // 模拟拖拽无效文件
    const dropzone = screen.getByTestId("dropzone");
    fireEvent.dragEnter(dropzone);
    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [invalidFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/不支持的文件格式/i)).toBeInTheDocument();
    });
  });

  it("should validate file size", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    // 创建超大文件 (100MB)
    const largeFile = new File(["x".repeat(100 * 1024 * 1024)], "large.mp3", { type: "audio/mpeg" });

    const dropzone = screen.getByTestId("dropzone");
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/文件过大/i)).toBeInTheDocument();
    });
  });

  it("should handle valid files", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const validFile = new File(["audio content"], "test.mp3", { type: "audio/mpeg" });

    const dropzone = screen.getByTestId("dropzone");
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [validFile],
      },
    });

    await waitFor(() => {
      expect(mockOnFilesAdded).toHaveBeenCalledWith([validFile]);
    });
  });

  it("should handle multiple files", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const files = [
      new File(["audio1"], "test1.mp3", { type: "audio/mpeg" }),
      new File(["audio2"], "test2.wav", { type: "audio/wav" }),
    ];

    const dropzone = screen.getByTestId("dropzone");
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files,
      },
    });

    await waitFor(() => {
      expect(mockOnFilesAdded).toHaveBeenCalledWith(files);
    });
  });

  it("should show loading state during upload", async () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const file = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
    const dropzone = screen.getByTestId("dropzone");

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    // 检查是否有上传指示器
    expect(screen.getByText(/正在处理文件/i)).toBeInTheDocument();
  });

  it("should handle drag events correctly", () => {
    render(<FileUpload onFilesAdded={mockOnFilesAdded} />);

    const dropzone = screen.getByTestId("dropzone");

    // 测试拖拽进入
    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveClass("border-primary");

    // 测试拖拽离开
    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass("border-primary");

    // 测试拖拽结束
    fireEvent.dragEnd(dropzone);
    expect(dropzone).not.toHaveClass("border-primary");
  });
});
