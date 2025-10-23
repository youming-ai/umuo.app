"use client";

import { Contrast, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/contexts/ThemeContext";

// 导航栏主题切换按钮（只显示图标）
export function ThemeToggleIcon() {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-5 w-5" />;
    }
    if (theme === "high-contrast") {
      return <Contrast className="h-5 w-5" />;
    }
    return theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      title="切换主题"
    >
      {getIcon()}
      <span className="sr-only">切换主题</span>
    </button>
  );
}
