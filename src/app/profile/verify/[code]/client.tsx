'use client';

import React from 'react';
import {
  ShieldCheck,
  User,
  GraduationCap,
  Building,
  Award,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface VerifyStudentClientProps {
  student: any;
  isAlumni: boolean;
  alumniToken: string | null;
  cleanCode: string;
  fullProfileUrl?: string;
}

export default function VerifyStudentClient({
  student,
  isAlumni,
  alumniToken,
  cleanCode,
  fullProfileUrl = '/parent/children/profile',
}: VerifyStudentClientProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 font-sans flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-[#7C3AED]/30 via-[#00A19A]/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-lg mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Sky-Line"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-teal-300 uppercase block">
              HỆ THỐNG GIÁO DỤC
            </span>
            <span className="text-sm font-black text-white tracking-wider uppercase">
              SKY-LINE
            </span>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
          ĐÃ XÁC THỰC
        </span>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 py-3 flex flex-col justify-center">
        {/* Verification Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
          {/* Header Strip */}
          <div className="bg-gradient-to-r from-[#35186B] via-[#5B21B6] to-[#00A19A] p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-bold text-purple-100 mb-3 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Hồ Sơ Học Tập Học Sinh 360°</span>
            </div>

            {/* Avatar */}
            <div className="w-24 h-24 mx-auto rounded-2xl bg-white/20 p-1 border-2 border-white/40 shadow-lg relative mb-3">
              <div className="w-full h-full rounded-xl overflow-hidden bg-white flex items-center justify-center">
                {student?.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-[#5B21B6]" />
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              {student?.studentName || cleanCode}
            </h1>

            <div className="flex items-center justify-center gap-2 mt-1.5 font-mono text-xs text-purple-100">
              <span className="font-bold">
                Mã HS: {student?.studentCode || cleanCode}
              </span>
              {student?.vneduCode && (
                <>
                  <span>•</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                    vnEdu: {student.vneduCode}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CTA Nút Mở Hồ Sơ Học Tập Chi Tiết ngay đầu trang cho Phụ Huynh */}
          <div className="p-4 bg-purple-50/70 border-b border-purple-100">
            <a
              href={fullProfileUrl}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#35186B] via-[#5B21B6] to-[#00A19A] hover:opacity-95 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>Xem Hồ Sơ Học Tập Toàn Diện</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Student Status Badge */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">
              Tình trạng học tập:
            </span>
            {isAlumni ? (
              <span className="px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                Cựu học sinh (Alumni)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang theo học chính khóa
              </span>
            )}
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                  Lớp học
                </span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {student?.className || '---'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                  Năm học
                </span>
                <span className="font-extrabold text-[#5B21B6] text-sm">
                  {student?.yearName || '2025-2026'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2.5">
              <Building className="w-4 h-4 text-[#5B21B6] shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">
                  Cơ sở Sky-Line
                </span>
                <span className="font-bold text-slate-700">
                  {student?.campusName || 'Sky-Line Education System'}
                </span>
              </div>
            </div>

            {/* If Alumni -> Callout to Alumni Portal */}
            {isAlumni && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 font-extrabold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Cổng Kết Nối Cựu Học Sinh</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Chào mừng cựu học sinh Sky-Line! Bạn có thể truy cập Cổng Alumni để cập nhật thông tin học vấn đại học, sự nghiệp và kết nối bạn bè cùng khóa.
                </p>
                <a
                  href={
                    alumniToken
                      ? `/alumni/portal?token=${encodeURIComponent(alumniToken)}`
                      : '/alumni/portal'
                  }
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span>Mở Cổng Cựu Học Sinh</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Hồ Sơ Năng Lực & Thành Tích */}
            {!isAlumni && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#35186B] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Thành tích &amp; Khen thưởng tiêu biểu
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bảo mật PHHS
                  </span>
                </div>

                {student?.achievements && student.achievements.length > 0 ? (
                  <div className="space-y-1.5">
                    {student.achievements.map((ach: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800 truncate mr-2">
                          {ach.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/70 text-amber-800 shrink-0">
                          {ach.level}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl text-center">
                    Hồ sơ năng lực điện tử 360° đã được đồng bộ chính thức trên hệ sinh thái Sky-Line.
                  </p>
                )}

                <div className="text-center pt-1">
                  <a
                    href={fullProfileUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-[#5B21B6] font-bold hover:underline"
                  >
                    <span>Đi tới trang chi tiết Điểm số &amp; Nhận xét định kỳ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-lg mx-auto p-4 text-center text-slate-400 text-[11px]">
        <p>
          © {new Date().getFullYear()} Hệ thống Giáo dục Sky-Line. Bản quyền thuộc về Sky-Line.
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Vững Nội lực – Hướng tương lai • Bảo mật theo phân quyền Tài khoản PHHS
        </p>
      </footer>
    </div>
  );
}
