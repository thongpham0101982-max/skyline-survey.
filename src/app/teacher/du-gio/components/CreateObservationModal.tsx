"use client"
// @ts-nocheck

import React from "react"
import { X, Plus, Building2 } from "lucide-react"
import { ObservationRegistrationSection } from "./ObservationRegistrationSection"

export function CreateObservationModal(props: any) {
  if (!props.isOpen && !props.showCreateModal) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl xl:max-w-7xl rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#004D47] to-[#00A19A] text-white flex items-center justify-between gap-3 border-b border-teal-700/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20 shrink-0">
              {props.creationMode === "CAMPUS_SCHEDULE" ? (
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black tracking-tight leading-tight">
                {props.creationMode === "TEACHER_OPEN"
                  ? "Đăng Ký Tiết Dạy Mới"
                  : props.creationMode === "CAMPUS_SCHEDULE"
                  ? "Đăng Ký Lịch Làm Việc Cơ Sở – Tổ CTHS"
                  : props.creationMode === "OBSERVER_REQUEST"
                  ? "Gửi Yêu Cầu Xin Dự Giờ"
                  : props.creationMode === "ASSIGNED"
                  ? "Chỉ Định Dự Giờ Chuyên Môn"
                  : "Lập Biên Bản Dự Giờ Đột Xuất"}
              </h3>
              <p className="text-[11px] sm:text-xs text-teal-100/80 font-medium line-clamp-1 sm:line-clamp-none">
                {props.creationMode === "CAMPUS_SCHEDULE"
                  ? "Ghi nhận số tiết làm việc thực tế và các đầu việc đã thực hiện tại từng cơ sở của nhân sự Tổ CTHS"
                  : props.creationMode === "SURPRISE"
                  ? "Đánh giá trực tiếp tiết dạy đột xuất một cách khách quan, thân thiện và đồng hành phát triển chuyên môn"
                  : props.creationMode === "ASSIGNED"
                  ? "Cán bộ quản lý chủ động chỉ định giáo viên được dự và phân công người dự theo kế hoạch (không cần GV duyệt)"
                  : "Khai báo thông tin tiết dạy và hệ thống sẽ tự động gửi email thông báo tới Giáo viên cùng Tổ chuyên môn"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-7">
          <ObservationRegistrationSection {...props} />
        </div>
      </div>
    </div>
  )
}
