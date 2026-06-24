import { ExamTabs } from "@/components/ExamTabs"
import { UserCheck } from "lucide-react"

export const metadata = {
  title: "Đăng ký Dự thi | Admin Portal",
  description: "Đăng ký dự thi cho học sinh"
}

export default async function StudentsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <ExamTabs activeTab="students" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Đăng Ký Dự Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">Quản lý danh sách thí sinh và số báo danh đăng ký dự thi.</p>
      </div>

      <div className="bg-white rounded-2xl p-10 border-2 border-slate-100 shadow-xs flex flex-col justify-center items-center text-center py-20">
        <div className="p-4 bg-teal-50 rounded-full text-[#00A19A] mb-2">
          <UserCheck className="w-12 h-12" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Tính năng đang được phát triển</h3>
        <p className="text-slate-400 text-xs font-semibold max-w-md mt-1">
          Chức năng đăng ký và sắp xếp phòng thi đang được chuẩn bị. Phân hệ <strong>Quản lý danh mục</strong> đã sẵn sàng để hoạt động.
        </p>
      </div>
    </div>
  )
}
