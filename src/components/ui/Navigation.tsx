"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { ThemeToggleIcon } from "./ThemeToggle";

export default function Navigation() {
  const pathname = usePathname();

  const navLinks = [
    {
      id: "files",
      label: "文件",
      icon: "folder",
      href: ROUTES.HOME,
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

        {/* 主题切换按钮 */}
        <div className="flex items-center">
          <ThemeToggleIcon />
        </div>
      </div>
    </nav>
  );
}
