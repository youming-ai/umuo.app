import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";

// 转录响应类型
interface TranscriptionResponse {
  success: boolean;
  data: {
    status: string;
    text: string;
    language: string;
    duration?: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      wordTimestamps?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
  };
}

// 查询转录状态的查询键
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), "progress"] as const,
};

// 获取文件转录状态的查询 - 简化版本
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (transcript && typeof transcript.id === "number") {
        const segments = await db.segments.where("transcriptId").equals(transcript.id).toArray();
        return {
          transcript,
          segments,
        };
      }

      return {
        transcript: null,
        segments: [],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - 增加缓存时间以减少不必要的查询
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * 保存转录结果到数据库
 */
async function saveTranscriptionResults(
  fileId: number,
  data: TranscriptionResponse["data"],
): Promise<void> {
  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: data.text,
    language: data.language,
    processingTime: 0, // API route doesn't provide this info
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (data.segments && data.segments.length > 0) {
    const segments = data.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      wordTimestamps: segment.wordTimestamps || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.segments.bulkAdd(segments);
  }
}

// 转录操作的 mutation - 修复版本，使用服务器端 API 路由
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, language = "ja" }: { fileId: number; language?: string }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 转录开始：使用服务器端 API

      // 准备表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append("meta", JSON.stringify({ fileId: file.id?.toString() || "" }));

      try {
        // 调用服务器端 API 路由
        console.log("📡 发送转录请求:", {
          url: `/api/transcribe?fileId=${fileId}&language=${language}`,
          method: "POST",
          formDataKeys: Array.from(formData.keys()),
          fileName: file.name,
          fileSize: file.size,
        });

        const response = await fetch(`/api/transcribe?fileId=${fileId}&language=${language}`, {
          method: "POST",
          body: formData,
        });

        console.log("📡 API 响应状态:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ API 错误响应:", errorData);
          throw new Error(
            errorData.message || `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result: TranscriptionResponse = await response.json();

        if (!result.success) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        // 保存转录结果到数据库
        await saveTranscriptionResults(fileId, result.data);

        return result.data;
      } catch (error) {
        console.error("❌ 转录失败:", error);
        throw error;
      }
    },
    onSuccess: (_result, variables) => {
      // 转录完成并保存

      // 使查询缓存失效，触发重新查询
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });

      // 显示成功通知
      import("sonner").then(({ toast }) => {
        toast.success("转录完成");
      });
    },
    onError: (error, variables) => {
      console.error("❌ 转录失败:", error);

      // 显示错误通知
      import("sonner").then(({ toast }) => {
        toast.error(`转录失败: ${error instanceof Error ? error.message : "未知错误"}`);
      });

      // 刷新查询状态
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}
