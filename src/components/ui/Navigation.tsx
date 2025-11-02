"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/config/routes";
import { ThemeToggleIcon } from "./ThemeToggle";

export default function Navigation() {
  const pathname = usePathname();

  const navLinks = [
    {
      id: "home",
      label: "首页",
      icon: "home",
      href: ROUTES.HOME,
    },
    {
      id: "settings",
      label: "设置",
      icon: "settings",
      href: ROUTES.SETTINGS,
    },
    {
      id: "account",
      label: "用户中心",
      icon: "account_circle",
      href: ROUTES.ACCOUNT,
    },
  ] as const;

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="nav-container">
        {navLinks.map((item) => {
          const isActive =
            pathname === item.href.replace(/#.*/, "") ||
            (item.href.startsWith("/") && pathname.startsWith("/player") && item.href === "/");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-button ${isActive ? "active" : ""}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="material-symbols-outlined text-3xl">{item.icon}</span>
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
