/**
 * 通用环形进度条组件
 * 用于转录进度、上传进度等的显示
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressRingVariants = cva("relative inline-flex items-center justify-center", {
  variants: {
    size: {
      xs: "h-8 w-8",
      sm: "h-10 w-10",
      md: "h-12 w-12",
      lg: "h-16 w-16",
      xl: "h-20 w-20",
    },
    thickness: {
      thin: "stroke-1",
      normal: "stroke-2",
      thick: "stroke-3",
    },
  },
  defaultVariants: {
    size: "md",
    thickness: "normal",
  },
});

export interface ProgressRingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressRingVariants> {
  value: number; // 0-100
  max?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
}

export function ProgressRing({
  className,
  size,
  thickness,
  value,
  max = 100,
  strokeWidth,
  showLabel = false,
  label,
  color = "currentColor",
  ...props
}: ProgressRingProps) {
  const radius =
    size === "xs" ? 12 : size === "sm" ? 16 : size === "md" ? 20 : size === "lg" ? 28 : 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const actualStrokeWidth =
    strokeWidth || (thickness === "thin" ? 2 : thickness === "thick" ? 4 : 3);
  const accessibleLabel = label || `进度 ${Math.round(progress)}%`;

  return (
    <div className={cn(progressRingVariants({ size, thickness }), className)} {...props}>
      <svg
        className="transform -rotate-90"
        width={radius * 2}
        height={radius * 2}
        role="img"
        aria-label={accessibleLabel}
      >
        <title>{accessibleLabel}</title>
        {/* 背景圆环 */}
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          stroke="currentColor"
          strokeWidth={actualStrokeWidth}
          fill="none"
          className="text-muted opacity-20"
        />
        {/* 进度圆环 */}
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          stroke={color}
          strokeWidth={actualStrokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium tabular-nums">
            {label || `${Math.round(progress)}%`}
          </span>
        </div>
      )}
    </div>
  );
}
