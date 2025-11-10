import React from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success";
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  const variantClasses = {
    default: "bg-background text-foreground border",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
    warning: "border-status-warning/50 text-status-warning [&>svg]:text-status-warning",
    success: "border-status-success/50 text-status-success [&>svg]:text-status-success"
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}
