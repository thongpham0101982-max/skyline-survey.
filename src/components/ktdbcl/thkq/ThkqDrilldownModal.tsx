// @ts-nocheck
"use client"

import React from "react"
import {
  X,
  AlertTriangle,
  Download,
  ExternalLink,
  Flame,
  HeartHandshake,
  Brain
} from "lucide-react"
import * as XLSX from "xlsx"

interface Props {
  isOpen: boolean
  onClose: () => void
  cellData: any
  allTargetStudents: any[]
}

export function ThkqDrilldownModal({ isOpen, onClose, cellData, allTargetStudents }: Props) {
  if (!isOpen || !cellData) return null

  // Lọc học sinh thuộc ô Heatmap đã click (điểm < 5.0 của môn + khối + campus)
  const students = allTargetStudents.filter(s => {
    const matchSubject = s.subjectId === cellData.subjectId
    const matchGrade = s.grade === cellData.grade
    const matchCampus = cellData.campusId === "SYSTEM" || s.campusId === cellData.campusId
    const matchBelow5 = s.isBelowMoet // score < 5.0
    return matchSubject && matchGrade && matchCampus && matchBelow5
  })

  // Xuất Excel cho danh sách này
  const handleExport = () => {
    if (students.length === 0) return

    const exportRows = students.map((s, idx) => ({
      STT: idx + 1,
      "Mã Học Sinh": s.studentCode,
      "Họ và Tên": s.studentName,
      Lớp: s.className,
      "Cơ sở": s.campusName,
      "Môn học": s.subjectName,
      "Điểm khảo sát": s.score,
      "Chuẩn Sky-Line": s.skylineBenchmark,
      "Chênh lệch": s.deltaSkyline,
      "Cam kết đầu vào": s.isCommitment ? "Có" : "Không",
      "Theo dõi tâm lý": s.isPsychological ? "Có" : "Không",
      GVCN: s.homeroomTeacher || ""
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "DS_HocSinh_Duoi5")
    XLSX.writeFile(
      wb,
      `DS_HS_Duoi5_${cellData.subjectName}_${cellData.gradeLabel}_${cellData.campusName.replace(/\s+/g, "_")}.xlsx`
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Chi tiết Học sinh Điểm dưới 5 (&lt; 5.0)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {students.length} học sinh
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Môn: <strong className="text-slate-800">{cellData.subjectName}</strong> • {cellData.gradeLabel} •{" "}
                <strong className="text-slate-800">{cellData.campusName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={students.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nội dung danh sách */}
        <div className="p-5 overflow-y-auto flex-1">
          {students.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                Không tìm thấy thông tin chi tiết học sinh cho ô dữ liệu này
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Có thể do dữ liệu đã được lọc bớt trong danh mục học sinh trọng tâm
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/90 sticky top-0 z-10">
                  <tr className="divide-x divide-slate-200">
                    <th className="py-2 px-3 font-bold text-slate-700 w-12 text-center">STT</th>
                    <th className="py-2 px-3 font-bold text-slate-700">Mã HS</th>
                    <th className="py-2 px-3 font-bold text-slate-700">Họ và Tên</th>
                    <th className="py-2 px-3 font-bold text-slate-700">Lớp</th>
                    <th className="py-2 px-3 font-bold text-center text-slate-700 bg-red-100/50">Điểm số</th>
                    <th className="py-2 px-3 font-bold text-slate-700">Diện đặc thù</th>
                    <th className="py-2 px-3 font-bold text-slate-700">GVCN</th>
                    <th className="py-2 px-3 font-bold text-center text-slate-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => (
                    <tr key={`${s.studentId}_${idx}`} className="hover:bg-slate-50 transition divide-x divide-slate-100">
                      <td className="py-2 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">{s.studentCode}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{s.studentName}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium">{s.className}</td>
                      <td className="py-2 px-3 text-center font-black text-rose-700 bg-rose-50/50">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 border border-rose-200">
                          {s.score}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {s.isCommitment && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
                              <HeartHandshake className="h-2.5 w-2.5" /> Cam kết
                            </span>
                          )}
                          {s.isPsychological && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              <Brain className="h-2.5 w-2.5" /> Tâm lý
                            </span>
                          )}
                          {!s.isCommitment && !s.isPsychological && (
                            <span className="text-[10px] text-slate-400">Bình thường</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{s.homeroomTeacher || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <a
                          href={`/admin/ktdbcl/support?studentId=${s.studentId}&yearId=${s.academicYearId || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-semibold transition"
                        >
                          Lập can thiệp
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>* Các học sinh này cần được Tổ chuyên môn và GVCN lập kế hoạch phụ đạo tăng cường.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
