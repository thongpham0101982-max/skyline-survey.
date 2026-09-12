// @ts-nocheck
"use client"

import React from "react"
import { X, Plus } from "lucide-react"
import { ObservationRegistrationSection } from "./ObservationRegistrationSection"

export function CreateObservationModal(props: any) {
  if (!props.isOpen && !props.showCreateModal) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#004D47] to-[#007068] text-white flex items-center justify-between gap-4 border-b border-teal-700/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {props.creationMode === "TEACHER_OPEN"
                  ? "Mở Tiết Dạy Dự Giờ Mới"
                  : props.creationMode === "OBSERVER_REQUEST"
                  ? "Gửi Yêu Cầu Xin Dự Giờ"
                  : "Lập Biên Bản Dự Giờ Đột Xuất"}
              </h3>
              <p className="text-xs text-teal-100/80 font-medium">
                Khởi tạo và thiết lập thông tin tiết dạy chuyên môn trên hệ thống Sky-Line
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <ObservationRegistrationSection {...props} />
        </div>
      </div>
    </div>
  )
}
