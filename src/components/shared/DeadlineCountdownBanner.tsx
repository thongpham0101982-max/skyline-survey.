"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Clock, AlertTriangle, CheckCircle2, Filter, AlertCircle, ShieldAlert } from "lucide-react";

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

  if (!deadlineDate) return null;

  // Determine urgency tier
  // > 48h: Safe (Emerald)
  // 24h - 48h: Warning (Amber)
  // < 24h: Critical (Red)
  // Expired: Gray/Red Alert
  const hoursLeft = timeLeft.totalMs / (1000 * 60 * 60);

  const urgencyConfig = useMemo(() => {
    if (timeLeft.isExpired) {
      return {
        wrapperBg: "bg-rose-50/90 border-rose-200 text-rose-900",
        badgeBg: "bg-rose-600 text-white",
        icon: <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />,
        statusLabel: "ĐÃ HẾT HẠN NHẬP ĐIỂM",
        timeColor: "text-rose-700 font-bold",
        filterBtn: "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300"
      };
    }
    if (hoursLeft < 24) {
      return {
        wrapperBg: "bg-red-50/90 border-red-200 text-red-900 shadow-xs",
        badgeBg: "bg-red-500 text-white animate-pulse",
        icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
        statusLabel: "HẠN CHỐT KHẨN CẤP (< 24H)",
        timeColor: "text-red-700 font-bold",
        filterBtn: "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
      };
    }
    if (hoursLeft < 48) {
      return {
        wrapperBg: "bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs",
        badgeBg: "bg-amber-500 text-white",
        icon: <Clock className="w-4 h-4 text-amber-600 shrink-0" />,
        statusLabel: "SẮP ĐẾN HẠN KHÓA SỔ",
        timeColor: "text-amber-800 font-bold",
        filterBtn: "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
      };
    }
    return {
      wrapperBg: "bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs",
      badgeBg: "bg-emerald-600 text-white",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      statusLabel: "TRONG THỜI HẠN QUI ĐỊNH",
      timeColor: "text-emerald-800 font-bold",
      filterBtn: "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
    };
  }, [timeLeft.isExpired, hoursLeft]);

  return (
    <div
      role="region"
      aria-label="Cảnh báo hạn chốt nhập điểm"
      className={`rounded-xl border p-3.5 transition-all duration-200 ${urgencyConfig.wrapperBg} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left info: Icon, Batch Title & Status Badge */}
        <div className="flex items-center gap-2.5">
          {urgencyConfig.icon}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${urgencyConfig.badgeBg}`}>
                {urgencyConfig.statusLabel}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {batchName}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Hạn hoàn thành: <span className="font-semibold">{new Date(deadlineDate).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </p>
          </div>
        </div>

        {/* Middle: Real-time Countdown Timer */}
        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-sans font-medium text-slate-500 mr-1">Thời gian còn:</span>
          {timeLeft.isExpired ? (
            <span className="font-bold text-rose-600">00:00:00 (Hết hạn)</span>
          ) : (
            <>
              {timeLeft.days > 0 && (
                <>
                  <span className={urgencyConfig.timeColor}>{String(timeLeft.days).padStart(2, "0")}</span>
                  <span className="text-slate-400 font-sans text-[10px] mr-1">ngày</span>
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

        {/* Right: Action to filter pending students */}
        {onToggleFilterPending && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFilterPending}
              aria-pressed={isPendingFiltered}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shadow-2xs cursor-pointer ${
                isPendingFiltered
                  ? "bg-[#003B3A] text-white border-[#003B3A] ring-2 ring-[#08AAA4]/40"
                  : urgencyConfig.filterBtn
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isPendingFiltered ? "Xem tất cả học sinh" : `Chỉ xem chưa có điểm (${pendingCount}/${totalCount})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
