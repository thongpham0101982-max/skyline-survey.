"use client"

import React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className = ""
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/80 mb-6 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 flex-wrap">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-slate-400 hover:text-sky-600 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-sky-600 font-medium transition-colors truncate max-w-[150px] sm:max-w-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={`truncate max-w-[200px] sm:max-w-none ${isLast ? "font-medium text-slate-700" : "font-normal text-slate-400"}`}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        {/* Title and Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-normal leading-snug">
            {title}
          </h1>
          {badge}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs sm:text-sm font-normal text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action buttons on the right */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}
