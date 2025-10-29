import { Suspense } from "react";
import FileManager from "@/components/features/file/FileManager";
import StatsCards from "@/components/features/file/StatsCards";
import { PageLoadingState } from "@/components/ui/LoadingState";
import Navigation from "@/components/ui/Navigation";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 mt-20">
        <Suspense fallback={<PageLoadingState />}>
          {/* 页面标题 */}
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">文件管理</h1>
                <p className="text-muted-foreground">管理您的音频文件和转录任务</p>
              </div>
            </div>

            {/* 统计卡片 */}
            <StatsCards />
          </div>

          {/* 文件管理器 */}
          <FileManager />
        </Suspense>
      </main>
    </div>
  );
}
