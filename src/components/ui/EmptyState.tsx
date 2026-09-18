import React from "react"
import { LucideIcon, Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) {
  const ActionIcon = action?.icon

  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0284C7] flex items-center justify-center mb-4 border border-sky-100 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  )
}
