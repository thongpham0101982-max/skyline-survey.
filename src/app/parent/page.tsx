export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentProfileWithStudents } from "@/lib/parentData"
import { 
  ArrowRight, 
  ClipboardList, 
  GraduationCap, 
  Compass, 
  Sparkles, 
  HeartHandshake,
  Award
} from "lucide-react"
import Link from "next/link"

export default async function ParentDashboard() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!userId) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium font-sans">
        Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
      </div>
    )
  }

  let parent: any = null
  let defaultYear: any = null

  try {
    parent = await getParentProfileWithStudents(userId)
  } catch (e) {
    console.error("Error fetching parent profile:", e)
  }

  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error fetching default academic year:", e)
  }

  const rawChildren = (parent?.students || [])
    .map((s: any) => s.student)
    .filter((child: any): child is NonNullable<typeof child> => Boolean(child))

  const filteredChildren = rawChildren.filter((child: any) =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  // Clean Parent Display Name
  let rawName = parent?.parentName || session?.user?.name || "Phụ huynh"
  rawName = rawName.replace(/^Phụ\s*huynh\s*/i, '').trim()
  const parentDisplayName = rawName ? `Quý Phụ huynh ${rawName}` : "Quý Phụ huynh"

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans text-slate-800 pb-16 pt-2 animate-in fade-in duration-500">
      
      {/* 1. Header Banner Sky-Line Identity */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] p-6 sm:p-8 lg:p-10 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-64 h-64 rounded-full bg-teal-300/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black text-teal-100 uppercase tracking-widest shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>CỔNG THÔNG TIN PHỤ HUYNH • SKYLINE ACADEMY</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-normal flex flex-wrap items-center gap-2">
              <span>Xin chào</span>
              <span className="text-amber-300 font-black">{parentDisplayName}</span>
              <span>! 👋</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed max-w-2xl">
              Chào mừng Quý Phụ huynh đến với cổng thông tin đồng hành 3 chiều giữa <strong className="text-white">Gia Đình ⇄ Thầy Cô GVCN ⇄ Học Sinh</strong> trong năm học <span className="font-extrabold text-white bg-white/20 px-3 py-0.5 rounded-full border border-white/20">{defaultYear?.name || '2026 - 2027'}</span>.
            </p>
          </div>

          {/* Right Status Panel */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-sm">
            <div className="text-left md:text-right space-y-0.5">
              <div className="text-[10px] font-black text-teal-200 uppercase tracking-widest">Học sinh liên kết</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{children.length} học sinh</div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30 shadow-xs">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Đồng hành 360°</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hệ Thống Quản Lý & Đồng Hành 3 Chiều */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Hệ Thống Quản Lý & Đồng Hành 3 Chiều</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Nền tảng liên thông trực tiếp giữa Phụ huynh, Giáo viên Chủ nhiệm và Con em học sinh Sky-Line.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          

          {/* Card 4: Kết Quả Khảo Sát & Trao Đổi GVCN */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#005B58] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <Award className="w-7 h-7 text-[#008c82]" />
              </div>
              <div>
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block">TÍNH NĂNG MỚI</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#005B58] transition-colors mt-0.5">
                  Kết Quả Khảo Sát & Điểm Số
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem phiếu báo điểm các kỳ khảo sát định kỳ của con, theo dõi nhận xét và trực tiếp trao đổi phản hồi cùng Thầy Cô GVCN.
              </p>
            </div>

            <Link 
              href="/parent/grades"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#005B58] to-[#008c82] hover:from-[#004745] hover:to-[#007068] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-teal-900/15 transition-all active:scale-95 text-center"
            >
              <span>Xem bảng điểm & Trao đổi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 1: Khảo Sát Định Kỳ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-inner border border-amber-100 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">TÍNH NĂNG 01</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors mt-0.5">
                  Khảo Sát Định Kỳ
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Đóng góp ý kiến về chất lượng dạy học, dịch vụ bán trú và theo dõi đồng bộ tiến độ phiếu khảo sát của con em tại trường cùng GVCN.
              </p>
            </div>

            <Link 
              href="/parent/surveys"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all active:scale-95 text-center"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Cố Vấn & Mục Tiêu Đồng Hành */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <Compass className="w-7 h-7 text-[#003B3A]" />
              </div>
              <div>
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block">TÍNH NĂNG 02</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#48BFE3] transition-colors mt-0.5">
                  Cố Vấn & Mục Tiêu Đồng Hành
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Theo dõi bảng mục tiêu năm học chuẩn Khối của con, xem tiến độ Check-in từ Thầy Cô GVCN và ký cam kết đồng hành 3 bên.
              </p>
            </div>

            <Link 
              href="/parent/children/advisory"
              className="w-full py-3.5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-teal-900/20 transition-all active:scale-95 text-center"
            >
              <span>Theo dõi Cố vấn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Hồ sơ học tập HS */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shadow-inner border border-sky-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest block">TÍNH NĂNG 03</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-0.5">
                  Hồ sơ học tập 360°
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem học bạ MOET, điểm số các môn, rèn luyện đạo đức, khen thưởng và ma trận radar đánh giá năng lực học sinh.
              </p>
            </div>

            <Link 
              href="/parent/children/profile"
              className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-300 transition-all active:scale-95 text-center"
            >
              <span>Xem Hồ sơ 360°</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}
