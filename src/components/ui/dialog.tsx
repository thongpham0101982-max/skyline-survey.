"use client"

import * as React from "react";
import { useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
}

export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  maxWidth = "md"
}: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Box */}
      <div
        className={cn(
          "relative z-50 w-full rounded-2xl bg-white border border-slate-200/90 shadow-xl duration-200 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]",
          maxWidthClass
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              {title && <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  )
}
