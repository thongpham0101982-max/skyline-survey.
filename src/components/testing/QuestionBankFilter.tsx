"use client"

import React from "react"
import { Search, Filter, RotateCcw } from "lucide-react"

interface QuestionBankFilterProps {
  searchTerm: string
  onSearchChange: (v: string) => void
  selectedSubject: string
  onSubjectChange: (v: string) => void
  selectedGrade: string
  onGradeChange: (v: string) => void
  selectedLevel: string
  onLevelChange: (v: string) => void
  selectedStatus: string
  onStatusChange: (v: string) => void
  subjects: { code: string; name: string }[]
  grades: string[]
  onReset: () => void
}

export function QuestionBankFilter({
  searchTerm,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  selectedGrade,
  onGradeChange,
  selectedLevel,
  onLevelChange,
  selectedStatus,
  onStatusChange,
  subjects,
  grades,
  onReset
}: QuestionBankFilterProps) {
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã câu, nội dung..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
          />
        </div>

        {/* Subject */}
        <div>
          <select
            value={selectedSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
          >
            <option value="ALL">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Grade */}
        <div>
          <select
            value={selectedGrade}
            onChange={(e) => onGradeChange(e.target.value)}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
          >
            <option value="ALL">Tất cả khối</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                Khối {g}
              </option>
            ))}
          </select>
        </div>

        {/* Thinking Level */}
        <div>
          <select
            value={selectedLevel}
            onChange={(e) => onLevelChange(e.target.value)}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="NHAN_BIET">Nhận biết</option>
            <option value="THONG_HIEU">Thông hiểu</option>
            <option value="VAN_DUNG">Vận dụng</option>
            <option value="VAN_DUNG_CAO">Vận dụng cao</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex gap-1.5">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex-1 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="DRAFT">Nháp</option>
          </select>

          <button
            type="button"
            onClick={onReset}
            title="Đặt lại bộ lọc"
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
