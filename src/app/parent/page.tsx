export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentProfileWithStudents, resolveHomeroomTeacher } from "@/lib/parentData"
import { 
  Users, 
  ArrowRight, 
  ClipboardList, 
  GraduationCap, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  UserCheck, 
  AlertCircle,
  ShieldCheck, 
  School,
  FileSpreadsheet,
  Layers,
  HeartHandshake
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
  let parentSurveys: any[] = []
  let studentSurveys: any[] = []

  try {
    parent = await getParentProfileWithStudents(userId)
  } catch (e) {
    console.error("Error fetching parent profile via getParentProfileWithStudents:", e)
  }

  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error fetching default academic year:", e)
  }

  try {
    parentSurveys = await prisma.surveyPeriod.findMany({
      where: {
        status: "ACTIVE",
        targetAudience: "PHHS",
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: "asc" }
    })
  } catch (e) {
    console.error("Error fetching parent surveys:", e)
  }

  try {
    studentSurveys = await prisma.surveyPeriod.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { targetAudience: { contains: "HS" } },
          { targetAudience: { contains: "Hoc" } },
          { targetAudience: { contains: "học" } },
          { targetAudience: { contains: "HỌC" } }
        ],
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: "asc" }
    })
  } catch (e) {
    console.error("Error fetching student surveys:", e)
  }

  const rawChildren = (parent?.students || [])
    .map((s: any) => s.student)
    .filter((child: any): child is NonNullable<typeof child> => Boolean(child))

  const filteredChildren = rawChildren.filter((child: any) =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  // Lookup homeroom teacher name for each child using shared helper
  const childrenWithGVCN = await Promise.all(
    children.map(async (child: any) => {
      const gvcnName = await resolveHomeroomTeacher(child)
      return {
        ...child,
        gvcnName
      }
    })
  )

  // Clean Parent Display Name
  let rawName = parent?.parentName || session?.user?.name || "Phụ huynh"
  rawName = rawName.replace(/^Phụ\s*huynh\s*/i, '').trim()
  const parentDisplayName = rawName ? `Quý Phụ huynh ${rawName}` : "Quý Phụ huynh"

  // Survey summary stats across all children
  let totalParentTasks = 0
  let completedParentTasks = 0
  let totalStudentTasks = 0
  let completedStudentTasks = 0

  childrenWithGVCN.forEach((child: any) => {
    // Parent survey forms for this child
    parentSurveys.forEach(period => {
      totalParentTasks++
      const done = child.surveyForms?.some((f: any) => f.surveyPeriodId === period.id && f.parentId === parent?.id && (f.status === 'COMPLETED' || f.status === 'SUBMITTED'))
      if (done) completedParentTasks++
    })
    // Student survey forms
    studentSurveys.forEach(period => {
      totalStudentTasks++
      const done = child.surveyForms?.some((f: any) => f.surveyPeriodId === period.id && (!f.parentId || f.parentId === null) && (f.status === 'COMPLETED' || f.status === 'SUBMITTED'))
      if (done) completedStudentTasks++
    })
  })

  const pendingParentSurveysCount = totalParentTasks - completedParentTasks

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans text-slate-800 pb-16 pt-2 animate-in fade-in duration-500">
      
      {/* Smart Survey Reminder Alert Banner */}
      {pendingParentSurveysCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-amber-900">
                Quý Phụ huynh có {pendingParentSurveysCount} phiếu khảo sát đang mở cần đóng góp ý kiến
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                Ý kiến của Quý Phụ huynh giúp Sky-Line liên tục nâng cao chất lượng giáo dục và chăm sóc học sinh.
              </p>
            </div>
          </div>
          <Link
            href="/parent/surveys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition-all shrink-0"
          >
            <span>Làm khảo sát ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

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
              <div className="text-2xl sm:text-3xl font-black text-white">{childrenWithGVCN.length} học sinh</div>
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

      {/* 2. Overview KPI Cards: Đồng bộ 3 Chiều HS - GVCN - PHHS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center shrink-0 border border-teal-100 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Con em đồng hành</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{childrenWithGVCN.length} <span className="text-xs font-bold text-slate-400">HS</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-inner">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Khảo sát Phụ huynh</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600">{completedParentTasks}/{totalParentTasks} <span className="text-xs font-bold text-slate-400">đã nộp</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Khảo sát Con em (HS)</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600">{completedStudentTasks}/{totalStudentTasks} <span className="text-xs font-bold text-slate-400">tại trường</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sky-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 shadow-inner">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest">GVCN Đồng hành</p>
            <p className="text-sm sm:text-base font-black text-slate-800 line-clamp-1">
              {childrenWithGVCN[0]?.gvcnName || "Thầy Cô GVCN"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Danh Sách Con Em Đồng Hành */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#48BFE3]" />
              <span>Danh Sách Con Em Đồng Hành ({childrenWithGVCN.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Đồng bộ dữ liệu học tập, giáo viên chủ nhiệm và tiến độ phiếu khảo sát của từng con em.
            </p>
          </div>

          <Link
            href="/parent/surveys"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black shadow-sm transition-all active:scale-95"
          >
            <ClipboardList className="w-4 h-4 text-teal-300" />
            <span>Xem tất cả khảo sát &rarr;</span>
          </Link>
        </div>

        {childrenWithGVCN.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-teal-50 text-[#003B3A] rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-teal-100">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Tài khoản chưa có thông tin Học sinh liên kết</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Quý Phụ huynh vui lòng liên hệ Ban Giám hiệu hoặc Giáo viên Chủ nhiệm để được hỗ trợ liên kết thông tin con em vào tài khoản.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {childrenWithGVCN.map((child: any) => {
              const latestStatus = child.advisoryStatuses?.[0]?.statusColor || "GREEN"
              
              // Parent surveys for this child
              const childParentDone = parentSurveys.filter(p => 
                child.surveyForms?.some((f: any) => f.surveyPeriodId === p.id && f.parentId === parent?.id && (f.status === 'COMPLETED' || f.status === 'SUBMITTED'))
              ).length

              // Student surveys for this child
              const childStudentDone = studentSurveys.filter(p => 
                child.surveyForms?.some((f: any) => f.surveyPeriodId === p.id && (!f.parentId || f.parentId === null) && (f.status === 'COMPLETED' || f.status === 'SUBMITTED'))
              ).length

              return (
                <div 
                  key={child.id} 
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group font-sans"
                >
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3]" />

                  <div className="space-y-4">
                    {/* Header Thẻ Con */}
                    <div className="flex justify-between items-start pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center font-bold text-xl shadow-inner border border-teal-100 shrink-0 group-hover:scale-105 transition-transform">
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

                    {/* GVCN Đồng hành Box */}
                    <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-[#003B3A]" />
                        <span>GVCN Chủ nhiệm:</span>
                      </span>
                      <strong className="text-[#003B3A] font-extrabold">{child.gvcnName}</strong>
                    </div>

                    {/* Quick Status Pill Boxes */}
                    <div className="space-y-2.5 pt-1 text-xs">
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

                      {/* Khảo sát 3 chiều: PHHS vs Con em */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-bold flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
                            <span>Khảo sát Phụ huynh:</span>
                          </span>
                          <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {childParentDone}/{parentSurveys.length} hoàn thành
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-600 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Khảo sát Con em (HS):</span>
                          </span>
                          <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {childStudentDone}/{studentSurveys.length} hoàn thành
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mt-4 text-center">
                    <Link 
                      href="/parent/children/advisory"
                      className="py-2.5 px-2 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-[11px] font-black flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
                    >
                      <Compass className="w-4 h-4 text-teal-300" />
                      <span>Cố Vấn</span>
                    </Link>

                    <Link 
                      href="/parent/children/profile"
                      className="py-2.5 px-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-sky-200/80"
                    >
                      <GraduationCap className="w-4 h-4 text-sky-600" />
                      <span>Hồ Sơ 360°</span>
                    </Link>

                    <Link 
                      href="/parent/surveys"
                      className="py-2.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-amber-200/80"
                    >
                      <ClipboardList className="w-4 h-4 text-amber-600" />
                      <span>Khảo Sát</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Các Tính Năng Quản Lý Cốt Lõi Đồng Hành */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Hệ Thống Quản Lý & Đồng Hành 3 Chiều</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Khảo Sát Định Kỳ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
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
                Đóng góp ý kiến về chất lượng dạy học, dịch vụ bán trú và theo dõi đồng bộ tiến độ phiếu khảo sát của con em tại trường cùng GVCN.
              </p>
            </div>

            <Link 
              href="/parent/surveys"
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all active:scale-95 text-center"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Cố Vấn & Mục Tiêu Đồng Hành */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center font-bold shadow-inner border border-teal-100">
                <Compass className="w-6 h-6 text-[#003B3A]" />
              </div>
              <div>
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block">TÍNH NĂNG 02</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-[#48BFE3] transition-colors">
                  Cố Vấn & Mục Tiêu Đồng Hành
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Theo dõi bảng mục tiêu năm học chuẩn Khối của con, xem tiến độ Check-in từ Thầy Cô GVCN và ký cam kết đồng hành 3 bên.
              </p>
            </div>

            <Link 
              href="/parent/children/advisory"
              className="w-full py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-teal-900/20 transition-all active:scale-95 text-center"
            >
              <span>Theo dõi Cố vấn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Hồ sơ học tập HS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shadow-inner border border-sky-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest block">TÍNH NĂNG 03</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                  Hồ sơ học tập 360°
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem học bạ MOET, điểm số các môn, rèn luyện đạo đức, khen thưởng và ma trận radar đánh giá năng lực học sinh.
              </p>
            </div>

            <Link 
              href="/parent/children/profile"
              className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-300 transition-all active:scale-95 text-center"
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
