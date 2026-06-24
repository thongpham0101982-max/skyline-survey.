import React from "react"
import { ShieldCheck, Award } from "lucide-react"

export default async function Page() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#D9E2EC] pb-6">
        <div className="p-3 bg-[#E6F8FD] text-[#00B5E2] rounded-xl">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#004C97] tracking-tight">Nhập điểm & Kết quả</h1>
          <p className="text-slate-500 mt-1 font-medium">Hệ thống nhập điểm, phê duyệt kết quả thi và thống kê chất lượng</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl p-10 border border-[#D9E2EC] shadow-sm space-y-6 flex flex-col justify-center items-center text-center py-20">
        <div className="p-4 bg-[#E6F8FD] rounded-full text-[#00B5E2] mb-2">
          <Award className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-[#1E293B]">Tính năng đang được phát triển</h3>
        <p className="text-slate-400 text-sm max-w-md">
          Chức năng quản lý chi tiết đang được liên kết cơ sở dữ liệu. Nhóm người dùng <strong>Khảo thí & ĐBCL</strong> đã được phân quyền truy cập hoàn chỉnh.
        </p>
      </div>
    </div>
  )
}
