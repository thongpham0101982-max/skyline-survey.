"use client"

import React, { useState } from "react"
import { CheckCircle, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

export interface ContinuationPanelProps {
  targetId: string
  currentTerminationStatus: "ACTIVE" | "PENDING_TERMINATION" | "TERMINATED" | string
  onDecisionSaved?: () => void
  className?: string
}

export function ContinuationPanel({
  targetId,
  currentTerminationStatus,
  onDecisionSaved,
  className = ""
}: ContinuationPanelProps) {
  const [modalType, setModalType] = useState<"CONTINUE" | "ADJUST" | "TERMINATE" | null>(null)
  const [reason, setReason] = useState("")
  const [outcome, setOutcome] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!modalType) return
    setLoading(true)

    try {
      const action = modalType === "TERMINATE" ? "requestTermination" : "saveTarget"
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          targetId,
          outcomeNotes: outcome || reason,
          reason: reason
        })
      })
      if (res.ok) {
        setModalType(null)
        setReason("")
        setOutcome("")
        if (onDecisionSaved) onDecisionSaved()
      }
    } catch (err) {
      console.error("Lỗi cập nhật quyết định theo dõi:", err)
    } finally {
      setLoading(false)
    }
  }

  if (currentTerminationStatus === "TERMINATED") {
    return (
      <div className={`p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs ${className}`}>
        <span className="font-bold text-emerald-900">
          Hồ sơ đã chấm dứt theo dõi và đạt kết quả tốt trong năm học.
        </span>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3 ${className}`}>
      <div>
        <h5 className="font-bold text-xs text-slate-800">Quyết định định kỳ:</h5>
        <p className="text-[11px] text-slate-500">
          Chọn phương án theo dõi phù hợp sau phiên đánh giá tháng hoặc cuối kỳ.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setModalType("CONTINUE")}>
          Tiếp tục theo dõi
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setModalType("ADJUST")}>
          Điều chỉnh kế hoạch
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setModalType("TERMINATE")}>
          Đề xuất chấm dứt
        </Button>
      </div>

      <Dialog
        open={Boolean(modalType)}
        onOpenChange={(open) => !open && setModalType(null)}
        title={
          modalType === "TERMINATE"
            ? "Đề xuất Chấm dứt Theo dõi Học sinh"
            : modalType === "ADJUST"
            ? "Điều chỉnh Kế hoạch Hỗ trợ"
            : "Xác nhận Tiếp tục Theo dõi"
        }
        description="Quyết định sẽ được lưu vào lịch sử đánh giá và chuyển đến Ban Quản lý Chất lượng."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModalType(null)} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm} isLoading={loading}>
              Xác nhận
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs">
          <label className="font-bold text-slate-700 block">
            {modalType === "TERMINATE" ? "Kết luận & Lý do kết thúc hồ sơ:" : "Ghi chú & Lý do quyết định:"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Nhập nội dung quyết định của thầy/cô..."
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B3A]"
          />
        </div>
      </Dialog>
    </div>
  )
}
