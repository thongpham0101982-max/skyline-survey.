"use client"

import Link from "next/link"
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Settings,
  UserCheck,
  Users2,
} from "lucide-react"

export type EntranceWorkflowStepKey =
  | "list"
  | "handover"
  | "assign"
  | "results"
  | "approval"
  | "reports"
  | "config"

const WORKFLOW_STEPS: Array<{
  key: Exclude<EntranceWorkflowStepKey, "config">
  stepNum: string
  label: string
  hint: string
  href: string
  icon: any
}> = [
  {
    key: "list",
    stepNum: "B1",
    label: "Lập danh sách & Đợt",
    hint: "Tạo kỳ/đợt, tiếp nhận HS K-12 & Mầm non",
    href: "/admin/student-info",
    icon: Users2,
  },
  {
    key: "handover",
    stepNum: "B2",
    label: "Bàn giao & Điều hành",
    hint: "Bàn giao DS giữa Tư vấn · Giáo vụ · Khảo thí",
    href: "/admin/dieu-hanh-khao-sat",
    icon: Activity,
  },
  {
    key: "assign",
    stepNum: "B3",
    label: "Phân công GV khảo sát",
    hint: "Gán đúng GV theo môn, khối, HTN & Tâm lý",
    href: "/admin/phan-cong-khao-sat",
    icon: UserCheck,
  },
  {
    key: "results",
    stepNum: "B4",
    label: "KQ & Định hướng",
    hint: "Kết quả chấm bài K-12 & phiếu mẫu GV",
    href: "/admin/ket-qua-khao-sat?tab=general",
    icon: Award,
  },
  {
    key: "approval",
    stepNum: "B5",
    label: "Xét duyệt & Email KQ",
    hint: "Duyệt NT MN/BGH → GĐCS, gửi Email theo đợt",
    href: "/admin/xet-duyet-ket-qua",
    icon: CheckCircle2,
  },
  {
    key: "reports",
    stepNum: "B6",
    label: "Thống kê & Báo cáo",
    hint: "Xuất thư KQ, cam kết & báo cáo tổng hợp",
    href: "/admin/input-assessments/reports",
    icon: BarChart3,
  },
]

export function EntranceWorkflowStepper({
  activeStep,
  className = "",
}: {
  activeStep: EntranceWorkflowStepKey
  className?: string
}) {
  const activeIdx = WORKFLOW_STEPS.findIndex((s) => s.key === activeStep)

  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 border-l-4 border-[#003B3A] pl-2.5 pr-1 py-0.5 mr-1">
          <ClipboardList className="h-3.5 w-3.5 text-[#008B85]" />
          <span className="text-[11px] font-bold text-[#003B3A] whitespace-nowrap">
            Quy trình Khảo sát đầu vào
          </span>
        </div>

        <nav
          aria-label="Quy trình Khảo sát đầu vào"
          className="flex flex-1 flex-wrap items-center gap-1.5"
        >
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = step.key === activeStep
            const isPast = activeIdx >= 0 && idx < activeIdx
            return (
              <Link
                key={step.key}
                href={step.href}
                title={step.hint}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : isPast
                      ? "bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4]/80 hover:bg-[#CCFBF1]"
                      : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:border-[#00A19A] hover:text-[#003B3A]"
                }`}
              >
                <span
                  className={`inline-flex h-4 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-[#00A19A] text-white"
                      : isPast
                        ? "bg-[#CCFBF1] text-[#003B3A]"
                        : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  {step.stepNum}
                </span>
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive ? "text-[#5EEAD4]" : isPast ? "text-[#008B85]" : "text-slate-400"
                  }`}
                />
                <span>{step.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5 ml-auto">
          <Link
            href="/teacher/input-assessments"
            title="Mở Không gian Giáo viên để kiểm tra đúng phân công môn và đúng mẫu phiếu khảo sát"
            className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-[#00A19A] hover:bg-[#F0FDFA] hover:text-[#003B3A] transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3 w-3 text-[#008B85]" />
            <span>Cổng GV</span>
          </Link>
          <Link
            href="/admin/cau-hinh-khao-sat"
            title="Cấu hình khảo sát & File điểm KSĐV"
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              activeStep === "config"
                ? "bg-[#003B3A] text-white"
                : "border border-[#E2E8F0] bg-[#F8FAFC] text-slate-600 hover:border-[#00A19A] hover:text-[#003B3A]"
            }`}
          >
            <Settings
              className={`h-3 w-3 ${activeStep === "config" ? "text-[#5EEAD4]" : "text-slate-400"}`}
            />
            <span>Cấu hình</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
