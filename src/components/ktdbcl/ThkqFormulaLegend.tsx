"use client"

import { useState } from "react"
import { Info, ChevronDown, ChevronUp } from "lucide-react"

interface ThkqFormulaLegendProps {
  /** Chế độ hiển thị: THKQ (thống kê phổ điểm) hoặc COMMITMENT (HS cam kết đầu vào) */
  variant?: "THKQ" | "COMMITMENT"
  className?: string
}

/**
 * Bảng quy ước công thức thống kê chuẩn Ban KT&ĐBCL (Sky-Line Academic Ledger).
 * Giúp minh bạch mẫu số N, Độ lệch chuẩn tổng thể, quy tắc đồng hạng Mode và phân biệt điểm 0 với điểm thiếu.
 */
export function ThkqFormulaLegend({
  variant = "THKQ",
  className = "",
}: ThkqFormulaLegendProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-4 py-2.5 text-xs text-slate-700 ${className}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 font-semibold text-[#003B3A]">
          <Info className="w-4 h-4 text-[#008B85] shrink-0" />
          <span>
            {variant === "COMMITMENT"
              ? "Quy ước hiển thị & đối chiếu chuẩn SKL (HS cam kết đầu vào)"
              : "Quy ước công thức thống kê chuẩn KT&ĐBCL"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00736E]">
          {expanded ? "Thu gọn" : "Xem chi tiết"}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] leading-relaxed text-slate-600 tabular-nums">
          {variant === "COMMITMENT" ? (
            <>
              <div>
                <span className="font-semibold text-[#003B3A]">Phân tách theo môn:</span> Học sinh cam kết nhiều môn văn hóa (ví dụ Toán và Ngữ văn) được hiển thị thành từng dòng độc lập theo mỗi môn.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Phân biệt điểm 0 và điểm thiếu:</span> Điểm <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">0</code> là kết quả kiểm tra hợp lệ; ô chưa có điểm hiển thị <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">—</code> và không bị quy đổi thành 0.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Mũi tên chuẩn SKL:</span> <span className="font-semibold text-emerald-700">↑</span> khi điểm lớn hơn chuẩn SKL; <span className="font-semibold text-rose-700">↓</span> khi điểm nhỏ hơn chuẩn SKL; không gắn mũi tên khi bằng chuẩn hoặc chưa cấu hình chuẩn.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Định dạng điểm:</span> Dùng dấu phẩy thập phân tiếng Việt; cấp Tiểu học hiển thị số nguyên gọn cho điểm tròn, cấp THCS/THPT giữ tối thiểu 1 chữ số thập phân (trừ 0 và 10).
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-semibold text-[#003B3A]">Mẫu số hợp lệ (N):</span> Chỉ tính các điểm số hợp lệ trong đoạn [0, 10]; tự động loại trừ ô trống, điểm thiếu và giá trị ngoài miền.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Độ lệch chuẩn:</span> Áp dụng Độ lệch chuẩn tổng thể (Population StdDev, chia cho N) làm tròn 2 chữ số thập phân.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Điểm nhiều HS đạt nhất (Mode):</span> Nếu đồng hạng sẽ liệt kê đầy đủ các mức điểm tăng dần; nếu mọi điểm chỉ xuất hiện 1 lần sẽ hiển thị “Không có mức điểm nổi trội”.
              </div>
              <div>
                <span className="font-semibold text-[#003B3A]">Ranh giới phổ điểm 8 nhóm:</span> Điểm 0 và Điểm 10 tách nhóm riêng; các mốc biên 2, 4, 5, 7, 8 thuộc nhóm bắt đầu tại mốc đó (ví dụ điểm 5 thuộc [5, 7), điểm 7 thuộc [7, 8)).
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
