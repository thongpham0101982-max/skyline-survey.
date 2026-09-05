"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardCheck, Compass, Heart, Sparkles, ArrowRight,
  User, Award, Star, CheckCircle2, MessageSquare, Camera, ShieldCheck,
  BookOpen, ChevronRight, Activity, Calendar, Target, Flame, Key, Shield, Lightbulb
} from "lucide-react"

function parseGradeNumber(className: string): string {
  if (!className) return "10"
  const str = className.toUpperCase().trim()
  const match = str.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (match && match[1]) {
    const num = parseInt(match[1], 10)
    if (num >= 1 && num <= 12) return String(num)
  }
  return "10"
}

export default function StudentPortalHomePage() {
  const [studentName, setStudentName] = useState("")
  const [className, setClassName] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [gradeNum, setGradeNum] = useState("10")
  const [campusName, setCampusName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/hocsinh/me", { cache: "no-store" })
      .then(r => {
        if (!r.ok) {
          window.location.href = "/login"
          return null
        }
        return r.json()
      })
      .then(data => {
        if (data && data.studentCode) {
          setStudentName(data.studentName)
          setStudentCode(data.studentCode)
          setClassName(data.className || "Lớp Học Sinh")
          setCampusName(data.campusName || "Sky-Line")
          setGradeNum(data.grade ? String(data.grade).replace("K","") : parseGradeNumber(data.className))
          localStorage.setItem("currentStudent", JSON.stringify(data))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-teal-900 font-extrabold text-sm animate-pulse space-y-3">
        <div className="w-10 h-10 border-4 border-[#003B3A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="tracking-wide text-xs">Đang tải thông tin Cổng Học Sinh Sky-Line...</p>
      </div>
    )
  }

  const isHighSchool = ["9", "10", "11", "12"].includes(gradeNum) || /(?:^|[\s_])(9|10|11|12)[A-Z._]/i.test(className)

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 font-sans text-slate-800 pb-20">
      
      {/* 🌟 HERO BANNER: Sky-Line Signature Brand Colors */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#007A72] p-6 sm:p-8 md:p-10 text-white shadow-xl border border-teal-700/50">
        {/* Background Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-36 -bottom-16 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Greeting & Student Metadata */}
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/15 text-teal-200 border border-white/20 uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>TRANG CHỦ HỌC SINH SKY-LINE</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Xin chào, <span className="text-teal-200">{studentName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed mt-1.5 max-w-xl">
                Chúc em một ngày học tập tràn đầy cảm hứng, chủ động thiết lập mục tiêu năm học Khối {gradeNum} và mở khóa hành động bứt phá!
              </p>
            </div>

            {/* Student Info Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs backdrop-blur-xs">
                🏫 Lớp: {className}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-200 text-xs font-black flex items-center gap-1.5 border border-amber-300/30 shadow-2xs backdrop-blur-xs">
                🎓 Khối {gradeNum}
              </span>
              {studentCode && (
                <span className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs backdrop-blur-xs">
                  🆔 Mã HS: {studentCode}
                </span>
              )}
              {campusName && (
                <span className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs backdrop-blur-xs">
                  📍 {campusName}
                </span>
              )}
            </div>
          </div>

          {/* Sky-Line 5 Pillars Emblem Card */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center shrink-0 w-full lg:w-64 flex flex-col items-center justify-center space-y-2.5 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-teal-200 shadow-inner">
              <Shield className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">HỌC TẬP KHAI PHÓNG</p>
              <p className="text-[11px] text-teal-200 font-medium mt-0.5">5 Trụ Cột Phát Triển Toàn Diện</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1 pt-1">
              {["Trí tuệ", "Thể chất", "Tâm hồn", "Kỹ năng", "Hội nhập"].map((p, i) => (
                <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-white">
                  {p}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 CHỨC NĂNG CHÍNH ĐỒNG HÀNH CÙNG HỌC SINH */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>CÁC CHỨC NĂNG ĐỒNG HÀNH CÙNG HỌC SINH</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Hệ thống tiện ích học tập, rèn luyện và cố vấn cá nhân hóa</p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 self-start sm:self-auto">
            Học sinh: {studentName}
          </span>
        </div>

        {/* 🌟 FEATURE 1: ĐÁNH GIÁ NĂNG LỰC MÔN HỌC (RADAR) - HERO FEATURE CARD */}
        <Link
          href="/hocsinh/portal/danh-gia-nang-luc"
          className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-7 border-2 border-teal-200 hover:border-teal-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-teal-50/50 via-white to-white"
        >
          <div className="space-y-3 relative z-10 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] text-white flex items-center justify-center shadow-md shadow-teal-900/20 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                  TIỆN ÍCH NỔI BẬT
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 group-hover:text-teal-700 transition-colors">
                  Hồ Sơ Đánh Giá Năng Lực Môn Học (Biểu Đồ Radar)
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Theo dõi trực quan các trục năng lực môn học qua biểu đồ mạng nhện đa chiều, điểm tích lũy và chuẩn đầu ra từng học kỳ để xây dựng lộ trình học tập hiệu quả.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-xs font-black text-[#003B3A] group-hover:text-teal-700">Khám phá Radar</span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#003B3A] flex items-center justify-center group-hover:bg-[#003B3A] group-hover:text-white transition-all shadow-xs">
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 4 MAIN APP CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: SỔ MỤC TIÊU NĂM HỌC (360°) & MỞ KHÓA MỤC TIÊU (K9-12) */}
          <Link
            href="/hocsinh/portal/muc-tieu"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-teal-600 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6 text-teal-200" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    3 GIAI ĐOẠN
                  </span>
                  {isHighSchool && (
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      <span>Sprint 7N</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                  1. Sổ Mục Tiêu Năm Học & Mở Khóa Hành Động
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Xây dựng 4 nhóm mục tiêu năm học, ký cam kết vân tay và thực hiện quy trình mở khóa rào cản với Sprint hành động 7 ngày.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  G1: Mục tiêu năm
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                  G2: Mở khóa mục tiêu
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  G3: Theo dõi tiến trình
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-black text-teal-800">Vào Sổ Mục Tiêu</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center group-hover:bg-[#003B3A] group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CARD 2: KHẢO SÁT HỌC SINH */}
          <Link
            href="/hocsinh/hs-khaosat/danh-sach"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-sky-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  KHẢO SÁT TRẢI NGHIỆM
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                  2. Khảo Sát Ý Kiến & Trải Nghiệm Học Sinh
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Đóng góp ý kiến về môi trường học đường, các môn học và hoạt động trải nghiệm thực tế dành cho Lớp {className}.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                  Khảo sát định kỳ
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  Bảo mật thông tin
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-black text-sky-800">Làm bài khảo sát</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CARD 3: NHẬT KÝ CỐ VẤN & TỰ ĐÁNH GIÁ */}
          <Link
            href="/hocsinh/portal/nhat-ky-co-van"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  ĐỒNG HÀNH GVCN
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                  3. Nhật Ký Cố Vấn & Tự Đánh Giá Cá Nhân
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Xem nhận xét từ Thầy Cô GVCN, thực hiện tự đánh giá định kỳ và viết nhật ký phản chiếu suy nghĩ (Reflection).
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Nhận xét GVCN
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  Tự đánh giá kỳ
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-black text-indigo-800">Mở Nhật Ký</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CARD 4: EM CẦN HỖ TRỢ (SOS) */}
          <Link
            href="/hocsinh/portal/ho-tro"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-rose-200 hover:border-rose-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between bg-gradient-to-br from-white via-white to-rose-50/40"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Heart className="w-6 h-6 fill-white" />
                </div>
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                  LẮNG NGHE & CHIA SẺ
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                  4. Em Cần Hỗ Trợ (SOS)
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Khi gặp khó khăn về học tập, tâm lý hoặc quan hệ bạn bè, em hãy gửi tin nhắn để Thầy Cô GVCN và Phòng Tâm lý luôn ở bên cạnh em.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                  Bảo mật 100%
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  Hỗ trợ kịp thời
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-black text-rose-700">Gửi lời nhắn hỗ trợ</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

        </div>

        {/* THÔNG BÁO TIỆN ÍCH PHỤ: CẬP NHẬT ẢNH THẺ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#003B3A] flex items-center justify-center font-bold shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Ảnh Thẻ & Hồ Sơ Học Sinh</p>
              <p className="text-[11px] text-slate-500 font-medium">Em có thể tải lên hoặc cập nhật ảnh chân dung cho thẻ học sinh điện tử tại đây.</p>
            </div>
          </div>

          <Link
            href="/hocsinh/portal/upload-anh"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 text-xs font-bold transition-all border border-slate-200 shrink-0"
          >
            Cập nhật ảnh thẻ
          </Link>
        </div>

      </div>

    </div>
  )
}
