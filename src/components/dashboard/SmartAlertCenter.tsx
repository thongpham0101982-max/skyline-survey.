"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react"

export interface SmartAlertItem {
  id: string
  title: string
  description: string
  severity: "CRITICAL" | "WARNING" | "INFO"
  category: "OVERDUE_TASK" | "DATA_ANOMALY" | "PROGRESS_GAP" | "STUDENT_SUPPORT"
  categoryLabel?: string
  metricBadge: string
  scopeText?: string
  href?: string
  onClick?: () => void
  actionLabel: string
}

interface SmartAlertCenterProps {
  alerts: SmartAlertItem[]
  lastUpdated?: string
}

export function SmartAlertCenter({ alerts = [], lastUpdated }: SmartAlertCenterProps) {
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "CRITICAL" | "WARNING" | "INFO">("ALL")
  const [isCollapsed, setIsCollapsed] = useState(false)

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length
  const warningCount = alerts.filter((a) => a.severity === "WARNING").length
  const infoCount = alerts.filter((a) => a.severity === "INFO").length

  const filteredAlerts = alerts.filter((a) =>
    filterSeverity === "ALL" ? true : a.severity === filterSeverity
  )

  const severityConfig = {
    CRITICAL: {
      icon: AlertCircle,
      cardClass: "border-rose-200/90 bg-rose-50/40 hover:bg-rose-50/70",
      iconClass: "text-rose-600 bg-rose-100/80 border-rose-200",
      badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
      btnClass: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
      label: "Khẩn cấp"
    },
    WARNING: {
      icon: AlertTriangle,
      cardClass: "border-amber-200/90 bg-amber-50/40 hover:bg-amber-50/70",
      iconClass: "text-amber-600 bg-amber-100/80 border-amber-200",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      btnClass: "bg-white hover:bg-amber-50 text-amber-800 border-amber-300",
      label: "Cần chú ý"
    },
    INFO: {
      icon: Info,
      cardClass: "border-sky-200/90 bg-sky-50/40 hover:bg-sky-50/70",
      iconClass: "text-sky-600 bg-sky-100/80 border-sky-200",
      badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
      btnClass: "bg-white hover:bg-sky-50 text-sky-800 border-sky-300",
      label: "Theo dõi"
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50/80 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Trung tâm Cảnh báo Thông minh & Đôn đốc Điều hành
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#003B3A] text-white">
                {alerts.length} cảnh báo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Phát hiện tự động từ dữ liệu thực: công việc quá hạn, hồ sơ chờ duyệt, tiến độ chưa đạt chuẩn & học sinh cần hỗ trợ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
          {/* Severity Filter Pills */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/80 gap-1 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setFilterSeverity("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterSeverity === "ALL"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tất cả ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity("CRITICAL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filterSeverity === "CRITICAL"
                  ? "bg-rose-600 text-white"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Khẩn cấp ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity("WARNING")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filterSeverity === "WARNING"
                  ? "bg-amber-600 text-white"
                  : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Cảnh báo ({warningCount})
            </button>
            {infoCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterSeverity("INFO")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  filterSeverity === "INFO"
                    ? "bg-sky-600 text-white"
                    : "text-sky-700 hover:bg-sky-50"
                }`}
              >
                Theo dõi ({infoCount})
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{isCollapsed ? "Mở rộng" : "Thu gọn"}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5">
          {filteredAlerts.length === 0 ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-semibold block text-emerald-900">
                  Hệ thống vận hành ổn định, không có cảnh báo ở mức này
                </strong>
                <span>
                  Tất cả các chỉ số dữ liệu, công việc và tiến độ chuyên môn trong phạm vi lọc hiện tại đều đạt ngưỡng an toàn.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredAlerts.map((alert) => {
                const cfg = severityConfig[alert.severity]
                const Icon = cfg.icon
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${cfg.cardClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconClass}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.badgeClass}`}
                          >
                            {alert.categoryLabel || cfg.label}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-800 bg-white/90 px-2 py-0.5 rounded border border-slate-200/80">
                            {alert.metricBadge}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                          {alert.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-500 font-mono truncate" title={alert.scopeText || "Toàn trường"}>
                        Phạm vi: <strong className="text-slate-700">{alert.scopeText || "Toàn trường"}</strong>
                      </span>
                      {alert.onClick ? (
                        <button
                          type="button"
                          onClick={alert.onClick}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all shrink-0 shadow-2xs cursor-pointer ${cfg.btnClass}`}
                        >
                          <span>{alert.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <Link
                          href={alert.href || "#"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all shrink-0 shadow-2xs ${cfg.btnClass}`}
                        >
                          <span>{alert.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {lastUpdated && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Cơ chế quét tự động đối soát CSDL thời gian thực (Zero Fake Data)</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-[#00A19A]" />
                Quét lúc: <strong className="text-slate-600">{lastUpdated}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
