import React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  description?: string
  icon?: React.ElementType
  badge?: string
  badgeVariant?: "default" | "skyline" | "accent" | "success" | "destructive" | "secondary"
  href?: string
  hrefLabel?: string
  colorTheme?: "sky" | "emerald" | "amber" | "purple" | "rose" | "slate" | "teal" | "gold" | "violet" | "pine"
  progress?: number
  className?: string
}

export function KPICard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  badge,
  href,
  hrefLabel,
  colorTheme = "teal",
  progress,
  className = ""
}: KPICardProps) {
  const themeColors = {
    teal: {
      bg: "bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20",
      badge: "bg-[#00A19A]/10 text-[#00736E] border-[#00A19A]/30",
      link: "text-[#00736E] hover:text-[#00A19A]",
      progress: "bg-[#00A19A]"
    },
    gold: {
      bg: "bg-[#AE882E]/10 text-[#AE882E] border-[#AE882E]/20",
      badge: "bg-[#AE882E]/10 text-[#937326] border-[#AE882E]/30",
      link: "text-[#937326] hover:text-[#AE882E]",
      progress: "bg-[#AE882E]"
    },
    violet: {
      bg: "bg-[#6E3D89]/10 text-[#6E3D89] border-[#6E3D89]/20",
      badge: "bg-[#6E3D89]/10 text-[#593170] border-[#6E3D89]/30",
      link: "text-[#593170] hover:text-[#6E3D89]",
      progress: "bg-[#6E3D89]"
    },
    pine: {
      bg: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/20",
      badge: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/30",
      link: "text-[#003B3A] hover:text-[#00A19A]",
      progress: "bg-[#003B3A]"
    },
    sky: {
      bg: "bg-[#00A19A]/10 text-[#00736E] border-[#00A19A]/20",
      badge: "bg-[#CCFBF1] text-[#00736E] border-[#99F6E4]",
      link: "text-[#00736E] hover:text-[#00A19A]",
      progress: "bg-[#00A19A]"
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      link: "text-emerald-600 hover:text-emerald-700",
      progress: "bg-emerald-500"
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      badge: "bg-amber-50 text-amber-700 border-amber-200/70",
      link: "text-amber-600 hover:text-amber-700",
      progress: "bg-amber-500"
    },
    purple: {
      bg: "bg-[#6E3D89]/10 text-[#6E3D89] border-[#6E3D89]/20",
      badge: "bg-[#6E3D89]/10 text-[#593170] border-[#6E3D89]/30",
      link: "text-[#593170] hover:text-[#6E3D89]",
      progress: "bg-[#6E3D89]"
    },
    rose: {
      bg: "bg-rose-50 text-rose-600 border-rose-100",
      badge: "bg-rose-50 text-rose-700 border-rose-200/70",
      link: "text-rose-600 hover:text-rose-700",
      progress: "bg-rose-500"
    },
    slate: {
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      link: "text-slate-600 hover:text-slate-700",
      progress: "bg-slate-500"
    }
  }[colorTheme]

  const cardContent = (
    <div
      className={`bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-slate-300/80 transition-all flex flex-col justify-between group min-h-[135px] ${className}`}
    >
      <div>
        {/* Top bar: Icon & Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {Icon ? (
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${themeColors.bg}`}>
              <Icon className="w-4 h-4" />
            </div>
          ) : (
            <div />
          )}

          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${themeColors.badge}`}>
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-normal text-slate-500 tracking-normal">
          {title}
        </p>

        {/* Value */}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-medium text-slate-800 tracking-tight leading-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-normal text-slate-400">
              {unit}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs font-normal text-slate-400 line-clamp-1">
            {description}
          </p>
        )}

        {/* Micro Progress Bar */}
        {typeof progress === "number" && (
          <div className="w-full bg-slate-100 h-1 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${themeColors.progress}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Drill-down Footer */}
      {href && (
        <div className={`flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-xs font-normal ${themeColors.link}`}>
          <span>{hrefLabel || "Chi tiết"}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{cardContent}</Link>
  }

  return cardContent
}
