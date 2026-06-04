
"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import Link from "next/link"

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || "Thầy/Cô"

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const yearId = localStorage.getItem("selectedAcademicYear") || "";
        const r = await fetch("/api/teacher-assessments?action=getDashboardMetrics&academicYearId=" + yearId)
        if (r.ok) {
          setMetrics(await r.json())
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()

    window.addEventListener("academicYearChanged", fetchMetrics)
    return () => window.removeEventListener("academicYearChanged", fetchMetrics)
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#00A19A] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải thống kê...</p>
      </div>
    )
  }

  const finalMetrics = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <WelcomeAlert name={userName} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Tổng quan Công việc</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Năm học đang hoạt động: <span className="font-bold text-[#00A19A]">{finalMetrics.academicYearName || "---"}</span> | Thống kê lớp học và nhiệm vụ phân công của bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1 */}
        <div className="relative bg-white rounded-2xl border-2 border-[#E0F2FE] p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E0F2FE] rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7] shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lớp phụ trách</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalClasses}</h3>
            </div>
          </div>
        </div>

        {/* CARD 2 */}
        <div className="relative bg-white rounded-2xl border-2 border-[#FEF3C7] p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FEF3C7] rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Học sinh</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalStudents}</h3>
            </div>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="relative bg-white rounded-2xl border-2 border-[#E0E7FF] p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E0E7FF] rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0E7FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân công môn</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalAssignments}</h3>
            </div>
          </div>
        </div>

        {/* CARD 4 */}
        <div className="relative bg-white rounded-2xl border-2 border-[#D1FAE5] p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D1FAE5] rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã chấm điểm</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.scoredStudents}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-2xl border-2 border-[#CCFBF1] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#00A19A]" />
              Lối tắt Công việc
            </h3>
          </div>
          <div className="space-y-3">
            <Link href="/teacher/input-assessments" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#F0FDFA] hover:border-[#99F6E4] transition-colors group">
              <div>
                <h4 className="font-bold text-slate-700 group-hover:text-[#00A19A]">Nhập kết quả Khảo sát</h4>
                <p className="text-xs text-slate-500 mt-1">Cập nhật điểm số và nhận xét học sinh</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-slate-400 group-hover:text-[#00A19A]">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
            <Link href="/teacher/classes" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
              <div>
                <h4 className="font-bold text-slate-700 group-hover:text-indigo-600">Lớp học của tôi</h4>
                <p className="text-xs text-slate-500 mt-1">Quản lý và xem danh sách học sinh</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-slate-400 group-hover:text-indigo-600">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
