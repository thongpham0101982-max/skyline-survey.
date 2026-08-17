"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardCheck, Compass, Feather, Heart, Sparkles, ArrowRight,
  User, Award, Star, CheckCircle2, MessageSquare, Camera, ShieldCheck,
  BookOpen
} from "lucide-react"

function parseGradeNumber(className: string): string {
  if (!className) return "11"
  const str = className.toUpperCase().trim()
  const match = str.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (match && match[1]) {
    const num = parseInt(match[1], 10)
    if (num >= 1 && num <= 12) return String(num)
  }
  return "11"
}

export default function StudentPortalHomePage() {
  const [studentName, setStudentName] = useState("")
  const [className, setClassName] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [gradeNum, setGradeNum] = useState("")
  const [campusName, setCampusName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ALWAYS fetch authenticated student session from /api/hocsinh/me
    fetch("/api/hocsinh/me")
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
          setClassName(data.className || "Lớp của Em")
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
      <div className="max-w-6xl mx-auto p-12 text-center text-teal-800 font-extrabold text-sm animate-pulse space-y-2">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang nạp thông tin tài khoản học sinh...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 font-sans text-slate-800 pb-20">
      
      {/* Header Banner - Dynamic for currently logged in student */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#36E08F] p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-60 h-60 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/15 text-teal-200 border border-white/20 uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>TRANG CHỦ HỌC SINH SKY-LINE</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Xin chào: <span className="text-teal-200 underline decoration-amber-400 decoration-wavy underline-offset-8">Học sinh {studentName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Chúc em một ngày học tập tràn đầy năng lượng, tích cực trải nghiệm và sẵn sàng chinh phục các mục tiêu năm học!
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="px-3 py-1 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs">
                🏫 Lớp: {className}
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-400/30 text-amber-200 text-xs font-black flex items-center gap-1.5 border border-amber-300/30 shadow-2xs">
                🎓 Khối {gradeNum}
              </span>
              {studentCode && (
                <span className="px-3 py-1 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs">
                  🆔 Mã HS: {studentCode}
                </span>
              )}
              {campusName && (
                <span className="px-3 py-1 rounded-xl bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/20 shadow-2xs">
                  📍 {campusName}
                </span>
              )}
            </div>
          </div>

          {/* Sky-Line Mascot Badge */}
          <div className="bg-white/15 backdrop-blur-md p-5 rounded-3xl border border-white/20 text-center shrink-0 w-full md:w-auto flex flex-col items-center justify-center space-y-2">
            <div className="text-5xl animate-bounce">🐧</div>
            <p className="text-xs font-black text-white">Sky-Line Penguin</p>
            <span className="text-[10px] text-teal-200 font-bold px-2.5 py-0.5 rounded-full bg-white/20">
              Đồng hành 5 Trụ Cột
            </span>
          </div>
        </div>
      </div>

      {/* 2 CHỨC NĂNG CHÍNH DÀNH CHO HỌC SINH */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#003B3A] flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>HAI CHỨC NĂNG CHÍNH DÀNH CHO HỌC SINH</span>
          </h2>
          <span className="text-xs font-bold text-slate-400">Tài khoản: {studentName} (Mã HS: {studentCode})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CHỨC NĂNG 1: KHẢO SÁT HỌC SINH */}
          <Link
            href="/hocsinh/hs-khaosat/danh-sach"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 hover:border-teal-500 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 rounded-bl-full transition-transform group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/30 group-hover:rotate-6 transition-transform">
                <ClipboardCheck className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                  CHỨC NĂNG 1
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2 group-hover:text-teal-700 transition-colors">
                  Khảo Sát Học Sinh
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Tham gia thực hiện các bài khảo sát trải nghiệm học tập phân công cho Lớp {className}.
                </p>
              </div>
            </div>

            <div className="pt-6 relative z-10 flex items-center justify-between border-t border-slate-100 mt-6">
              <span className="text-xs font-extrabold text-teal-600">Thực hiện khảo sát</span>
              <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* CHỨC NĂNG 2: SỔ MỤC TIÊU NĂM HỌC (360°) */}
          <Link
            href="/hocsinh/portal/muc-tieu"
            className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 hover:border-amber-500 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
          >
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-bl-full transition-transform group-hover:scale-110" />

            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:-rotate-6 transition-transform">
                <Compass className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  CHỨC NĂNG 2
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2 group-hover:text-amber-700 transition-colors">
                  Sổ Mục Tiêu Năm Học (360°)
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                  Thiết lập phiếu mục tiêu năm học Khối {gradeNum}, tích chọn checkboxes, đóng dấu ấn vân tay & rèn luyện chuẩn SMART.
                </p>
              </div>
            </div>

            <div className="pt-6 relative z-10 flex items-center justify-between border-t border-slate-100 mt-6">
              <span className="text-xs font-extrabold text-amber-600">Vào Sổ Mục Tiêu Khối {gradeNum}</span>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* CÁC TIỆN ÍCH ĐỒNG HÀNH KHÁC */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#003B3A]">CÁC TIỆN ÍCH ĐỒNG HÀNH KHÁC</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Reflection Card */}
          <Link
            href="/hocsinh/portal/reflection"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
              <Feather className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                Tự Đánh Giá (Reflection)
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Viết nhật ký cảm xúc & nhìn lại tiến bộ</p>
            </div>
          </Link>

          {/* SOS Help Card */}
          <Link
            href="/hocsinh/portal/ho-tro"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-rose-100 text-rose-600 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                Em Cần Hỗ Trợ (SOS)
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Gửi yêu cầu giúp đỡ tới GVCN Lớp {className}</p>
            </div>
          </Link>

          {/* Upload Photo Card */}
          <Link
            href="/hocsinh/portal/upload-anh"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                Ảnh Hồ Sơ Học Sinh
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Cập nhật hình ảnh cá nhân</p>
            </div>
          </Link>

        </div>
      </div>

    </div>
  )
}
