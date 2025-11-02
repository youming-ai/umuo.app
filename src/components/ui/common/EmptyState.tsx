/**
 * 通用空状态组件
 * 用于文件列表、搜索结果等的空状态显示
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva("flex flex-col items-center justify-center p-8 text-center", {
  variants: {
    variant: {
      default: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
      strong: "text-foreground",
    },
    size: {
      sm: "p-4",
      md: "p-8",
      lg: "p-12",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  className,
  variant,
  size,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ variant, size }), className)} {...props}>
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}

      <h3 className="text-lg font-medium mb-2">{title}</h3>

      {description && <p className="text-sm max-w-sm mb-6">{description}</p>}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
