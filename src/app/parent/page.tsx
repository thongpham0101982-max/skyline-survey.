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
  Plus
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

  const children = rawChildren.filter(child =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  // Clean Parent Display Name to prevent duplicate "Phụ huynh Phụ huynh"
  let rawName = parent?.parentName || session?.user?.name || "Phụ huynh"
  rawName = rawName.replace(/^Phụs+huynhs+/i, '').trim()
  const parentDisplayName = rawName ? `Quý Phụ huynh ${rawName}` : "Quý Phụ huynh"

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* 1. Header Banner Chào Mừng Khoa Học */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A99D] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-teal-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CỔNG THÔNG TIN PHỤ HUYNH • SKYLINE ACADEMY</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-snug">
              Xin chào {parentDisplayName}!
            </h1>
            
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Chào mừng Quý Phụ huynh đến với cổng thông tin đồng hành cùng con em trong năm học <span className="font-extrabold text-white bg-white/20 px-2.5 py-0.5 rounded-full">{defaultYear?.name || '2026-2027'}</span>.
            </p>
          </div>

          {/* Right Stats & Action Pill */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl text-xs space-y-0.5 text-right">
              <div className="text-[10px] font-extrabold text-teal-200 uppercase tracking-wider">Số con đang theo học</div>
              <div className="text-lg font-black text-white">{children.length} học sinh</div>
            </div>
            
          </div>
        </div>
      </div>

      {/* 2. Danh sách Con em đồng hành */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00A99D]" />
            <span>Danh sách Con em ({children.length})</span>
          </h2>
          <LinkStudentModal />
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200/90 shadow-sm space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 bg-teal-50 text-[#00A99D] rounded-2xl flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Tài khoản chưa gắn Mã Học sinh</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                Vui lòng nhấn nút <strong className="text-[#00A99D]">+ Bổ sung mã Học sinh</strong> ở góc trên bên phải để nhập mã con em. Hệ thống sẽ tự động đối soát và cập nhật ngay sau khi Văn phòng phê duyệt.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {children.map((child: any) => {
              const latestStatus = child.advisoryStatuses?.[0]?.statusColor || "GREEN"
              const completedFormsCount = child.surveyForms?.filter((f: any) => f?.status === 'COMPLETED').length || 0
              const totalSurveys = surveys.length
              const isAllSurveysDone = totalSurveys > 0 && completedFormsCount >= totalSurveys

              return (
                <div 
                  key={child.id} 
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A99D]" />

                  <div>
                    {/* Header Thẻ con */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#00A99D] flex items-center justify-center font-bold text-lg shadow-inner border border-teal-100">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Mã Học Sinh</span>
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">{child.studentCode || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Tên & Lớp */}
                    <h3 className="text-lg font-black text-slate-900 mb-1">
                      {child.studentName || 'Học sinh'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-5">
                      <span className="bg-teal-50 text-[#003B3A] px-2 py-0.5 rounded-md font-extrabold border border-teal-100">
                        Lớp: {child.class?.className || 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{child.class?.campus?.campusName || 'Skyline Campus'}</span>
                    </div>

                    {/* Quick Status */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-teal-600" />
                          <span>Tự học & Cố vấn:</span>
                        </span>
                        <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black " + (
                          latestStatus === "RED" ? "bg-rose-100 text-rose-700" :
                          latestStatus === "YELLOW" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {latestStatus === "RED" ? "🔴 Cần hỗ trợ" : latestStatus === "YELLOW" ? "🟡 Theo dõi" : "🟢 Phát triển tốt"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
                          <span>Khảo sát định kỳ:</span>
                        </span>
                        <span className={"px-2.5 py-0.5 rounded-full text-[10px] font-black " + (
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
                  <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
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

      {/* 3. Hệ Thống Quản Lý Chính (3 Core Feature Highlight Cards) */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Hệ thống quản lý chính</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Khảo sát định kỳ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">TÍNH NĂNG 01</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors mt-0.5">
                  Khảo sát định kỳ
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                  Đóng góp ý kiến về chất lượng giảng dạy, dịch vụ bán trú và cơ sở vật chất định kỳ.
                </p>
              </div>

              {surveys.length > 0 && (
                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-amber-800 font-bold">
                    <span>Đợt khảo sát mới:</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black">
                      {surveys.length} đợt
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate font-semibold">
                    {surveys[0].name}
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/parent/surveys"
              className="mt-5 w-full py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-sm shadow-amber-200"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Cố vấn & Mục tiêu đồng hành */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#00A99D] flex items-center justify-center border border-teal-100">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black text-[#00A99D] uppercase tracking-widest block">TÍNH NĂNG 02</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-[#00A99D] transition-colors mt-0.5">
                  Cố vấn & Mục tiêu đồng hành
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                  Theo dõi bảng mục tiêu năm học của con, gửi lời nhắn động viên và ký cam kết đồng hành.
                </p>
              </div>

              <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-teal-800 font-bold">
                  <span>Trạng thái kết nối:</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-black">
                    Sẵn sàng
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Gửi lời nhắn & Ký số cam kết đồng hành
                </p>
              </div>
            </div>

            <Link
              href="/parent/children/advisory"
              className="mt-5 w-full py-2.5 rounded-2xl bg-[#003B3A] text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-[#004D4A] transition-all shadow-sm shadow-teal-900/10"
            >
              <span>Theo dõi Cố vấn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Hồ sơ Học sinh 360° */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest block">TÍNH NĂNG 03</span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-0.5">
                  Hồ sơ Học sinh 360°
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                  Xem học bạ MOET, điểm số các môn, rèn luyện đạo đức, khen thưởng và khảo sát đầu vào.
                </p>
              </div>

              <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-sky-800 font-bold">
                  <span>Dữ liệu học sinh:</span>
                  <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-black">
                    Cập nhật 360°
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Kết quả học tập, rèn luyện & thành tích
                </p>
              </div>
            </div>

            <Link
              href="/parent/children/profile"
              className="mt-5 w-full py-2.5 rounded-2xl bg-sky-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-sky-700 transition-all shadow-sm shadow-sky-200"
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
