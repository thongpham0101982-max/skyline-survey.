export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { 
  Users, 
  ArrowRight, 
  ClipboardList, 
  GraduationCap, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Award, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight,
  Heart,
  Plus,
  Zap,
  Activity,
  FileText
} from "lucide-react"
import Link from "next/link"
import { LinkStudentModal } from "@/components/LinkStudentModal"

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

  let parent = null
  let defaultYear = null
  let surveys: any[] = []

  try {
    parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: { 
                  include: { 
                    campus: true 
                  } 
                },
                academicYear: true,
                surveyForms: { select: { id: true, status: true, surveyPeriodId: true } },
                advisoryStatuses: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                },
                goals: {
                  take: 3
                }
              }
            }
          }
        }
      }
    })
  } catch (e) {
    console.error("Error fetching parent profile:", e)
  }

  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error fetching default academic year:", e)
  }

  try {
    surveys = await prisma.surveyPeriod.findMany({
      where: {
        status: "ACTIVE",
        targetAudience: "PHHS",
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: "asc" }
    })
  } catch (e) {
    console.error("Error fetching active surveys:", e)
  }

  const rawChildren = (parent?.students || [])
    .map(s => s.student)
    .filter((child): child is NonNullable<typeof child> => Boolean(child))

  const filteredChildren = rawChildren.filter(child =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  // Safe fallback to rawChildren if filtering by year yields 0
  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  // Clean Parent Display Name
  let rawName = parent?.parentName || session?.user?.name || "Phụ huynh"
  rawName = rawName.replace(/^Phụ\s*huynh\s*/i, '').trim()
  const parentDisplayName = rawName ? `Quý Phụ huynh ${rawName}` : "Quý Phụ huynh"

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans text-slate-800 pb-16 pt-2">
      
      {/* 1. Header Banner Chào Mừng Đẳng Cấp & Chuẩn Bố Cục */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] p-6 sm:p-8 lg:p-10 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-60 h-60 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-teal-100">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>CỔNG THÔNG TIN PHỤ HUYNH • SKYLINE ACADEMY</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-normal flex flex-wrap items-center gap-2">
              <span>Xin chào</span>
              <span className="text-amber-300 font-black">{parentDisplayName}</span>
              <span>! 👋</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Chào mừng Quý Phụ huynh đến với cổng thông tin đồng hành cùng con em trong năm học <span className="font-extrabold text-white bg-white/20 px-3 py-0.5 rounded-full">{defaultYear?.name || '2026 - 2027'}</span>.
            </p>
          </div>

          {/* Right Badge Box */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 bg-white/15 backdrop-blur-md border border-white/25 p-4 rounded-2xl shadow-sm">
            <div className="text-left md:text-right space-y-0.5">
              <div className="text-[10px] font-extrabold text-teal-200 uppercase tracking-widest">Học sinh liên kết</div>
              <div className="text-2xl font-black text-white">{children.length} học sinh</div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30">
                ✓ Đồng hành 360°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Danh Sách Con Em Đồng Hành */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00A99D]" />
              <span>Danh Sách Con Em Đồng Hành ({children.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Theo dõi sát sao tình hình học tập, hồ sơ 360° và phiếu mục tiêu cá nhân của từng con em.
            </p>
          </div>

          <div className="shrink-0">
            <LinkStudentModal />
          </div>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-teal-50 text-[#00A99D] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Tài khoản chưa có thông tin Học sinh liên kết</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Quý Phụ huynh vui lòng nhấn nút <strong className="text-[#00A99D]">+ Bổ sung mã Học sinh</strong> ở trên để liên kết mã con em. Hệ thống sẽ tự động cập nhật thông tin ngay khi xác nhận.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child: any) => {
              const latestStatus = child.advisoryStatuses?.[0]?.statusColor || "GREEN"
              const completedFormsCount = child.surveyForms?.filter((f: any) => f?.status === 'COMPLETED').length || 0
              const totalSurveys = surveys.length

              return (
                <div 
                  key={child.id} 
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group font-sans"
                >
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D]" />

                  <div className="space-y-4">
                    {/* Header Thẻ Con */}
                    <div className="flex justify-between items-start pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00A99D] flex items-center justify-center font-bold text-xl shadow-inner border border-teal-100 shrink-0">
                        <GraduationCap className="w-6 h-6 text-[#003B3A]" />
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Mã Học Sinh</span>
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 inline-block font-mono">
                          {child.studentCode || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Tên & Lớp */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#003B3A] transition-colors">
                        {child.studentName || 'Học sinh'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                        <span className="bg-teal-50 text-[#003B3A] px-2.5 py-0.5 rounded-md font-extrabold border border-teal-100">
                          Lớp: {child.class?.className || 'N/A'}
                        </span>
                        <span>•</span>
                        <span>{child.class?.campus?.campusName || 'Skyline Campus'}</span>
                      </div>
                    </div>

                    {/* Quick Status Pill Boxes */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-teal-600" />
                          <span>Tín hiệu Cố vấn:</span>
                        </span>
                        <span className={"px-3 py-0.5 rounded-full text-[10px] font-black border " + (
                          latestStatus === "RED" ? "bg-rose-100 text-rose-800 border-rose-200" :
                          latestStatus === "YELLOW" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          "bg-emerald-100 text-emerald-800 border-emerald-200"
                        )}>
                          {latestStatus === "RED" ? "🔴 Cần hỗ trợ" : latestStatus === "YELLOW" ? "🟡 Theo dõi" : "🟢 Phát triển tốt"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4 text-amber-500" />
                          <span>Khảo sát định kỳ:</span>
                        </span>
                        <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {completedFormsCount}/{totalSurveys} Đã hoàn thành
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2 Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-5 border-t border-slate-100 mt-5">
                    <Link 
                      href="/parent/children/advisory"
                      className="px-3 py-2.5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
                    >
                      <Compass className="w-3.5 h-3.5 text-teal-300" />
                      <span>Cố Vấn Học Tập</span>
                    </Link>

                    <Link 
                      href="/parent/children/profile"
                      className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center border border-slate-200"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                      <span>Hồ Sơ 360°</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Các Tính Năng Quản Lý Chính */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Hệ Thống Quản Lý & Đồng Hành</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Khảo Sát Định Kỳ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-inner border border-amber-100">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">TÍNH NĂNG 01</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  Khảo Sát Định Kỳ
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Đóng góp ý kiến về chất lượng giảng dạy, dịch vụ bán trú và cơ sở vật chất định kỳ từ Phụ huynh.
              </p>
            </div>

            <Link 
              href="/parent/surveys"
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Cố Vấn & Mục Tiêu Đồng Hành */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00A99D] flex items-center justify-center font-bold shadow-inner border border-teal-100">
                <Compass className="w-6 h-6 text-[#003B3A]" />
              </div>
              <div>
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block">TÍNH NĂNG 02</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-[#00A99D] transition-colors">
                  Cố Vấn & Mục Tiêu Đồng Hành
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Theo dõi bảng mục tiêu năm học chuẩn Khối của con, xem tiến độ Check-in từ Thầy Cô và ký cam kết đồng hành.
              </p>
            </div>

            <Link 
              href="/parent/children/advisory"
              className="w-full py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center"
            >
              <span>Theo dõi Cố vấn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Hồ Sơ Học Sinh 360° */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shadow-inner border border-sky-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest block">TÍNH NĂNG 03</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                  Hồ Sơ Học Sinh 360°
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem học bạ MOET, điểm số các môn, rèn luyện đạo đức, khen thưởng và kết quả khảo sát đầu vào.
              </p>
            </div>

            <Link 
              href="/parent/children/profile"
              className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center"
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
