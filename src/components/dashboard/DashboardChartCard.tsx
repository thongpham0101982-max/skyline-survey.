"use client"

import React from "react"
import Link from "next/link"
import { Clock, ChevronRight, Inbox, AlertTriangle, RefreshCw } from "lucide-react"

export interface ChartLegendItem {
  label: string
  color: string
  value?: string | number
}

export interface DashboardChartCardProps {
  title: string
  subtitle?: string
  icon?: React.ElementType
  iconBgClass?: string
  unit: string
  lastUpdated?: string
  legendItems?: ChartLegendItem[]
  headerRight?: React.ReactNode
  detailHref?: string
  detailLabel?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  errorMessage?: string
  onRetry?: () => void
  className?: string
  bodyClassName?: string
  footerSlot?: React.ReactNode
  children: React.ReactNode
}

export function DashboardChartCard({
  title,
  subtitle,
  icon: Icon,
  iconBgClass = "bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20",
  unit,
  lastUpdated,
  legendItems,
  headerRight,
  detailHref,
  detailLabel = "Chi tiết",
  isLoading = false,
  isEmpty = false,
  emptyTitle = "Chưa có dữ liệu thống kê",
  emptyDescription = "Không tìm thấy bản ghi phù hợp với tiêu chí bộ lọc hiện tại.",
  errorMessage,
  onRetry,
  className = "",
  bodyClassName = "",
  footerSlot,
  children
}: DashboardChartCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconBgClass}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                {title}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200/90 text-slate-600 font-mono">
                Đơn vị: {unit}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] sm:text-xs font-normal text-slate-500 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
          {headerRight}
          {detailHref && (
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-teal-50/80 text-[#00736E] border border-slate-200/90 hover:border-[#00A19A]/40 text-xs font-semibold transition-all shadow-2xs"
            >
              <span>{detailLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`p-4 sm:p-5 flex-1 ${bodyClassName}`}>
        {isLoading ? (
          <div className="h-64 w-full flex flex-col justify-end gap-3 p-4 animate-pulse bg-slate-50/60 rounded-xl border border-slate-100">
            <div className="flex items-end justify-between gap-3 h-44 px-4">
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[45%]" />
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[75%]" />
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[60%]" />
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[90%]" />
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[50%]" />
              <div className="w-full bg-slate-200/80 rounded-t-lg h-[80%]" />
            </div>
            <div className="h-3 w-48 bg-slate-200 rounded mx-auto" />
          </div>
        ) : errorMessage ? (
          <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 bg-rose-50/30 rounded-xl border border-rose-100">
            <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-800">{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-700">{emptyTitle}</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{emptyDescription}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer: Legend & Timestamp */}
      <div className="px-4 py-2.5 sm:px-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-3 flex-wrap">
          {legendItems && legendItems.length > 0 ? (
            <>
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Chú giải:
              </span>
              {legendItems.map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 font-medium">{item.label}</span>
                  {item.value !== undefined && (
                    <strong className="font-mono font-semibold text-slate-800">
                      ({item.value})
                    </strong>
                  )}
                </div>
              ))}
            </>
          ) : (
            footerSlot || <span className="text-slate-400">Dữ liệu tổng hợp trực tiếp từ CSDL hệ thống SSM</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 font-mono">
          <Clock className="w-3 h-3 text-[#00A19A]" />
          <span>Cập nhật: <strong className="text-slate-600">{lastUpdated || "Tức thời"}</strong></span>
        </div>
      </div>
    </div>
  )
}
