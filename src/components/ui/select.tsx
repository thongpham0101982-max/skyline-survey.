"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isError?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, isError, disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-9 sm:h-10 w-full appearance-none rounded-xl border bg-white px-3.5 py-2 pr-8 text-xs sm:text-sm text-slate-800 font-medium transition-all outline-none cursor-pointer",
            isError
              ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
              : "border-slate-200 hover:border-slate-300 focus:border-[#003B3A] focus:ring-2 focus:ring-[#003B3A]/15",
            disabled && "cursor-not-allowed opacity-50 bg-slate-50",
            className
          )}
          disabled={disabled}
          ref={ref}
          aria-invalid={isError ? "true" : undefined}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
