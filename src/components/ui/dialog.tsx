"use client"

import * as React from "react";
import { useEffect, createContext, useContext } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = createContext<DialogContextType | null>(null)

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  footer?: React.ReactNode
  disableBackdropClick?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
}

export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  footer,
  disableBackdropClick = false,
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

  // If using subcomponents directly (e.g. <DialogContent>), pass context
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth]

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {/* If simple prop mode with title/description/footer */}
      {title !== undefined || description !== undefined || footer !== undefined ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => {
              if (!disableBackdropClick) onOpenChange(false)
            }}
          />
          <div
            className={cn(
              "relative z-50 w-full rounded-2xl bg-white border border-slate-200/90 shadow-xl duration-200 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]",
              maxWidthClass
            )}
          >
            {(title || description) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  {title && <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
                  {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Đóng hộp thoại"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
                {footer}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => {
              if (!disableBackdropClick) onOpenChange(false)
            }}
          />
          {children}
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function DialogContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(DialogContext)
  return (
    <div
      className={cn(
        "relative z-50 w-full rounded-2xl bg-white border border-slate-200/90 shadow-xl duration-200 animate-in zoom-in-95 overflow-hidden flex flex-col",
        className
      )}
      {...props}
    >
      {ctx && (
        <button
          type="button"
          onClick={() => ctx.onOpenChange(false)}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer z-10"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  )
}

export function DialogHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-left mb-4", className)} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-bold text-slate-900 tracking-tight", className)} {...props}>
      {children}
    </h3>
  )
}

export function DialogDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-slate-500", className)} {...props}>
      {children}
    </p>
  )
}

export function DialogFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-end gap-2 pt-4 border-t border-slate-100", className)} {...props}>
      {children}
    </div>
  )
}
