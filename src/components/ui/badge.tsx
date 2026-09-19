import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-normal transition-colors border select-none",
  {
    variants: {
      variant: {
        default: "border-sky-200/70 bg-sky-50 text-sky-700",
        primary: "border-[#003B3A]/30 bg-[#003B3A]/10 text-[#003B3A]",
        pine: "border-[#003B3A]/30 bg-[#003B3A]/10 text-[#003B3A]",
        skyline: "border-sky-200/80 bg-sky-50 text-[#0284C7]",
        accent: "border-amber-200/70 bg-amber-50 text-amber-700",
        success: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
        destructive: "border-rose-200/70 bg-rose-50 text-rose-700",
        error: "border-rose-200/70 bg-rose-50 text-rose-700",
        warning: "border-amber-200/70 bg-amber-50 text-amber-700",
        info: "border-sky-200/70 bg-sky-50 text-sky-700",
        information: "border-sky-200/70 bg-sky-50 text-sky-700",
        neutral: "border-slate-200/80 bg-slate-100 text-slate-700",
        secondary: "border-slate-200/80 bg-slate-50 text-slate-600",
        outline: "border-slate-200 bg-transparent text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export type SemanticStatus =
  | "neutral"
  | "information"
  | "info"
  | "warning"
  | "success"
  | "error"
  | "danger"
  | string;

export function mapBusinessStatusToVariant(status: string): "neutral" | "information" | "warning" | "success" | "error" {
  const s = (status || "").trim().toLowerCase();
  if (s.includes("chưa") || s.includes("nháp") || s.includes("draft") || s.includes("pending_setup")) return "neutral";
  if (s.includes("đang") || s.includes("tiến hành") || s.includes("in_progress") || s.includes("active")) return "information";
  if (s.includes("chờ") || s.includes("đợi") || s.includes("waiting") || s.includes("review")) return "warning";
  if (s.includes("hoàn thành") || s.includes("đạt") || s.includes("tốt") || s.includes("approved") || s.includes("success") || s.includes("completed")) return "success";
  if (s.includes("quá hạn") || s.includes("từ chối") || s.includes("chưa đạt") || s.includes("hủy") || s.includes("rejected") || s.includes("error") || s.includes("overdue") || s.includes("sos")) return "error";
  return "neutral";
}

export function StatusBadge({
  status,
  label,
  className
}: {
  status: SemanticStatus;
  label?: string;
  className?: string;
}) {
  const variant = mapBusinessStatusToVariant(status);
  return (
    <Badge variant={variant} className={className}>
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0",
          variant === "success" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "error" && "bg-rose-500",
          variant === "information" && "bg-sky-500",
          variant === "neutral" && "bg-slate-400"
        )}
      />
      <span>{label || status}</span>
    </Badge>
  );
}

export { Badge, badgeVariants }
