import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { FileRow, Segment, TranscriptRow } from "@/types/database";

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
    }>;
  };
}

// 查询转录状态的查询键
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), "progress"] as const,
};

// 获取文件转录状态的查询
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
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 转录操作的 mutation
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, language = "ja" }: { file: FileRow; language?: string }) => {
      if (!file.blob || !file.id) {
        throw new Error("文件不存在或缺少ID");
      }

      const audioFile = new File([file.blob], file.name, { type: file.type || "audio/mpeg" });

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("meta", JSON.stringify({ fileId: file.id.toString() }));

      console.log("发送转录请求:", {
        url: `/api/transcribe?language=${language}&fileId=${file.id}`,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        fileId: file.id,
      });

      let response: Response;
      try {
        response = await fetch(`/api/transcribe?language=${language}&fileId=${file.id}`, {
          method: "POST",
          body: formData,
        });
      } catch (fetchError) {
        console.error("网络请求失败:", fetchError);
        throw new Error(
          `网络连接失败: ${fetchError instanceof Error ? fetchError.message : "未知网络错误"}`,
        );
      }

      console.log("转录API响应状态:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        let errorData: unknown;
        try {
          const responseText = await response.text();
          console.log("错误响应原文:", responseText);
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn("解析错误响应JSON失败:", parseError);
          errorData = { rawResponse: "解析失败" };
        }

        const errorMessage =
          (errorData as any)?.error?.message ||
          (errorData as any)?.message ||
          (response.status
            ? `转录失败: ${response.status} ${response.statusText}`
            : "转录失败: 未知网络错误");
        console.error("转录错误详情:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage,
        });
        throw new Error(errorMessage);
      }

      const result: TranscriptionResponse = await response.json();
      console.log("转录结果解析成功:", {
        status: result.success,
        hasData: !!result.data,
        textLength: result.data?.text?.length || 0,
        segmentsCount: result.data?.segments?.length || 0,
      });

      return { file, result };
    },
    onSuccess: async ({ file, result }) => {
      console.log("转录完成，开始保存数据并调用后处理:", {
        fileId: file.id,
        textLength: result.data.text.length,
      });

      // 创建转录记录
      const transcriptRecord: Omit<TranscriptRow, "id"> = {
        fileId: file.id ?? 0,
        status: "processing",
        text: result.data.text,
        rawText: result.data.text,
        language: result.data.language || "ja",
        duration: result.data.duration,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const transcriptId = await db.transcripts.add(transcriptRecord);

      // 保存字幕段
      let savedSegments: Segment[] = [];
      if (result.data.segments && result.data.segments.length > 0) {
        const segmentRecords: Omit<Segment, "id">[] = result.data.segments.map((segment) => ({
          transcriptId,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          wordTimestamps: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const segmentIds = await db.segments.bulkAdd(segmentRecords);
        const fetchedSegments = await db.segments.bulkGet(segmentIds);
        savedSegments = fetchedSegments.filter(
          (segment): segment is Segment => segment !== undefined,
        );
        console.log("字幕段保存成功:", { count: savedSegments.length });
      }

      // 尝试调用文本后处理API
      try {
        if (result.data.segments && result.data.segments.length > 0) {
          console.log("开始调用文本后处理API");

          const postProcessResponse = await fetch("/api/postprocess", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              segments: result.data.segments,
              language: result.data.language || "ja",
              targetLanguage: "zh", // 默认目标语言为中文
              enableAnnotations: true,
              enableFurigana: true,
            }),
          });

          if (postProcessResponse.ok) {
            const postProcessResult = await postProcessResponse.json();
            console.log("文本后处理成功:", {
              success: postProcessResult.success,
              processedSegments: postProcessResult.data?.processedSegments,
            });

            // 更新数据库中的字幕段，添加后处理结果
            if (postProcessResult.success && postProcessResult.data?.segments) {
              const processedSegments = postProcessResult.data.segments;

              for (let i = 0; i < savedSegments.length && i < processedSegments.length; i++) {
                const segmentId = savedSegments[i]?.id;
                if (segmentId && typeof segmentId === "number") {
                  await db.segments.update(segmentId, {
                    normalizedText: processedSegments[i].normalizedText,
                    translation: processedSegments[i].translation,
                    annotations: processedSegments[i].annotations,
                    furigana: processedSegments[i].furigana,
                    updatedAt: new Date(),
                  });
                }
              }

              console.log("字幕段后处理结果保存成功");
            }
          } else {
            console.warn("文本后处理失败，但转录数据已保存:", {
              status: postProcessResponse.status,
              statusText: postProcessResponse.statusText,
            });
          }
        }
      } catch (postProcessError) {
        console.warn("文本后处理API调用失败，但转录数据已保存:", postProcessError);
        // 不抛出错误，确保转录数据仍然有效
      }

      // 更新转录状态为完成
      await db.transcripts.update(transcriptId, { status: "completed", updatedAt: new Date() });

      console.log("转录流程全部完成:", { fileId: file.id, transcriptId });

      // 使查询缓存失效，触发重新查询
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.forFile(file.id ?? 0) });
    },
    onError: (error, variables) => {
      console.error("转录失败:", error);
      // 即使失败也要刷新查询状态
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.file.id ?? 0),
      });
    },
  });
}

// 删除转录记录的 mutation
export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

      for (const transcript of transcripts) {
        if (typeof transcript.id === "number") {
          // 删除相关的字幕段
          await db.segments.where("transcriptId").equals(transcript.id).delete();
          // 删除转录记录
          await db.transcripts.delete(transcript.id);
        }
      }
    },
    onSuccess: (_, { fileId }) => {
      // 使查询缓存失效
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.forFile(fileId) });
    },
  });
}

// 获取所有文件的转录状态摘要
export function useTranscriptionSummary(fileIds: number[]) {
  return useQuery({
    queryKey: [...transcriptionKeys.all, "summary", fileIds],
    queryFn: async () => {
      const summaries = await Promise.all(
        fileIds.map(async (fileId) => {
          const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
          const transcript = transcripts.length > 0 ? transcripts[0] : null;

          return {
            fileId,
            status: transcript?.status || null,
            hasTranscript: !!transcript,
            updatedAt: transcript?.updatedAt || null,
          };
        }),
      );

      return summaries;
    },
    staleTime: 1000 * 5, // 5 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
  });
}
