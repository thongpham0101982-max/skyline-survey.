"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isError, prefixIcon, suffixIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {prefixIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none size-4 flex items-center justify-center">
            {prefixIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-9 sm:h-10 w-full rounded-xl border bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium transition-all outline-none",
            prefixIcon && "pl-9",
            suffixIcon && "pr-9",
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
        {suffixIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 size-4 flex items-center justify-center">
            {suffixIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
