"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isError, disabled, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium transition-all outline-none resize-y",
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
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
