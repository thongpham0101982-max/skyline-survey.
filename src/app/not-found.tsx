import Link from "next/link"
import { Home, ArrowLeft, ShieldAlert } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200/80 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-teal-700 uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Mã lỗi 404
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight pt-2">
            Không tìm thấy trang yêu cầu
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Đường dẫn bạn vừa truy cập không tồn tại, đã bị đổi tên hoặc chuyển sang vị trí mới trên hệ thống SSQM SkyLineSchool.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-md transition-all"
          >
            <Home className="w-4 h-4" /> Về Trang Chủ
          </Link>
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Trang Quản Trị
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          Hệ thống Quản trị & Khảo sát Chất lượng Giáo dục Skyline
        </div>
      </div>
    </div>
  )
}
