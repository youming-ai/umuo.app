/**
 * 通用加载动画组件
 * 用于各种加载状态的统一显示
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const loadingSpinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
        xl: "h-8 w-8",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground",
        destructive: "text-destructive",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  },
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLOutputElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  label?: string;
}

export function LoadingSpinner({ className, size, variant, label, ...props }: LoadingSpinnerProps) {
  return (
    <output
      className={cn("flex items-center gap-2", className)}
      aria-label={label || "Loading"}
      {...props}
    >
      <div className={loadingSpinnerVariants({ size, variant })} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </output>
  );
}
