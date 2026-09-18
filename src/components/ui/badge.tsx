import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-normal transition-colors border select-none",
  {
    variants: {
      variant: {
        default: "border-sky-200/70 bg-sky-50 text-sky-700",
        skyline: "border-sky-200/80 bg-sky-50 text-[#0284C7]",
        accent: "border-amber-200/70 bg-amber-50 text-amber-700",
        success: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
        destructive: "border-rose-200/70 bg-rose-50 text-rose-700",
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

export { Badge, badgeVariants }
