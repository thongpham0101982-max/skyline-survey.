import React from "react"
import { ShieldCheck, Award, FileText, CheckCircle2 } from "lucide-react"

export default async function KTDBCLPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#D9E2EC] pb-6">
        <div className="p-3 bg-[#E6F8FD] text-[#00B5E2] rounded-xl">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#004C97] tracking-tight">Khảo thí & Đảm bảo chất lượng</h1>
          <p className="text-slate-500 mt-1 font-medium">Hệ thống khảo thí, đánh giá và kiểm định chất lượng giáo dục Sky-Line</p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#D9E2EC] shadow-sm text-center space-y-2">
          <Award className="w-8 h-8 text-[#00B5E2] mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu chuẩn kiểm định</p>
          <p className="text-2xl font-black text-slate-800">ISO 21001</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#D9E2EC] shadow-sm text-center space-y-2">
          <FileText className="w-8 h-8 text-[#004C97] mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đề thi & Khảo sát</p>
          <p className="text-2xl font-black text-slate-800">Đang hoạt động</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#D9E2EC] shadow-sm text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỉ lệ hoàn thành KS</p>
          <p className="text-2xl font-black text-slate-800">98.5%</p>
        </div>
      </div>

      {/* Body Panel */}
      <div className="bg-white rounded-2xl p-8 border border-[#D9E2EC] shadow-sm space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#004C97]">Cổng thông tin & Khảo thí (KTDBCL)</h3>
          <p className="text-[#64748B] text-sm leading-relaxed">
            Đây là phân hệ dành riêng cho Ban Khảo thí và Đảm bảo chất lượng giáo dục. Chức năng chính bao gồm:
          </p>
          <ul className="text-xs text-[#64748B] mt-4 space-y-2 list-disc ml-5 font-semibold">
            <li>Quản lý ngân hàng đề và các đợt kiểm tra năng lực đầu vào.</li>
            <li>Theo dõi tiến độ khảo sát ý kiến phụ huynh, học sinh và giáo viên định kỳ.</li>
            <li>Phân tích dữ liệu, đánh giá và lập báo cáo chất lượng đào tạo năm học.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
