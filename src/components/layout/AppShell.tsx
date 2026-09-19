"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function PageContainer({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-150",
        className
      )}
    >
      {children}
    </main>
  )
}

export function ContentSection({
  title,
  description,
  actions,
  children,
  className
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            {title && <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
