import React from "react"
import { LucideIcon, Inbox, Search, ShieldAlert, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EmptyStateVariant = "default" | "no-data" | "no-result" | "no-permission" | "not-configured"

export interface EmptyStateProps {
  variant?: EmptyStateVariant
  icon?: LucideIcon
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

const variantDefaults: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string }> = {
  default: {
    icon: Inbox,
    title: "Không có dữ liệu",
    description: "Hiện chưa có bản ghi nào trong hệ thống.",
  },
  "no-data": {
    icon: Inbox,
    title: "Chưa có dữ liệu",
    description: "Danh sách này hiện đang trống. Hãy bắt đầu bằng cách thêm mới bản ghi.",
  },
  "no-result": {
    icon: Search,
    title: "Không tìm thấy kết quả phù hợp",
    description: "Thử điều chỉnh lại từ khóa tìm kiếm hoặc các tiêu chí bộ lọc.",
  },
  "no-permission": {
    icon: ShieldAlert,
    title: "Không có quyền truy cập",
    description: "Tài khoản hiện tại chưa được cấp quyền xem dữ liệu phân hệ này.",
  },
  "not-configured": {
    icon: SlidersHorizontal,
    title: "Chưa cấu hình đợt làm việc",
    description: "Vui lòng liên hệ Quản trị viên để thiết lập năm học và chỉ tiêu chuyên môn.",
  },
}

export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) {
  const currentDefault = variantDefaults[variant] || variantDefaults.default
  const Icon = icon || currentDefault.icon
  const displayTitle = title || currentDefault.title
  const displayDesc = description || currentDefault.description
  const ActionIcon = action?.icon

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center mb-4 border border-[#003B3A]/15 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1 tracking-tight">
        {displayTitle}
      </h3>
      {displayDesc && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed text-pretty">
          {displayDesc}
        </p>
      )}
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
          leftIcon={ActionIcon ? <ActionIcon className="w-4 h-4" /> : undefined}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
