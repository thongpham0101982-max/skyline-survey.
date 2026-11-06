"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowRight, 
  Award, 
  ClipboardList, 
  Compass, 
  GraduationCap, 
  HeartHandshake, 
  Sparkles, 
  User, 
  School, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  MessageSquareText,
  Clock,
  ShieldCheck,
  Bell
} from "lucide-react"
import { useCampusTheme, resolveCampusTheme } from "@/hooks/useCampusTheme"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"

interface ParentDashboardClientProps {
  parent: any
  defaultYear: any
  childrenList: any[]
  userSession: any
}

export default function ParentDashboardClient({
  parent,
  defaultYear,
  childrenList = [],
  userSession
}: ParentDashboardClientProps) {
  // Quản lý học sinh đang được chọn (Active Child)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    childrenList[0]?.id || ""
  )

  const activeChild = useMemo(() => {
    if (!childrenList.length) return null
    return childrenList.find(c => c.id === selectedStudentId) || childrenList[0]
  }, [childrenList, selectedStudentId])

  // Lấy mã hoặc tên cơ sở của học sinh đang chọn
  const campusIdentifier = useMemo(() => {
    if (!activeChild) return "CS1"
    const fromClassCampus = activeChild.class?.campus?.campusCode || activeChild.class?.campus?.campusName
    if (fromClassCampus) return fromClassCampus
    if (activeChild.class?.className) return activeChild.class.className
    if (activeChild.campusId) return activeChild.campusId
    return "CS1"
  }, [activeChild])

  // Theme động bám sát cơ sở của con đang chọn
  const campusTheme = useCampusTheme(campusIdentifier)

  // Tên phụ huynh hiển thị trang trọng
  const parentDisplayName = useMemo(() => {
    let rawName = parent?.parentName || userSession?.user?.name || "Phụ huynh"
    rawName = rawName.replace(/^Phụ\s*huynh\s*/i, '').trim()
    return rawName ? `Quý Phụ huynh ${rawName}` : "Quý Phụ huynh"
  }, [parent, userSession])

  // Phân giải tên GVCN của con đang chọn
  const homeroomTeacherName = useMemo(() => {
    if (!activeChild) return "Chưa cập nhật"
    if (activeChild.homeroomTeacherName) return activeChild.homeroomTeacherName
    if (activeChild.gvcnName) return activeChild.gvcnName
    const teachers = activeChild.class?.teachers || []
    const hr = teachers.find((t: any) => t.roleInClass === 'HOMEROOM' || t.roleInClass === 'GVCN') || teachers[0]
    return hr?.teacher?.teacherName || "Thầy/Cô GVCN"
  }, [activeChild])

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans text-slate-800 pb-16 pt-1 animate-in fade-in duration-500">
      
      {/* 1. THANH CHỌN CON (CHILD SWITCHER BAR) - NẾU CÓ TỪ 2 CON TRỞ LÊN HOẶC HIỂN THỊ CON HIỆN TẠI */}
      {childrenList.length > 1 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 px-2">
            <User className="w-4 h-4 text-teal-600" />
            <span>Chọn con em theo dõi:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {childrenList.map((child: any) => {
              const isSelected = child.id === (activeChild?.id || "")
              const childCampusText = child.class?.campus?.campusName || child.class?.className || "Sky-Line"
              const childTheme = resolveCampusTheme(childCampusText)
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedStudentId(child.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-md scale-102"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: childTheme.primaryColor }}
                  />
                  <span>{child.studentName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}>
                    {child.class?.className || "Lớp"}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* 2. HERO BANNER ĐỒNG BỘ NHẬN DIỆN TRƯỜNG HỌC SKY-LINE */}
      <UserWelcomeCard
        userName={parentDisplayName}
        greetingTitle={`Xin chào, ${parentDisplayName}!`}
        greetingSubtitle={`Đồng hành cùng con em phát triển toàn diện tại ${campusTheme.name} trong năm học ${defaultYear?.name || "2026-2027"}.`}
        campusName={campusTheme.name}
        campusCode={campusTheme.code}
        roleBadgeText="CỔNG PHỤ HUYNH"
        teacherCode={activeChild?.studentCode}
        codeLabel="Mã HS"
        academicYear={defaultYear?.name || "2026-2027"}
        showAcademicYear={true}
        customMetaChips={
          activeChild ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/95 border border-slate-200/80 text-slate-700 shadow-2xs">
                <User className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                <span>Học sinh: {activeChild.studentName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/95 border border-slate-200/80 text-slate-700 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-[#AE882E] shrink-0" />
                <span>Lớp: {activeChild.class?.className || "---"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/95 border border-slate-200/80 text-slate-700 shadow-2xs">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>GVCN: {homeroomTeacherName}</span>
              </span>
            </>
          ) : undefined
        }
      />

      {/* 3. KHỐI THẺ 4 TÍNH NĂNG CHÍNH (ACTION HUB) - CHUẨN ĐẸP, BÁM SÁT BRAND SKY-LINE */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Hệ Thống Quản Lý & Đồng Hành 3 Chiều</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nền tảng liên thông trực tiếp giữa Phụ huynh, Giáo viên Chủ nhiệm và Con em học sinh Sky-Line.
            </p>
          </div>
          {activeChild && (
            <span 
              className="text-[11px] font-black px-3 py-1 rounded-full self-start sm:self-auto border"
              style={{
                backgroundColor: campusTheme.lightAccentBg,
                color: campusTheme.primaryColor,
                borderColor: campusTheme.borderSubtle
              }}
            >
              Học sinh: {activeChild.studentName} ({activeChild.class?.className || "---"})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD 1: ĐIỂM KIỂM TRA (ĐỔI TỪ KẾT QUẢ KHẢO SÁT) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner border group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: campusTheme.lightAccentBg,
                  borderColor: campusTheme.borderSubtle
                }}
              >
                <Award className="w-7 h-7" style={{ color: campusTheme.primaryColor }} />
              </div>
              <div>
                <span 
                  className="text-[10px] font-black uppercase tracking-widest block"
                  style={{ color: campusTheme.primaryColor }}
                >
                  TÍNH NĂNG TRỌNG TÂM
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors mt-0.5">
                  Điểm Kiểm Tra
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem phiếu báo điểm các kỳ kiểm tra định kỳ của con, theo dõi nhận xét chi tiết và trực tiếp trao đổi phản hồi cùng Thầy Cô GVCN.
              </p>
            </div>

            <Link 
              href="/parent/grades"
              className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${campusTheme.buttonGradient} text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer`}
            >
              <span>Xem bảng điểm & Trao đổi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 2: KHẢO SÁT ĐỊNH KỲ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-inner border border-amber-100 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                  ĐỒNG HÀNH & GÓP Ý
                </span>
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
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 3: CỐ VẤN HỌC TẬP & NHẬT KÝ GVCN */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner border group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: campusTheme.lightBg,
                  borderColor: campusTheme.borderSubtle
                }}
              >
                <Compass className="w-7 h-7" style={{ color: campusTheme.darkColor }} />
              </div>
              <div>
                <span 
                  className="text-[10px] font-black uppercase tracking-widest block"
                  style={{ color: campusTheme.primaryColor }}
                >
                  ĐỒNG HÀNH 3 CHIỀU
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-slate-800 transition-colors mt-0.5">
                  Cố Vấn & Nhật Ký GVCN
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Theo dõi bảng mục tiêu năm học của con, xem tiến độ Check-in và <strong className="text-slate-700">sổ nhật ký cố vấn/lời dặn dò từ GVCN</strong>.
              </p>
            </div>

            <Link 
              href="/parent/children/advisory"
              className={`w-full py-3.5 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer`}
              style={{ backgroundColor: campusTheme.darkColor }}
            >
              <span>Theo dõi Cố vấn & Nhật ký</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 4: HỒ SƠ HỌC TẬP 360° */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shadow-inner border border-sky-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest block">
                  HỒ SƠ TOÀN DIỆN
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-0.5">
                  Hồ Sơ Học Tập 360°
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem học bạ MOET, điểm số các môn, rèn luyện đạo đức, khen thưởng và ma trận radar đánh giá năng lực học sinh.
              </p>
            </div>

            <Link 
              href="/parent/children/profile"
              className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-300 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Xem Hồ sơ 360°</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 5: TRAO ĐỔI & ĐỒNG HÀNH (PHỐI HỢP GIÁO DỤC) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <MessageSquareText className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#00736E] uppercase tracking-widest block">
                  KẾT NỐI GVCN & GVBM
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#003B3A] transition-colors mt-0.5">
                  Trao Đổi & Đồng Hành
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Liên hệ trực tiếp với <strong className="text-slate-700">GVCN và Giáo viên Bộ môn</strong> đúng phân công của con, theo dõi tiến độ xử lý ý kiến và đánh giá chất lượng CSAT/NPS.
              </p>
            </div>

            <Link 
              href="/parent/trao-doi-dong-hanh"
              className="w-full py-3.5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở Trao đổi & Đồng hành</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 6: HỌP PHỤ HUYNH SỐ & ĐIỂM DANH QR */}
          <div className="bg-white rounded-3xl p-6 border border-teal-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#00A19A] uppercase tracking-widest block">
                  HỌP PHỤ HUYNH SỐ
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#00A19A] transition-colors mt-0.5">
                  Lịch Họp, QR & Biên Bản
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xác nhận tham dự họp PHHS, mở <strong className="text-slate-700">mã QR điểm danh điện tử</strong>, gửi câu hỏi trước/trong/sau cuộc họp và xem Biên bản họp lớp chính thức.
              </p>
            </div>

            <Link 
              href={`/parent/hop-phu-huynh${activeChild?.id ? `?studentId=${activeChild.id}` : ""}`}
              className="w-full py-3.5 rounded-2xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-teal-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở Họp Phụ Huynh Số</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 7: TRUNG TÂM THÔNG BÁO & LIÊN LẠC */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#00736E] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <Bell className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#00736E] uppercase tracking-widest block">
                  KHẢO THÍ • GIÁO VIÊN • HỌC TẬP
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#003B3A] transition-colors mt-0.5">
                  Trung Tâm Thông Báo
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Nhận thông báo chính thức về <strong className="text-slate-700">Lịch kiểm tra, Phòng thi, Kết quả khảo thí</strong> từ Ban KT&ĐBCL và dặn dò từ GVCN/GVBM, xác nhận đã xem và phản hồi trực tiếp.
              </p>
            </div>

            <Link 
              href={`/parent/thong-bao${activeChild?.id ? `?studentId=${activeChild.id}` : ""}`}
              className="w-full py-3.5 rounded-2xl bg-[#00736E] hover:bg-[#005F5B] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở Hộp Thư Thông Báo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>

      {/* 4. BANNER DẶN DÒ & THÔNG ĐIỆP ĐỒNG HÀNH */}
      <div 
        className="rounded-3xl p-5 sm:p-6 border transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          backgroundColor: campusTheme.lightAccentBg,
          borderColor: campusTheme.borderSubtle
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: campusTheme.primaryColor,
              color: "#FFFFFF"
            }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">
              Kênh Thông Tin Chính Thống Của Hệ Thống Giáo Dục Sky-Line
            </h4>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Mọi dữ liệu điểm kiểm tra, phiếu khảo sát và nhật ký cố vấn được bảo mật và liên thông trực tiếp với Nhà trường.
            </p>
          </div>
        </div>

        <Link
          href="/parent/children/advisory"
          className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl bg-white text-slate-800 shadow-xs border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
        >
          <span>Xem lời dặn GVCN</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  )
}
