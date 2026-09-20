"use client"

import React, { useState } from "react"
import { FileSpreadsheet, Printer, Download, Filter, FileText } from "lucide-react"

export interface ReportDefinition {
  id: string
  name: string
  category: "HOC_SINH" | "GIAO_VIEN" | "KHAO_THI" | "DU_GIO" | "TRAI_NGHIEM"
  categoryLabel: string
  description: string
  sourceModule: string
  supportedFormats: ("EXCEL" | "PDF" | "PRINT")[]
  targetRole: string
}

export function ReportCatalogView() {
  const [selectedCat, setSelectedCat] = useState<string>("ALL")

  const reports: ReportDefinition[] = [
    {
      id: "RPT_STUDENT_360",
      name: "Báo cáo Kết quả Học tập & Rèn luyện Học sinh 360°",
      category: "HOC_SINH",
      categoryLabel: "Học sinh",
      description: "Hồ sơ tổng hợp điểm số MOET, chứng chỉ, năng lực và thành tích cá nhân.",
      sourceModule: "Hồ sơ học sinh 360°",
      supportedFormats: ["EXCEL", "PDF", "PRINT"],
      targetRole: "BGH, GVCN, Phụ huynh"
    },
    {
      id: "RPT_EXAM_QUALITY",
      name: "Báo cáo Phân tích Phổ điểm & Đối chuẩn Khảo thí",
      category: "KHAO_THI",
      categoryLabel: "Khảo thí",
      description: "Phổ điểm theo môn/khối, độ lệch chuẩn, so sánh liên cơ sở và danh sách nguy cơ.",
      sourceModule: "Khảo thí & ĐBCL",
      supportedFormats: ["EXCEL", "PDF"],
      targetRole: "Ban KT&ĐBCL, GĐCS, TTCM"
    },
    {
      id: "RPT_OBSERVATION_PROGRESS",
      name: "Báo cáo Tiến độ & Đánh giá Dự giờ Chuyên môn",
      category: "DU_GIO",
      categoryLabel: "Dự giờ",
      description: "Tổng hợp lượt dự giờ, phân loại tiết dạy và danh sách giáo viên chưa đạt chỉ tiêu.",
      sourceModule: "Dự giờ & Phát triển chuyên môn",
      supportedFormats: ["EXCEL", "PDF"],
      targetRole: "BGH, TTCM, QLCM"
    },
    {
      id: "RPT_EXPERIENTIAL_SUMMARY",
      name: "Báo cáo Tổng kết Hoạt động Trải nghiệm",
      category: "TRAI_NGHIEM",
      categoryLabel: "Trải nghiệm",
      description: "Tỷ lệ tham gia, vai trò học sinh, xếp loại rubric và kết quả toàn trường.",
      sourceModule: "Hoạt động trải nghiệm",
      supportedFormats: ["EXCEL", "PDF"],
      targetRole: "Đoàn Đội, GVCN, BGH"
    }
  ]

  const filtered = selectedCat === "ALL" ? reports : reports.filter(r => r.category === selectedCat)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#003B3A]" />
            <span>Trung tâm Báo cáo Chuẩn hóa (Reporting Center)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh mục các mẫu báo cáo thống nhất toàn hệ thống SSM
          </p>
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1 text-xs">
          {["ALL", "HOC_SINH", "KHAO_THI", "DU_GIO", "TRAI_NGHIEM"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCat(c)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedCat === c ? "bg-[#003B3A] text-white font-semibold" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {c === "ALL" ? "Tất cả" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 text-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                  {r.categoryLabel}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Nguồn: {r.sourceModule}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-1.5">{r.name}</h4>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">{r.description}</p>
              <div className="text-[11px] text-slate-500 mt-2">Đối tượng: {r.targetRole}</div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              {r.supportedFormats.includes("EXCEL") && (
                <button
                  type="button"
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold flex items-center gap-1 hover:bg-emerald-100 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel</span>
                </button>
              )}
              {r.supportedFormats.includes("PDF") && (
                <button
                  type="button"
                  className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-md font-semibold flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PDF</span>
                </button>
              )}
              {r.supportedFormats.includes("PRINT") && (
                <button
                  type="button"
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-semibold flex items-center gap-1 hover:bg-slate-200 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ấn A4</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
