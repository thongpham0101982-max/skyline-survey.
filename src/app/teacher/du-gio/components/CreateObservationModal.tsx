"use client"
// @ts-nocheck

import React from "react"
import {
  X,
  PlusCircle,
  Building2,
  Eye,
  UserCheck,
  Zap,
  ShieldCheck
} from "lucide-react"
import { ObservationRegistrationSection } from "./ObservationRegistrationSection"

type CreationMode =
  | "TEACHER_OPEN"
  | "CAMPUS_SCHEDULE"
  | "OBSERVER_REQUEST"
  | "SURPRISE"
  | "ASSIGNED"

interface ModeMeta {
  id: CreationMode
  label: string
  title: string
  subtitle: string
  icon: React.ElementType
  badgeClass: string
  activeTabClass: string
}

const MODE_META: Record<CreationMode, ModeMeta> = {
  TEACHER_OPEN: {
    id: "TEACHER_OPEN",
    label: "Đăng ký tiết dạy",
    title: "Đăng ký tiết dạy mới",
    subtitle: "Mở tiết dạy theo kế hoạch để đồng nghiệp cùng tổ đăng ký tham gia dự giờ.",
    icon: PlusCircle,
    badgeClass: "bg-[#00A19A]/25 text-[#5EEAD4] border-[#5EEAD4]/30",
    activeTabClass: "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
  },
  ASSIGNED: {
    id: "ASSIGNED",
    label: "Chỉ định dự giờ",
    title: "Chỉ định dự giờ chuyên môn",
    subtitle: "Chủ động phân công giáo viên được dự và người dự theo kế hoạch (hiệu lực ngay).",
    icon: UserCheck,
    badgeClass: "bg-teal-400/20 text-[#99F6E4] border-teal-300/30",
    activeTabClass: "bg-[#00736E] text-white border-[#00736E] shadow-xs"
  },
  SURPRISE: {
    id: "SURPRISE",
    label: "Dự giờ đột xuất",
    title: "Lập biên bản dự giờ đột xuất",
    subtitle: "Ghi nhận và đánh giá trực tiếp tiết dạy đột xuất khách quan, đồng hành chuyên môn.",
    icon: Zap,
    badgeClass: "bg-amber-400/25 text-amber-200 border-amber-300/30",
    activeTabClass: "bg-[#D97706] text-white border-[#D97706] shadow-xs"
  },
  CAMPUS_SCHEDULE: {
    id: "CAMPUS_SCHEDULE",
    label: "Đăng ký lịch Cơ sở",
    title: "Đăng ký lịch làm việc Cơ sở – Tổ CTHS",
    subtitle: "Ghi nhận số tiết làm việc thực tế và đầu việc thực hiện tại từng cơ sở.",
    icon: Building2,
    badgeClass: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30",
    activeTabClass: "bg-[#059669] text-white border-[#059669] shadow-xs"
  },
  OBSERVER_REQUEST: {
    id: "OBSERVER_REQUEST",
    label: "Xin dự giờ",
    title: "Gửi yêu cầu xin dự giờ",
    subtitle: "Gửi đề xuất dự giờ tới giáo viên bộ môn để xác nhận lịch tham dự.",
    icon: Eye,
    badgeClass: "bg-[#00A19A]/25 text-[#5EEAD4] border-[#5EEAD4]/30",
    activeTabClass: "bg-[#00A19A] text-white border-[#00A19A] shadow-xs"
  }
}

export function CreateObservationModal(props: any) {
  if (!props.isOpen && !props.showCreateModal) return null

  const currentMode: CreationMode =
    (props.creationMode as CreationMode) || "TEACHER_OPEN"
  const activeMeta = MODE_META[currentMode] || MODE_META.TEACHER_OPEN
  const ActiveIcon = activeMeta.icon

  const availableModes: ModeMeta[] = [
    MODE_META.TEACHER_OPEN,
    ...(props.canAssignObservation ? [MODE_META.ASSIGNED] : []),
    ...(props.canCreateSurprise ? [MODE_META.SURPRISE] : []),
    MODE_META.CAMPUS_SCHEDULE,
    MODE_META.OBSERVER_REQUEST
  ]

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={activeMeta.title}
    >
      <div className="bg-white w-full max-w-6xl xl:max-w-7xl rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Masthead: Sky-Line Deep Pine -> Brand Teal */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-[#003B3A] via-[#004D4B] to-[#00736E] text-white flex items-center justify-between gap-3 border-b border-[#003B3A] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 ${activeMeta.badgeClass}`}
            >
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-extrabold tracking-tight leading-tight text-white truncate">
                  {activeMeta.title}
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/12 text-[#CCFBF1] border border-white/15">
                  {activeMeta.label}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-teal-100/90 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {activeMeta.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-white/15"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Mode Switcher Strip + Email Deduplication Safeguard Banner */}
        <div className="px-4 py-2.5 sm:px-6 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
          {typeof props.setCreationMode === "function" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {availableModes.map((mode) => {
                const IconComp = mode.icon
                const isSelected = currentMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      props.setCreationMode(mode.id)
                      if (mode.id === "CAMPUS_SCHEDULE") {
                        const cthsDept = (props.departments || []).find((d: any) =>
                          String(d?.name || "").toLowerCase().includes("cths") ||
                          String(d?.name || "").toLowerCase().includes("công tác học sinh")
                        )
                        if (cthsDept && typeof props.setSurpriseDeptId === "function") {
                          props.setSurpriseDeptId(cthsDept.id)
                        }
                        if (!props.surpriseTeacherId && props.currentTeacher?.id && typeof props.setSurpriseTeacherId === "function") {
                          props.setSurpriseTeacherId(props.currentTeacher.id)
                        }
                        if (!props.surpriseTopic && typeof props.setSurpriseTopic === "function") {
                          props.setSurpriseTopic("Làm việc tại cơ sở - Tổ CTHS")
                        }
                        if (!props.surpriseSubjectName && typeof props.setSurpriseSubjectName === "function") {
                          props.setSurpriseSubjectName("Công tác học sinh (CTHS)")
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? mode.activeTabClass
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]/50 hover:text-[#003B3A]"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{mode.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#00736E] bg-[#F0FDFA] border border-[#CCFBF1] px-2.5 py-1 rounded-lg self-start lg:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
            <span>Mỗi giáo viên liên quan chỉ nhận tối đa 01 email thông báo</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-[#F8FAFC]/40">
          <ObservationRegistrationSection {...props} hideModeTabs />
        </div>
      </div>
    </div>
  )
}
