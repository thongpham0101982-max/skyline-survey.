"use client"

import React from "react"
import { User, Calendar, ShieldCheck, Heart, GraduationCap } from "lucide-react"
import { StatusBadge } from "@/components/ui/badge"
import { YearTransitionBadge } from "./YearTransitionBadge"
import { mapSupportStatus } from "@/lib/support/supportTrackingService"

export interface StudentSupportHeaderProps {
  studentName: string
  studentCode: string
  classNameText?: string
  supportType: "ACADEMIC" | "PSYCHOLOGICAL" | string
  sourceType: string
  status: string
  terminationStatus: string
  startDate: string
  durationText?: string
  leadTeacherName?: string
  className?: string
}

export function StudentSupportHeader({
  studentName,
  studentCode,
  classNameText,
  supportType,
  sourceType,
  status,
  terminationStatus,
  startDate,
  durationText,
  leadTeacherName,
  className = ""
}: StudentSupportHeaderProps) {
  const isAcademic = supportType === "ACADEMIC"
  const statusInfo = mapSupportStatus(status, terminationStatus)

  return (
    <div className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
          isAcademic ? "bg-[#003B3A]" : "bg-purple-800"
        }`}>
          {isAcademic ? <GraduationCap className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-base text-slate-900 tracking-tight">{studentName}</h3>
            <span className="text-xs font-mono font-bold text-slate-500">({studentCode})</span>
            {classNameText && (
              <span className="text-[11px] font-extrabold text-[#003B3A] bg-[#E6F0EA] px-2 py-0.5 rounded-md">
                Lớp {classNameText}
              </span>
            )}
            <YearTransitionBadge sourceType={sourceType} />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="font-bold text-slate-700">
              Loại hỗ trợ: <span className="font-normal">{isAcademic ? "Hỗ trợ học tập / Phụ đạo" : "Theo dõi tâm lý học đường"}</span>
            </span>
            <span>•</span>
            <span>Bắt đầu: {startDate}</span>
            {durationText && (
              <>
                <span>•</span>
                <span>Thời gian: {durationText}</span>
              </>
            )}
            {leadTeacherName && (
              <>
                <span>•</span>
                <span className="font-semibold text-slate-700">Phụ trách: {leadTeacherName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="self-end md:self-center shrink-0">
        <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
      </div>
    </div>
  )
}
