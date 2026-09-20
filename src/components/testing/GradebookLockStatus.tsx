"use client"

import React, { useState } from "react"
import { StatusBadge } from "@/components/ui/badge"
import { Lock, Unlock, Clock, AlertCircle } from "lucide-react"

interface GradebookLockStatusProps {
  isLocked: boolean
  unlockStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  lockDate?: string
  onRequestUnlock?: (reason: string) => void
}

export function GradebookLockStatus({
  isLocked,
  unlockStatus,
  lockDate,
  onRequestUnlock
}: GradebookLockStatusProps) {
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    if (onRequestUnlock) onRequestUnlock(reason)
    setShowModal(false)
    setReason("")
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
      <div className="flex items-center gap-2">
        {isLocked ? (
          <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
            <Lock className="w-4 h-4" />
          </span>
        ) : (
          <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <Unlock className="w-4 h-4" />
          </span>
        )}
        <div>
          <div className="font-semibold text-slate-900">
            {isLocked ? "Sổ điểm đã khóa chỉnh sửa" : "Sổ điểm đang mở"}
          </div>
          {lockDate && <div className="text-[11px] text-slate-500">Khóa lúc: {lockDate}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLocked && (
          <>
            {unlockStatus === "PENDING" ? (
              <span className="flex items-center gap-1 text-amber-700 font-medium px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Đang chờ duyệt mở khóa</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Gửi yêu cầu mở khóa
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal xin mở khóa */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>Yêu cầu mở khóa sổ điểm</span>
            </div>
            <p className="text-xs text-slate-600">
              Vui lòng nêu rõ lý do cần điều chỉnh điểm số để gửi Ban KT&ĐBCL / BGH phê duyệt.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#003B3A] text-white rounded-lg text-xs font-semibold hover:bg-[#002d2c] transition-colors cursor-pointer"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
