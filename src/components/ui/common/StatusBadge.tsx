/**
 * 通用状态徽章组件
 * 用于显示文件、转录等状态的统一组件
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        // 文件状态
        uploaded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",

        // 转录状态
        transcribing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        postprocessing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",

        // 通用状态
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      status: "info",
      size: "md",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function StatusBadge({ className, status, size, icon, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status, size }), className)}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}
