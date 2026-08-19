"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardCheck, Compass, Feather, Heart, Sparkles, ArrowRight,
  User, Award, Star, CheckCircle2, MessageSquare, Camera, ShieldCheck,
  BookOpen, ChevronRight, Activity, Calendar
} from "lucide-react"

function parseGradeNumber(className: string): string {
  if (!className) return "8"
  const str = className.toUpperCase().trim()
  const match = str.match(/(?:KHỐI|LỚP|K)?s*(d{1,2})/)
  if (match && match[1]) {
    const num = parseInt(match[1], 10)
    if (num >= 1 && num <= 12) return String(num)
  }
  return "8"
}

export default function StudentPortalHomePage() {
  const [studentName, setStudentName] = useState("")
  const [className, setClassName] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [gradeNum, setGradeNum] = useState("8")
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
          setCampusName(data.campusName || "")
          setGradeNum(data.grade || parseGradeNumber(data.className))
          localStorage.setItem("currentStudent", JSON.stringify(data))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-teal-900 font-extrabold text-sm animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#003B3A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="tracking-wide">Đang nạp thông tin Cổng Học Sinh Sky-Line...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 font-sans text-slate-800 pb-20">
      
      {/* Dynamic Sky-Line Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-teal-700 p-6 sm:p-8 md:p-10 text-white shadow-2xl border border-teal-800/40">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 w-64 h-64 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-white/15 text-teal-200 border border-white/20 uppercase tracking-widest backdrop-blur-md shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>TRANG CHỦ HỌC SINH SKY-LINE</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Xin chào: <span className="text-teal-200 underline decoration-amber-400 decoration-wavy underline-offset-8">{studentName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed max-w-xl">
              Chúc em một ngày học tập tràn đầy cảm hứng, chủ động thiết lập mục tiêu năm học Khối {gradeNum} và tự tin chia sẻ cùng GVCN!
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/25 shadow-2xs backdrop-blur-xs">
                🏫 Lớp: {className}
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-400/25 text-amber-200 text-xs font-black flex items-center gap-1.5 border border-amber-300/30 shadow-2xs backdrop-blur-xs">
                🎓 Khối {gradeNum}
              </span>
              {studentCode && (
                <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/25 shadow-2xs backdrop-blur-xs">
                  🆔 Mã HS: {studentCode}
                </span>
              )}
              {campusName && (
                <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/25 shadow-2xs backdrop-blur-xs">
                  📍 {campusName}
                </span>
              )}
            </div>
          </div>

          {/* Mascot Mascot Card */}
          <div className="bg-white/15 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center shrink-0 w-full lg:w-auto flex flex-col items-center justify-center space-y-2 shadow-lg">
            <div className="text-6xl animate-bounce drop-shadow-md">🐧</div>
            <p className="text-xs font-black text-white">Sky-Line Penguin Mascot</p>
            <span className="text-[10px] text-teal-200 font-bold px-3 py-1 rounded-full bg-white/20 border border-white/20">
              Đồng hành 5 Trụ Cột Phát Triển
            </span>
          </div>
        </div>
      </div>

      {/* CHỨC NĂNG CHÍNH VÀ TIỆN ÍCH HỌC SINH */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>CÁC CHỨC NĂNG ĐỒNG HÀNH CÙNG HỌC SINH</span>
          </h2>
          <span className="text-xs font-extrabold text-slate-500">Tài khoản: {studentName}</span>
        </div>

        {/* 6 Responsive Main Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CHỨC NĂNG 1: KHẢO SÁT HỌC SINH */}
          <Link
            href="/hocsinh/hs-khaosat/danh-sach"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-teal-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-28 h-28 bg-teal-500/10 rounded-bl-full transition-transform group-hover:scale-110 pointer-events-none" />

            <div className="space-y-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30 group-hover:rotate-6 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  CHỨC NĂNG 1
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-teal-700 transition-colors">
                  1. Khảo Sát Học Sinh
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Thực hiện các bài khảo sát trải nghiệm học tập và hoạt động ngoại khóa dành riêng cho Lớp {className}.
                </p>
              </div>
            </div>

            <div className="pt-5 relative z-10 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-extrabold text-teal-700">Vào bài khảo sát</span>
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CHỨC NĂNG 2: SỔ MỤC TIÊU NĂM HỌC (360°) */}
          <Link
            href="/hocsinh/portal/muc-tieu"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-amber-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-28 h-28 bg-amber-500/10 rounded-bl-full transition-transform group-hover:scale-110 pointer-events-none" />

            <div className="space-y-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:-rotate-6 transition-transform">
                <Compass className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  CHỨC NĂNG 2
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-amber-700 transition-colors">
                  2. Sổ Mục Tiêu Năm Học (360°)
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Xây dựng mục tiêu năm học Khối {gradeNum}, đăng ký hành động, cam kết và đóng dấu vân tay SMART.
                </p>
              </div>
            </div>

            <div className="pt-5 relative z-10 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-extrabold text-amber-700">Mở Sổ Mục Tiêu</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CHỨC NĂNG 3: NHẬT KÝ CỐ VẤN & TỰ ĐÁNH GIÁ */}
          <Link
            href="/hocsinh/portal/nhat-ky-co-van"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-blue-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-28 h-28 bg-blue-500/10 rounded-bl-full transition-transform group-hover:scale-110 pointer-events-none" />

            <div className="space-y-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:rotate-6 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  CHỨC NĂNG 3
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                  3. Nhật Ký Cố Vấn & Tự Đánh Giá
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Xem lại nội dung cố vấn từ GVCN, thực hiện Tự Đánh Giá Sau Cố Vấn (đồng bộ GVCN) & viết Nhật ký tự phản chiếu cảm xúc (Reflection).
                </p>
              </div>
            </div>

            <div className="pt-5 relative z-10 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-extrabold text-blue-700">Mở Nhật Ký & Tự Đánh Giá</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CHỨC NĂNG 4: EM CẦN HỖ TRỢ (SOS) */}
          <Link
            href="/hocsinh/portal/ho-tro"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-rose-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-28 h-28 bg-rose-500/10 rounded-bl-full transition-transform group-hover:scale-110 pointer-events-none" />

            <div className="space-y-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30 group-hover:rotate-6 transition-transform">
                <Heart className="w-6 h-6 fill-rose-100" />
              </div>

              <div>
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  CHỨC NĂNG 5
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-rose-700 transition-colors">
                  4. Em Cần Hỗ Trợ (SOS)
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Gửi yêu cầu giúp đỡ trực tiếp tới GVCN Lớp {className}, xem trạng thái xử lý và lời nhắn hỗ trợ.
                </p>
              </div>
            </div>

            <div className="pt-5 relative z-10 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-extrabold text-rose-700">Gửi yêu cầu hỗ trợ</span>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CHỨC NĂNG 6: CẬP NHẬT ẢNH HỒ SƠ */}
          <Link
            href="/hocsinh/portal/upload-anh"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-purple-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-28 h-28 bg-purple-500/10 rounded-bl-full transition-transform group-hover:scale-110 pointer-events-none" />

            <div className="space-y-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 group-hover:-rotate-6 transition-transform">
                <Camera className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  TIỆN ÍCH HỒ SƠ
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-purple-700 transition-colors">
                  Ảnh Hồ Sơ Cá Nhân
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  Cập nhật hình ảnh thẻ học sinh và ảnh cá nhân trong hồ sơ học sinh Sky-Line.
                </p>
              </div>
            </div>

            <div className="pt-5 relative z-10 flex items-center justify-between border-t border-slate-100 mt-5">
              <span className="text-xs font-extrabold text-purple-700">Cập nhật ảnh</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

        </div>
      </div>

    </div>
  )
}
