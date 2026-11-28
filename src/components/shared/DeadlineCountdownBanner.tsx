"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Clock, CheckCircle2, Filter, AlertCircle, ShieldAlert } from "lucide-react";

export interface DeadlineCountdownBannerProps {
  deadlineDate: string | Date | null | undefined;
  pendingCount?: number;
  totalCount?: number;
  batchName?: string;
  isPendingFiltered?: boolean;
  onToggleFilterPending?: () => void;
  className?: string;
}

export default function DeadlineCountdownBanner({
  deadlineDate,
  pendingCount = 0,
  totalCount = 0,
  batchName = "Đợt khảo sát",
  isPendingFiltered = false,
  onToggleFilterPending,
  className = ""
}: DeadlineCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    if (!deadlineDate) return;

    const calculateRemaining = () => {
      const targetTime = new Date(deadlineDate).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        totalMs: diff,
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [deadlineDate]);

  const hoursLeft = timeLeft.totalMs / (1000 * 60 * 60);

  const urgencyConfig = useMemo(() => {
    if (timeLeft.isExpired) {
      return {
        wrapperBg: "bg-white border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.04)]",
        dotColor: "bg-rose-500",
        badgeBg: "bg-rose-50 text-rose-700 border border-rose-200/80",
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        statusLabel: "Đã hết hạn nhập điểm",
        timerBox: "bg-slate-50 text-slate-600 border-slate-200/80",
        timeColor: "text-rose-600 font-semibold",
        filterBtn: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
      };
    }
    if (hoursLeft < 24) {
      return {
        wrapperBg: "bg-rose-50/50 border-rose-200/80 shadow-[0_2px_10px_-3px_rgba(244,63,94,0.08)]",
        dotColor: "bg-rose-600",
        badgeBg: "bg-rose-600 text-white",
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        statusLabel: "Hạn chốt khẩn cấp (< 24h)",
        timerBox: "bg-white text-rose-900 border-rose-200",
        timeColor: "text-rose-600 font-bold",
        filterBtn: "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300"
      };
    }
    if (hoursLeft < 48) {
      return {
        wrapperBg: "bg-amber-50/50 border-amber-200/80 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.08)]",
        dotColor: "bg-amber-500",
        badgeBg: "bg-amber-100 text-amber-800 border border-amber-200",
        icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        statusLabel: "Sắp đến hạn khóa sổ",
        timerBox: "bg-white text-amber-900 border-amber-200",
        timeColor: "text-amber-700 font-bold",
        filterBtn: "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
      };
    }
    return {
      wrapperBg: "bg-white border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.04)]",
      dotColor: "bg-emerald-500",
      badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      statusLabel: "Trong thời hạn quy định",
      timerBox: "bg-slate-50 text-slate-700 border-slate-200/80",
      timeColor: "text-emerald-700 font-bold",
      filterBtn: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
    };
  }, [timeLeft.isExpired, hoursLeft]);

  if (!deadlineDate) return null;

  return (
    <div
      role="region"
      aria-label="Cảnh báo hạn chốt nhập điểm"
      className={`rounded-2xl border px-4 py-2.5 transition-all duration-200 ${urgencyConfig.wrapperBg} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Compact Single-line Status & Batch Title */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${urgencyConfig.badgeBg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${urgencyConfig.dotColor}`} />
            {urgencyConfig.statusLabel}
          </span>
          <span className="text-xs font-bold text-slate-800">
            {batchName}
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-[11px] text-slate-500 tabular-nums">
            Hạn chốt:{" "}
            <strong className="font-semibold text-slate-700">
              {new Date(deadlineDate).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </strong>
          </span>
        </div>

        {/* Right: Sleek Countdown Pill + Optional Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 font-mono text-xs tabular-nums px-3 py-1 rounded-full border ${urgencyConfig.timerBox}`}>
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            {timeLeft.isExpired ? (
              <span className="font-sans text-[11px] font-medium text-slate-500">
                Đã khóa sổ (<span className={urgencyConfig.timeColor}>00:00:00</span>)
              </span>
            ) : (
              <>
                <span className="text-[11px] font-sans font-medium text-slate-500 mr-0.5">Còn:</span>
                {timeLeft.days > 0 && (
                  <>
                    <span className={urgencyConfig.timeColor}>{String(timeLeft.days).padStart(2, "0")}</span>
                    <span className="text-slate-400 font-sans text-[10px] mr-0.5">ngày</span>
                  </>
                )}
                <span className={urgencyConfig.timeColor}>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="text-slate-400">:</span>
                <span className={urgencyConfig.timeColor}>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="text-slate-400">:</span>
                <span className={urgencyConfig.timeColor}>{String(timeLeft.seconds).padStart(2, "0")}</span>
              </>
            )}
          </div>

          {onToggleFilterPending && (
            <button
              type="button"
              onClick={onToggleFilterPending}
              aria-pressed={isPendingFiltered}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer tabular-nums ${
                isPendingFiltered
                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                  : urgencyConfig.filterBtn
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{isPendingFiltered ? "Xem tất cả học sinh" : `Chưa có điểm (${pendingCount}/${totalCount})`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
