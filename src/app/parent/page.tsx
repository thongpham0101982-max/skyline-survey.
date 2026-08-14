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
  Heart
} from "lucide-react"
import Link from "next/link"
import { LinkStudentModal } from "@/components/LinkStudentModal"

export default async function ParentDashboard() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!userId) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
      </div>
    )
  }

  let parent = null
  let defaultYear = null
  let surveys: any[] = []

  try {
    // 1. Fetch Parent & Linked Children with full Advisory & Class details
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
    // 2. Fetch active PHHS surveys for default academic year
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

  const children = rawChildren.filter(child =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const parentDisplayName = parent?.parentName || session?.user?.name || "học sinh"

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500 font-sans">
      {/* Banner Chào Mừng */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-teal-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>CỔNG THÔNG TIN PHỤ HUYNH • SKYLINE ACADEMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-snug">
            Xin chào. Quý Phụ huynh {parentDisplayName} đã đến với cổng thông tin dành cho PHHS Sky-Line.
          </h1>
          <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed">
            Đồng hành cùng sự phát triển toàn diện của con em trong năm học <span className="font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">{defaultYear?.name || 'Năm học hiện tại'}</span>.
          </p>
        </div>
      </div>

      {/* Danh sách Thẻ Học Sinh (Child Selector Overview) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00A99D]" />
            <span>Thông tin Con em đồng hành ({children.length})</span>
          </h2>
          <LinkStudentModal />
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Chưa liên kết thông tin học sinh</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Tài khoản Phụ huynh chưa gắn mã học sinh. Vui lòng bổ sung mã học sinh hoặc liên hệ Văn phòng Nhà trường để hỗ trợ kích hoạt liên kết.
            </p>
            <div className="pt-2 flex justify-center">
              <LinkStudentModal buttonText="Bổ sung mã Học sinh ngay" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child: any) => {
              const latestStatus = child.advisoryStatuses?.[0]?.statusColor || "GREEN"
              const completedFormsCount = child.surveyForms?.filter((f: any) => f?.status === 'COMPLETED').length || 0
              const totalSurveys = surveys.length
              const isAllSurveysDone = totalSurveys > 0 && completedFormsCount >= totalSurveys

              return (
                <div 
                  key={child.id} 
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003B3A] to-[#00A99D]" />

                  <div>
                    {/* Header Thẻ con */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00A99D] flex items-center justify-center font-bold text-xl group-hover:bg-[#00A99D] group-hover:text-white transition-colors shadow-inner">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Mã Học Sinh</span>
                        <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">{child.studentCode || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Tên & Lớp */}
                    <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-[#00A99D] transition-colors">
                      {child.studentName || 'Học sinh'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
                      <span className="bg-teal-100/70 text-[#003B3A] px-2.5 py-0.5 rounded-md font-bold">
                        {child.class?.className || 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{child.class?.campus?.campusName || 'Skyline Campus'}</span>
                    </div>

                    {/* Quick Badges */}
                    <div className="space-y-2.5 pt-4 border-t border-slate-100">
                      {/* Trạng thái Cố vấn */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-teal-600" />
                          <span>Tự học & Cố vấn:</span>
                        </span>
                        <span className={"px-2.5 py-0.5 rounded-full text-[11px] font-bold " + (
                          latestStatus === "RED" ? "bg-rose-100 text-rose-700" :
                          latestStatus === "YELLOW" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {latestStatus === "RED" ? "🔴 Cần hỗ trợ" : latestStatus === "YELLOW" ? "🟡 Theo dõi" : "🟢 Phát triển tốt"}
                        </span>
                      </div>

                      {/* Khảo sát định kỳ */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4 text-amber-500" />
                          <span>Khảo sát định kỳ:</span>
                        </span>
                        <span className={"px-2.5 py-0.5 rounded-full text-[11px] font-bold " + (
                          isAllSurveysDone 
                            ? "bg-emerald-50 text-emerald-600" 
                            : totalSurveys === 0 
                            ? "bg-slate-100 text-slate-400" 
                            : "bg-amber-50 text-amber-600"
                        )}>
                          {totalSurveys === 0 ? "Không có đợt" : `${completedFormsCount}/${totalSurveys} hoàn thành`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <Link
                      href="/parent/children/advisory"
                      className="px-3 py-2 rounded-xl bg-teal-50 text-[#003B3A] text-xs font-bold text-center hover:bg-[#003B3A] hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Cố vấn</span>
                    </Link>
                    <Link
                      href="/parent/children/profile"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold text-center hover:bg-[#00A99D] hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Hồ sơ 360°</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3 Tính Năng Trọng Tâm (3 Core Feature Highlight Cards) */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Tính năng quản lý chính</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Khảo sát định kỳ */}
          <div className="bg-gradient-to-br from-white to-amber-50/50 rounded-3xl p-6 border border-amber-200/70 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">TÍNH NĂNG 01</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  Khảo sát định kỳ
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                  Đóng góp ý kiến chất lượng giảng dạy, cơ sở vật chất và dịch vụ học đường định kỳ hàng năm.
                </p>
              </div>

              {surveys.length > 0 && (
                <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-amber-800 font-bold">
                    <span>Đợt khảo sát mới:</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black">
                      {surveys.length} đợt
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-semibold">
                    {surveys[0].name}
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/parent/surveys"
              className="mt-6 w-full py-3 rounded-2xl bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-md shadow-amber-200"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Theo dõi Cố vấn & Mục tiêu */}
          <div className="bg-gradient-to-br from-white to-teal-50/50 rounded-3xl p-6 border border-teal-200/70 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#00A99D]/10 text-[#00A99D] flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#00A99D] uppercase tracking-widest block mb-1">TÍNH NĂNG 02</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#00A99D] transition-colors">
                  Cố vấn & Mục tiêu đồng hành
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                  Theo dõi bảng mục tiêu phát triển năm học của con, gửi lời nhắn động viên và ký cam kết đồng hành.
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-2xl border border-teal-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-teal-800 font-bold">
                  <span>Trạng thái kết nối:</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-black">
                    Sẵn sàng
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Gửi lời nhắn & Ký số cam kết đồng hành
                </p>
              </div>
            </div>

            <Link
              href="/parent/children/advisory"
              className="mt-6 w-full py-3 rounded-2xl bg-[#003B3A] text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-[#004D4A] transition-all shadow-md shadow-teal-900/10"
            >
              <span>Xem Cố vấn & Gửi lời nhắn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Xem Hồ sơ Học sinh 360° */}
          <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-3xl p-6 border border-sky-200/70 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-1">TÍNH NĂNG 03</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                  Hồ sơ Học sinh 360°
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                  Xem chi tiết học bạ, điểm số các môn, rèn luyện đạo đức, khen thưởng và kết quả khảo sát đầu vào.
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-2xl border border-sky-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-sky-800 font-bold">
                  <span>Dữ liệu học sinh:</span>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-black">
                    Cập nhật 360°
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Kết quả học tập, rèn luyện & thành tích
                </p>
              </div>
            </div>

            <Link
              href="/parent/children/profile"
              className="mt-6 w-full py-3 rounded-2xl bg-sky-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-sky-700 transition-all shadow-md shadow-sky-200"
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
