import React from "react"
import Link from "next/link"
import { ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

export interface KPISubMetric {
  label: string
  value: string | number
  colorClass?: string
}

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
  onClick?: () => void
  colorTheme?: "sky" | "emerald" | "amber" | "purple" | "rose" | "slate" | "teal" | "gold" | "violet" | "pine" | "indigo"
  progress?: number
  trend?: "up" | "down" | "neutral"
  trendValue?: string | number
  comparisonText?: string
  subMetrics?: KPISubMetric[]
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
  onClick,
  colorTheme = "teal",
  progress,
  trend,
  trendValue,
  comparisonText,
  subMetrics,
  className = ""
}: KPICardProps) {
  const themeColors = {
    teal: {
      bg: "bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20",
      badge: "bg-[#00A19A]/10 text-[#00736E] border-[#00A19A]/30",
      link: "text-[#00736E] hover:text-[#00A19A]",
      progress: "bg-[#00A19A]",
      accentBorder: "hover:border-[#00A19A]/40"
    },
    indigo: {
      bg: "bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20",
      badge: "bg-[#6C5CE7]/10 text-[#5A4AD1] border-[#6C5CE7]/30",
      link: "text-[#5A4AD1] hover:text-[#6C5CE7]",
      progress: "bg-[#6C5CE7]",
      accentBorder: "hover:border-[#6C5CE7]/40"
    },
    gold: {
      bg: "bg-[#AE882E]/10 text-[#AE882E] border-[#AE882E]/20",
      badge: "bg-[#AE882E]/10 text-[#937326] border-[#AE882E]/30",
      link: "text-[#937326] hover:text-[#AE882E]",
      progress: "bg-[#AE882E]",
      accentBorder: "hover:border-[#AE882E]/40"
    },
    violet: {
      bg: "bg-[#6E3D89]/10 text-[#6E3D89] border-[#6E3D89]/20",
      badge: "bg-[#6E3D89]/10 text-[#593170] border-[#6E3D89]/30",
      link: "text-[#593170] hover:text-[#6E3D89]",
      progress: "bg-[#6E3D89]",
      accentBorder: "hover:border-[#6E3D89]/40"
    },
    pine: {
      bg: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/20",
      badge: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/30",
      link: "text-[#003B3A] hover:text-[#00A19A]",
      progress: "bg-[#003B3A]",
      accentBorder: "hover:border-[#003B3A]/40"
    },
    sky: {
      bg: "bg-[#00A19A]/10 text-[#00736E] border-[#00A19A]/20",
      badge: "bg-[#CCFBF1] text-[#00736E] border-[#99F6E4]",
      link: "text-[#00736E] hover:text-[#00A19A]",
      progress: "bg-[#00A19A]",
      accentBorder: "hover:border-[#00A19A]/40"
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      link: "text-emerald-600 hover:text-emerald-700",
      progress: "bg-emerald-500",
      accentBorder: "hover:border-emerald-300"
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      badge: "bg-amber-50 text-amber-700 border-amber-200/70",
      link: "text-amber-600 hover:text-amber-700",
      progress: "bg-amber-500",
      accentBorder: "hover:border-amber-300"
    },
    purple: {
      bg: "bg-[#6E3D89]/10 text-[#6E3D89] border-[#6E3D89]/20",
      badge: "bg-[#6E3D89]/10 text-[#593170] border-[#6E3D89]/30",
      link: "text-[#593170] hover:text-[#6E3D89]",
      progress: "bg-[#6E3D89]",
      accentBorder: "hover:border-[#6E3D89]/40"
    },
    rose: {
      bg: "bg-rose-50 text-rose-600 border-rose-100",
      badge: "bg-rose-50 text-rose-700 border-rose-200/70",
      link: "text-rose-600 hover:text-rose-700",
      progress: "bg-rose-500",
      accentBorder: "hover:border-rose-300"
    },
    slate: {
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      link: "text-slate-600 hover:text-slate-700",
      progress: "bg-slate-500",
      accentBorder: "hover:border-slate-300"
    }
  }[colorTheme]

  const trendBadge = trendValue !== undefined && trendValue !== null && (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono border ${
        trend === "up"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : trend === "down"
          ? "bg-amber-50 text-amber-700 border-amber-200/80"
          : "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {trend === "up" && <ArrowUpRight className="w-3 h-3 shrink-0" />}
      {trend === "down" && <ArrowDownRight className="w-3 h-3 shrink-0" />}
      {trend === "neutral" && <Minus className="w-3 h-3 shrink-0" />}
      <span>{trendValue}</span>
    </span>
  )

  const cardContent = (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs ${themeColors.accentBorder} transition-all duration-200 flex flex-col justify-between group min-h-[148px] ${
        onClick || href ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div>
        {/* Top bar: Icon & Badge / Trend */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {Icon ? (
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${themeColors.bg}`}>
              <Icon className="w-4 h-4" />
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {trendBadge}
            {badge && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${themeColors.badge}`}>
                {badge}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-slate-500 tracking-normal line-clamp-1" title={title}>
          {title}
        </p>

        {/* Value & Unit */}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-[26px] font-bold font-mono tabular-nums text-slate-800 tracking-tight leading-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-slate-400">
              {unit}
            </span>
          )}
        </div>

        {/* Comparison Text or Description */}
        {(comparisonText || description) && (
          <p className="mt-1 text-[11px] font-normal text-slate-500 line-clamp-1">
            {comparisonText || description}
          </p>
        )}

        {/* Sub-metrics breakdown */}
        {subMetrics && subMetrics.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[11px] text-slate-500">
            {subMetrics.map((sm, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-300">•</span>}
                <span>
                  {sm.label}:{" "}
                  <strong className={`font-semibold font-mono tabular-nums ${sm.colorClass || "text-slate-700"}`}>
                    {sm.value}
                  </strong>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Micro Progress Bar */}
        {typeof progress === "number" && (
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${themeColors.progress}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Drill-down Footer */}
      {(href || onClick) && (
        <div className={`flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs font-medium ${themeColors.link}`}>
          <span>{hrefLabel || "Xem chi tiết"}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{cardContent}</Link>
  }

  return cardContent
}
