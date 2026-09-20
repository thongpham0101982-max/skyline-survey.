"use client"

import React, { useState } from "react"
import { Lock, Unlock, Clock, AlertCircle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/badge"

export interface AdjustmentRequestPanelProps {
  studentId: string
  academicYearId: string
  currentRequest?: {
    id?: string
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
    reason: string
    teacherResponse?: string
    createdAt?: string
  } | null
  onRequestSubmitted?: () => void
  className?: string
}

export function AdjustmentRequestPanel({
  studentId,
  academicYearId,
  currentRequest,
  onRequestSubmitted,
  className = ""
}: AdjustmentRequestPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do bạn muốn xin mở phiếu để điều chỉnh mục tiêu.")
      return
    }

    setLoading(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/advisory/goals/adjustment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          reason: reason.trim()
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsOpen(false)
        setReason("")
        if (onRequestSubmitted) onRequestSubmitted()
      } else {
        setErrorMsg(data.error || "Không thể gửi yêu cầu. Vui lòng thử lại.")
      }
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối máy chủ khi gửi yêu cầu.")
    } finally {
      setLoading(false)
    }
  }

  // Trường hợp chưa có yêu cầu hoặc yêu cầu đã xong
  if (!currentRequest || currentRequest.status === "COMPLETED" || currentRequest.status === "CANCELLED") {
    return (
      <div className={`p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600 font-medium">
            Phiếu mục tiêu đã được lưu. Nếu cần thay đổi, em có thể gửi yêu cầu mở phiếu.
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Xin điều chỉnh phiếu
        </Button>

        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Yêu cầu xin điều chỉnh phiếu mục tiêu"
          description="Thầy cô Cố vấn học tập và GVCN sẽ xem xét và mở khóa phiếu để em cập nhật mục tiêu mới."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={loading}>
                Đóng
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={loading}>
                Gửi yêu cầu
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2">
            <label className="block text-xs font-bold text-slate-700">
              Lý do em muốn điều chỉnh mục tiêu:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Em đã hoàn thành mục tiêu môn Toán kỳ 1 sớm hơn dự kiến và muốn nâng mục tiêu lên 8.5..."
              rows={3}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B3A]"
            />
            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg}
              </p>
            )}
          </div>
        </Dialog>
      </div>
    )
  }

  // Trường hợp đang PENDING
  if (currentRequest.status === "PENDING") {
    return (
      <div className={`p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          <div>
            <span className="text-xs font-bold text-amber-900 block">
              Đã gửi yêu cầu điều chỉnh — Đang chờ thầy cô xét duyệt
            </span>
            <span className="text-[11px] text-amber-700">
              Lý do: &ldquo;{currentRequest.reason}&rdquo;
            </span>
          </div>
        </div>
        <StatusBadge status="status-warning" label="Chờ xét duyệt" />
      </div>
    )
  }

  // Trường hợp đã APPROVED (Mở khóa)
  if (currentRequest.status === "APPROVED") {
    return (
      <div className={`p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
          <Unlock className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-xs font-bold text-emerald-900 block">
              Thầy cô đã đồng ý mở khóa phiếu!
            </span>
            <span className="text-[11px] text-emerald-700">
              Em có thể chỉnh sửa và bấm &ldquo;Lưu mục tiêu mới&rdquo; ngay bây giờ.
              {currentRequest.teacherResponse && ` (Phản hồi: ${currentRequest.teacherResponse})`}
            </span>
          </div>
        </div>
        <StatusBadge status="status-success" label="Được phép sửa" />
      </div>
    )
  }

  // Trường hợp REJECTED
  return (
    <div className={`p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <div>
          <span className="text-xs font-bold text-red-900 block">
            Yêu cầu điều chỉnh chưa được chấp thuận
          </span>
          <span className="text-[11px] text-red-700">
            {currentRequest.teacherResponse || "Vui lòng trao đổi trực tiếp với Giáo viên Chủ nhiệm hoặc Cố vấn học tập."}
          </span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Gửi yêu cầu mới
      </Button>
    </div>
  )
}
