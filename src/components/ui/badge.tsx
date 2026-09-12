import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors border select-none",
  {
    variants: {
      variant: {
        default: "border-teal-200 bg-teal-50 text-[#007A72]",
        skyline: "border-sky-200 bg-sky-50 text-[#0284C7]",
        accent: "border-amber-200 bg-amber-50 text-amber-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        destructive: "border-rose-200 bg-rose-50 text-rose-800",
        secondary: "border-slate-200 bg-slate-100 text-slate-700",
        outline: "border-slate-300 bg-transparent text-slate-700",
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
