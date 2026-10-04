"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Search,
  Phone,
  MessageCircle,
  AlertTriangle,
  User,
  GraduationCap,
  Calendar,
  HeartHandshake,
  CheckCircle2,
  RefreshCw,
  X,
  ChevronRight,
  ShieldCheck,
  Send,
  BookOpen
} from "lucide-react"
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav"

interface StudentListItem {
  id: string
  studentCode: string
  fullName: string
  className: string
  primaryPhone: string
  parentName: string
  hasAlert: boolean
  alertText?: string | null
}

interface StudentDetailData {
  id: string
  studentCode: string
  fullName: string
  className: string
  gender: string
  dateOfBirth: string
  parentName: string
  fatherPhone: string
  motherPhone: string
  primaryPhone: string
  alertStatus: "NORMAL" | "ATTENTION" | "URGENT"
  alertReason: string
  recentNotes: Array<{
    id: string
    comment: string
    createdAt: string
  }>
}

export function StudentMobileView() {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<StudentDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadStudents = useCallback(async (search = "") => {
    try {
      const url = search 
        ? `/api/pwa/students/summary?search=${encodeURIComponent(search)}`
        : "/api/pwa/students/summary"
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setStudents(json.students || [])
      }
    } catch (err) {
      console.error("[StudentMobileView] Error loading students:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents(searchQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, loadStudents])

  const handleOpenDetail = async (studentId: string) => {
    setLoadingDetail(true)
    setSelectedStudent(null)
    try {
      const res = await fetch(`/api/pwa/students/summary?studentId=${studentId}`)
      if (res.ok) {
        const json = await res.json()
        setSelectedStudent(json.student)
      }
    } catch (err) {
      console.error("[StudentMobileView] Error loading student detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const alertCount = students.filter(s => s.hasAlert).length

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24 font-sans text-slate-800">
      {/* 1. TOP APP BAR */}
      <div className="bg-[#003B3A] text-white px-4 pt-4 pb-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Hồ Sơ Học Sinh
              </h1>
              <p className="text-[11px] text-[#5EEAD4] font-medium">Danh bạ & Học tập 360°</p>
            </div>
          </div>

          <button
            onClick={() => { setRefreshing(true); loadStudents(searchQuery) }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
          </button>
        </div>

        {/* 2. SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã học sinh..."
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A19A] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3. QUICK STATS BAR */}
        <div className="flex items-center gap-2 mt-2.5 text-[11px] text-white/90">
          <span className="font-semibold">Tổng: {students.length} học sinh</span>
          {alertCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
              {alertCount} cần hỗ trợ
            </span>
          )}
        </div>
      </div>

      {/* 4. STUDENT CARDS LIST */}
      <div className="p-4 max-w-2xl mx-auto space-y-2.5">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-[#00A19A] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đang tải danh sách học sinh...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E6ECEA] shadow-xs my-6">
            <User className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy học sinh</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thử tìm kiếm với từ khóa khác.</p>
          </div>
        ) : (
          students.map(student => (
            <div
              key={student.id}
              className="bg-white rounded-2xl p-3.5 border border-[#E6ECEA] shadow-xs flex items-center justify-between gap-3 active:scale-[0.99] transition-all hover:border-[#00A19A]/40"
            >
              <div
                onClick={() => handleOpenDetail(student.id)}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#003B3A] font-extrabold text-sm flex items-center justify-center shrink-0 border border-teal-100">
                  {student.fullName.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-extrabold text-slate-800 truncate">
                      {student.fullName}
                    </h4>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {student.className}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Mã: {student.studentCode} · PH: {student.parentName}
                  </p>

                  {student.hasAlert && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>{student.alertText || "Cần chú ý"}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {student.primaryPhone ? (
                  <a
                    href={`tel:${student.primaryPhone}`}
                    className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-colors"
                    title={`Gọi phụ huynh: ${student.primaryPhone}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                ) : null}

                <button
                  onClick={() => handleOpenDetail(student.id)}
                  className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. STUDENT 360° SUMMARY BOTTOM SHEET */}
      {(selectedStudent || loadingDetail) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E6ECEA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#003B3A] to-[#00A19A] text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                  {selectedStudent?.fullName.charAt(0) || "H"}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#003B3A]">
                    {selectedStudent?.fullName || "Đang tải hồ sơ..."}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Lớp {selectedStudent?.className} · Mã: {selectedStudent?.studentCode}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-7 h-7 text-[#00A19A] animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Đang tải hồ sơ 360°...</p>
              </div>
            ) : selectedStudent && (
              <div className="space-y-4 pt-4">
                {/* Academic alert card if any */}
                {selectedStudent.alertStatus !== "NORMAL" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-amber-900">Cảnh báo học tập & rèn luyện</h5>
                      <p className="text-[11px] text-amber-700 mt-0.5">{selectedStudent.alertReason}</p>
                    </div>
                  </div>
                )}

                {/* Parent Contact Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Liên hệ Gia đình & Phụ huynh
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Phụ huynh:</span>
                      <span className="font-bold text-slate-800">{selectedStudent.parentName}</span>
                    </div>

                    {selectedStudent.fatherPhone && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">SĐT Cha:</span>
                        <a
                          href={`tel:${selectedStudent.fatherPhone}`}
                          className="font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedStudent.fatherPhone}</span>
                        </a>
                      </div>
                    )}

                    {selectedStudent.motherPhone && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">SĐT Mẹ:</span>
                        <a
                          href={`tel:${selectedStudent.motherPhone}`}
                          className="font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedStudent.motherPhone}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedStudent.primaryPhone && (
                    <a
                      href={`tel:${selectedStudent.primaryPhone}`}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer mt-2"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Gọi điện ngay cho phụ huynh</span>
                    </a>
                  )}
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px]">Ngày sinh</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{selectedStudent.dateOfBirth || "Chưa cập nhật"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px]">Giới tính</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{selectedStudent.gender}</span>
                  </div>
                </div>

                {/* Recent notes */}
                {selectedStudent.recentNotes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Ghi nhận gần nhất
                    </h4>
                    {selectedStudent.recentNotes.map(n => (
                      <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                        <span className="text-[10px] text-slate-400 block mb-0.5">{n.createdAt}</span>
                        <p className="text-slate-700">{n.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href={`/teacher/ho-so-hoc-sinh?studentId=${selectedStudent.id}`}
                    className="w-full h-11 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Mở hồ sơ học sinh đầy đủ</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PwaBottomNav role="TEACHER" />
    </div>
  )
}
