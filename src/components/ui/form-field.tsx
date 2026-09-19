import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  helpText?: string
  id?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  required,
  error,
  helpText,
  id,
  className,
  children
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-700 tracking-tight select-none"
          >
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        </div>
      )}
      <div className="relative">{children}</div>
      {error ? (
        <p className="text-[11px] font-medium text-rose-600 animate-in fade-in-50 leading-tight">
          {error}
        </p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-500 leading-tight">
          {helpText}
        </p>
      ) : null}
    </div>
  )
}
