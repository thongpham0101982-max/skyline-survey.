"use client"

import React, { useState, useRef, useEffect, useMemo } from "react";
import { TrendingUp, Award, ExternalLink, Target, AlertCircle, CheckCircle2, ChevronRight, X } from "lucide-react";

export interface StudentSnapshotPopoverProps {
  student: {
    id: string;
    studentCode: string;
    studentName: string;
    grade?: string;
    className?: string;
  };
  targetScore?: number;
  currentScore?: number;
  children: React.ReactNode;
  className?: string;
}

export default function StudentSnapshotPopover({
  student,
  targetScore = 8.0,
  currentScore = 7.5,
  children,
  className = ""
}: StudentSnapshotPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const gap = useMemo(() => {
    return parseFloat((currentScore - targetScore).toFixed(1));
  }, [currentScore, targetScore]);

  const gapConfig = useMemo(() => {
    if (gap >= 0) {
      return {
        label: "Đạt / Vượt kỳ vọng",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        sign: "+",
        textColor: "text-emerald-700",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      };
    }
    if (gap >= -0.5) {
      return {
        label: "Tiệm cận mục tiêu",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
        sign: "",
        textColor: "text-amber-700",
        icon: <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
      };
    }
    return {
      label: "Cần hỗ trợ học tập",
      badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
      sign: "",
      textColor: "text-rose-700",
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
    };
  }, [gap]);

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer inline-flex items-center"
      >
        {children}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`Thông tin nhanh học sinh ${student.studentName}`}
          className="absolute left-0 bottom-full mb-2 z-40 w-72 bg-white rounded-xl shadow-xl border border-slate-200/90 p-4 transition-all duration-200 animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 leading-none">
                  {student.studentName}
                </span>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {student.studentCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {student.className ? `Lớp ${student.className}` : ""}{student.grade ? ` • Khối ${student.grade}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng popover"
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 mb-3">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 block font-medium">Mục tiêu</span>
              <span className="font-mono font-bold text-xs text-slate-800 tabular-nums">
                {targetScore.toFixed(1)}
              </span>
            </div>
            <div className="text-center border-x border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium">Điểm hiện tại</span>
              <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                {currentScore.toFixed(1)}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-slate-500 block font-medium">GAP</span>
              <span className={`font-mono font-black text-xs tabular-nums ${gapConfig.textColor}`}>
                {gapConfig.sign}{gap.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] text-slate-500 font-medium">Đánh giá chung:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${gapConfig.badgeBg}`}>
              {gapConfig.icon}
              <span>{gapConfig.label}</span>
            </span>
          </div>

          {/* Quick Navigation Link */}
          <a
            href={`/student-360?code=${encodeURIComponent(student.studentCode)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-[#003B3A] text-white hover:bg-[#004D4B] text-[11px] font-bold transition-all shadow-xs"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3 text-[#48BFE3]" />
              <span>Xem Hồ Sơ 360° Đầy Đủ</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </a>
        </div>
      )}
    </div>
  );
}
