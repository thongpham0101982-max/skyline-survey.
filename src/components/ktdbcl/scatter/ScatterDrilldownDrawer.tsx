// @ts-nocheck
"use client"

import React from "react"
import {
  X,
  User,
  GraduationCap,
  Award,
  Sparkles,
  Calendar,
  BookOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from "lucide-react"

interface Props {
  student: any
  isOpen: boolean
  onClose: () => void
  onActionClick: (student: any, actionType: string) => void
}

export function ScatterDrilldownDrawer({
  student,
  isOpen,
  onClose,
  onActionClick
}: Props) {
  if (!isOpen || !student) return null

  // Phân tích componentScores JSON nếu có
  let compScores: Record<string, any> = {}
  if (student.componentScores) {
    try {
      compScores = typeof student.componentScores === "string"
        ? JSON.parse(student.componentScores)
        : student.componentScores
    } catch (e) {}
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#005B58] text-white flex items-center justify-center font-black text-sm shadow-md">
                {student.studentName?.slice(0, 1) || "HS"}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {student.studentName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-slate-500 font-bold">{student.studentCode}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-extrabold text-[#005B58]">Lớp {student.className}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Thẻ tọa độ phân tán */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Vị trí Tọa độ Phân tán:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">Trục X (Gốc)</div>
                  <div className="text-base font-black text-slate-800">{student.x}đ</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-teal-200 bg-teal-50/20">
                  <div className="text-[10px] text-teal-700">Trục Y (Hiện tại)</div>
                  <div className="text-base font-black text-[#005B58]">{student.y}đ</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">Độ lệch (Δ)</div>
                  <div className={`text-base font-black ${student.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {student.delta >= 0 ? `+${student.delta}` : student.delta}đ
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-slate-500">Phân nhóm:</span>
                <span className="font-extrabold text-slate-800">
                  {student.quadrant === "Q1" ? "🌟 Sky-Line Honor" : student.quadrant === "Q2" ? "🚀 Sky-Line Rising" : student.quadrant === "Q3" ? "🚨 Priority Support" : "⚠️ Sky-Line Attention"}
                </span>
              </div>
            </div>

            {/* Chi tiết điểm thành phần */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#005B58]" />
                Điểm Thành phần (GDPT 2018):
              </span>

              {Object.keys(compScores).length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(compScores).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-600 font-semibold">{k}:</span>
                      <span className="font-bold text-slate-900">{v !== null && v !== undefined ? `${v}đ` : "-"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic bg-slate-50 p-2.5 rounded-lg">
                  Chưa có chi tiết cột điểm con trong sổ điểm.
                </p>
              )}
            </div>

            {/* Nhận xét giáo viên */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Nhận xét Định tính của Giáo viên:
              </span>
              <div className="p-3 bg-teal-50/40 rounded-xl border border-teal-100 text-slate-700 italic">
                {student.remark || "Chưa có lời nhận xét định tính cho kỳ khảo sát này."}
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                GV: <strong>{student.teacherName}</strong>
              </div>
            </div>

            {/* Hồ sơ ĐGNL Đầu vào */}
            {student.entranceInfo && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Hồ sơ ĐGNL Tuyển sinh Đầu vào:
                </span>
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-1.5 text-slate-700">
                  <div className="grid grid-cols-3 gap-1 text-center font-bold">
                    <div className="bg-white p-1 rounded border border-amber-200">Toán: {student.entranceInfo.mathScore ?? "-"}</div>
                    <div className="bg-white p-1 rounded border border-amber-200">Văn: {student.entranceInfo.literatureScore ?? "-"}</div>
                    <div className="bg-white p-1 rounded border border-amber-200">Anh: {student.entranceInfo.writtenEnglishScore ?? "-"}</div>
                  </div>
                  {student.entranceInfo.admissionCriteria && (
                    <div>
                      <span className="text-slate-500">Tiêu chí:</span> <strong>{student.entranceInfo.admissionCriteria}</strong>
                    </div>
                  )}
                  {student.entranceInfo.directorNote && (
                    <div className="text-[11px] italic text-amber-900 bg-white/80 p-1.5 rounded">
                      &quot;{student.entranceInfo.directorNote}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cam kết học tập hiện hành */}
            {student.learningCommitment && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Phiếu Cam kết Học tập Đang Áp dụng:
                </span>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 space-y-1">
                  <div className="font-bold">{student.learningCommitment.content}</div>
                  <div className="text-[10px] text-purple-700">
                    Phụ trách: {student.learningCommitment.teacherName || "Chưa gán"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <button
              onClick={() => onActionClick(student, "SUPPORT")}
              className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <span>Giao Phụ đạo</span>
            </button>
            <button
              onClick={() => onActionClick(student, "COMMITMENT")}
              className="flex-1 px-3 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <span>Lập Cam kết</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
