"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/lib/routes";

export default function Navigation() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const themeIcon = useMemo(() => {
    return resolvedTheme === "dark" ? "light_mode" : "dark_mode";
  }, [resolvedTheme]);

  const themeLabel = useMemo(() => {
    return resolvedTheme === "dark" ? "切换至浅色主题" : "切换至暗色主题";
  }, [resolvedTheme]);

  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // 确保在客户端才渲染主题相关内容
  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    {
      id: "files",
      label: "文件",
      icon: "folder",
      href: ROUTES.HOME,
    },
    {
      id: "health-check",
      label: "健康检查",
      icon: "health_and_safety",
      href: ROUTES.HEALTH_CHECK,
    },
    {
      id: "account",
      label: "用户中心",
      icon: "account_circle",
      href: ROUTES.ACCOUNT,
    },
    {
      id: "settings",
      label: "设置",
      icon: "settings",
      href: ROUTES.SETTINGS,
    },
  ] as const;

  const actionItems = [
    {
      id: "theme",
      label: themeLabel,
      icon: themeIcon,
      onClick: toggleTheme,
      pressed: resolvedTheme === "dark",
    },
  ] as const;

  if (!mounted) {
    return (
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1 rounded-full bg-surface/90 backdrop-blur-sm p-1.5 shadow-lg border-2 border-border/80">
          {[...navLinks, ...actionItems].map((item) => (
            <div key={item.id} className="flex h-11 w-11 items-center justify-center rounded-full">
              <div className="h-6 w-6" />
            </div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 rounded-full bg-surface/90 backdrop-blur-sm p-1.5 shadow-lg border-2 border-border/80">
        {navLinks.map((item) => {
          const isActive =
            pathname === item.href.replace(/#.*/, "") ||
            (item.href.startsWith("/") && pathname.startsWith("/player") && item.href === "/");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-primary)]/80 hover:bg-[var(--color-primary)]/10 transition-colors ${
                isActive ? "bg-[var(--color-primary)]/10" : ""
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            </Link>
          );
        })}

        {actionItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-primary)]/80 hover:bg-[var(--color-primary)]/10 transition-colors"
            title={item.label}
            aria-label={item.label}
            aria-pressed={item.pressed}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
