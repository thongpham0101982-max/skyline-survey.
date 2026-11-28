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
      cardBg: "bg-white border-slate-200/80 hover:border-[#00A19A]/45 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(0,161,154,0.14)]",
      glow: "bg-[#00A19A]/12",
      iconBox: "bg-gradient-to-br from-[#00A19A] to-[#00736E] text-white shadow-sm shadow-[#00A19A]/25",
      badge: "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-[#00736E] group-hover:text-[#00A19A]",
      progressTrack: "bg-slate-100",
      progressFill: "bg-[#00A19A]"
    },
    emerald: {
      cardBg: "bg-white border-slate-200/80 hover:border-emerald-400/50 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(16,185,129,0.14)]",
      glow: "bg-emerald-500/12",
      iconBox: "bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm shadow-emerald-500/25",
      badge: "bg-emerald-50/90 text-emerald-700 border-emerald-200/70",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-emerald-700 group-hover:text-emerald-600",
      progressTrack: "bg-slate-100",
      progressFill: "bg-emerald-500"
    },
    // Spotlight Hero Card: Điểm nhấn thị giác hiện đại chuẩn quốc tế
    pine: {
      cardBg: "bg-gradient-to-br from-[#003B3A] via-[#005854] to-[#008B85] border-transparent shadow-[0_8px_24px_-6px_rgba(0,59,58,0.28)] hover:shadow-[0_12px_30px_-6px_rgba(0,161,154,0.35)]",
      glow: "bg-[#5EEAD4]/20",
      iconBox: "bg-white/15 text-[#5EEAD4] border border-white/20 backdrop-blur-md shadow-xs",
      badge: "bg-white/15 text-[#CCFBF1] border-white/20 backdrop-blur-md",
      titleColor: "text-teal-100/90",
      valueColor: "text-white",
      unitColor: "text-[#5EEAD4]",
      descColor: "text-teal-100/75",
      subBorder: "border-white/15",
      link: "text-[#5EEAD4] group-hover:text-white",
      progressTrack: "bg-white/15",
      progressFill: "bg-[#5EEAD4]"
    },
    indigo: {
      cardBg: "bg-white border-slate-200/80 hover:border-[#003B3A]/40 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(0,59,58,0.12)]",
      glow: "bg-[#003B3A]/10",
      iconBox: "bg-gradient-to-br from-[#005854] to-[#003B3A] text-white shadow-sm shadow-[#003B3A]/20",
      badge: "bg-slate-100 text-[#003B3A] border-slate-200/80",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-[#003B3A] group-hover:text-[#00A19A]",
      progressTrack: "bg-slate-100",
      progressFill: "bg-[#003B3A]"
    },
    amber: {
      cardBg: "bg-white border-slate-200/80 hover:border-amber-400/50 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(245,158,11,0.14)]",
      glow: "bg-amber-500/12",
      iconBox: "bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-sm shadow-amber-500/25",
      badge: "bg-amber-50/90 text-amber-700 border-amber-200/70",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-amber-700 group-hover:text-amber-600",
      progressTrack: "bg-slate-100",
      progressFill: "bg-amber-500"
    },
    gold: {
      cardBg: "bg-white border-slate-200/80 hover:border-[#AE882E]/50 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(174,136,46,0.14)]",
      glow: "bg-[#AE882E]/12",
      iconBox: "bg-gradient-to-br from-[#C59B38] to-[#9A7724] text-white shadow-sm shadow-[#AE882E]/25",
      badge: "bg-amber-50/90 text-amber-800 border-amber-200/70",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-amber-800 group-hover:text-[#AE882E]",
      progressTrack: "bg-slate-100",
      progressFill: "bg-[#AE882E]"
    },
    rose: {
      cardBg: "bg-white border-slate-200/80 hover:border-rose-400/50 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(244,63,94,0.14)]",
      glow: "bg-rose-500/12",
      iconBox: "bg-gradient-to-br from-[#F43F5E] to-[#E11D48] text-white shadow-sm shadow-rose-500/25",
      badge: "bg-rose-50/90 text-rose-700 border-rose-200/70",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-rose-600 group-hover:text-rose-700",
      progressTrack: "bg-slate-100",
      progressFill: "bg-rose-500"
    },
    sky: {
      cardBg: "bg-white border-slate-200/80 hover:border-sky-400/50 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(2,132,199,0.14)]",
      glow: "bg-sky-500/12",
      iconBox: "bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-white shadow-sm shadow-sky-500/25",
      badge: "bg-sky-50/90 text-sky-700 border-sky-200/70",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-sky-700 group-hover:text-sky-600",
      progressTrack: "bg-slate-100",
      progressFill: "bg-sky-500"
    },
    violet: {
      cardBg: "bg-white border-slate-200/80 hover:border-[#00A19A]/45 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(0,161,154,0.14)]",
      glow: "bg-[#00A19A]/12",
      iconBox: "bg-gradient-to-br from-[#00A19A] to-[#00736E] text-white shadow-sm shadow-[#00A19A]/25",
      badge: "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-[#00736E] group-hover:text-[#00A19A]",
      progressTrack: "bg-slate-100",
      progressFill: "bg-[#00A19A]"
    },
    purple: {
      cardBg: "bg-white border-slate-200/80 hover:border-[#003B3A]/40 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_25px_-6px_rgba(0,59,58,0.12)]",
      glow: "bg-[#003B3A]/10",
      iconBox: "bg-gradient-to-br from-[#005854] to-[#003B3A] text-white shadow-sm shadow-[#003B3A]/20",
      badge: "bg-slate-100 text-[#003B3A] border-slate-200/80",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-[#003B3A] group-hover:text-[#00A19A]",
      progressTrack: "bg-slate-100",
      progressFill: "bg-[#003B3A]"
    },
    slate: {
      cardBg: "bg-white border-slate-200/80 hover:border-slate-300 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)]",
      glow: "bg-slate-400/10",
      iconBox: "bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-sm",
      badge: "bg-slate-100 text-slate-600 border-slate-200",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
      unitColor: "text-slate-400",
      descColor: "text-slate-400",
      subBorder: "border-slate-100",
      link: "text-slate-600 group-hover:text-slate-900",
      progressTrack: "bg-slate-100",
      progressFill: "bg-slate-500"
    }
  }[colorTheme]

  const isSpotlight = colorTheme === "pine"

  const trendBadge = trendValue !== undefined && trendValue !== null && (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono tabular-nums border ${
        isSpotlight
          ? "bg-white/15 text-[#5EEAD4] border-white/20"
          : trend === "up"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
          : trend === "down"
          ? "bg-amber-50 text-amber-700 border-amber-200/70"
          : "bg-slate-50 text-slate-600 border-slate-200/80"
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
      className={`relative rounded-2xl border p-4 sm:p-5 ${themeColors.cardBg} transition-all duration-300 flex flex-col justify-between group min-h-[146px] overflow-hidden ${
        onClick || href ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Hiệu ứng ánh sáng dịu góc phải trên (Ambient Glow) */}
      <div
        className={`w-28 h-28 rounded-full absolute -top-10 -right-10 blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125 ${themeColors.glow}`}
      />

      <div className="relative z-10">
        {/* Top bar: Icon Squircle & Subtle Pill Badge */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          {Icon ? (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${themeColors.iconBox}`}>
              <Icon className="w-4.5 h-4.5" />
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
        <p className={`text-xs font-medium ${themeColors.titleColor} tracking-normal line-clamp-1`} title={title}>
          {title}
        </p>

        {/* Value & Unit */}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`text-2xl sm:text-[28px] font-extrabold font-mono tabular-nums ${themeColors.valueColor} tracking-tight leading-none`}>
            {value}
          </span>
          {unit && (
            <span className={`text-xs font-medium ${themeColors.unitColor}`}>
              {unit}
            </span>
          )}
        </div>

        {/* Comparison Text or Description */}
        {(comparisonText || description) && (
          <p className={`mt-1 text-[11px] font-normal ${themeColors.descColor} line-clamp-1`}>
            {comparisonText || description}
          </p>
        )}

        {/* Sub-metrics breakdown */}
        {subMetrics && subMetrics.length > 0 && (
          <div className={`mt-2.5 pt-2 border-t ${themeColors.subBorder} flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[11px] ${themeColors.descColor}`}>
            {subMetrics.map((sm, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="opacity-40">•</span>}
                <span>
                  {sm.label}:{" "}
                  <strong className={`font-semibold font-mono tabular-nums ${isSpotlight ? "text-white" : sm.colorClass || "text-slate-700"}`}>
                    {sm.value}
                  </strong>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Micro Progress Bar (chỉ hiển thị khi được truyền cụ thể) */}
        {typeof progress === "number" && (
          <div className={`w-full ${themeColors.progressTrack} h-1.5 rounded-full mt-2.5 overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${themeColors.progressFill}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Minimalist Inline Action Link (Gọn nhẹ, không cắt ngang thẻ) */}
      {(href || onClick) && (
        <div className={`relative z-10 flex items-center justify-between pt-3 mt-2 text-xs font-semibold transition-colors ${themeColors.link}`}>
          <span>{hrefLabel || "Xem chi tiết"}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{cardContent}</Link>
  }

  return cardContent
}
