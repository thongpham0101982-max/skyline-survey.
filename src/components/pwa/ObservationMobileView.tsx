"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock3,
  User,
  Plus,
  RefreshCw,
  X,
  Star,
  Send,
  Building2,
  ChevronRight,
  BookOpen
} from "lucide-react"
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav"

interface ObservationSlotItem {
  id: string
  date: string
  slotIndex: number | string
  time: string
  teacherName: string
  teacherId: string
  subjectName: string
  className: string
  room: string
  roleType: "TEACHING" | "OBSERVING"
  status: string
  hasEvaluated: boolean
  myEvaluation?: {
    id: string
    totalScore: number
    rating: string
    feedback?: string
  } | null
  observersCount: number
}

interface ObservationMobileViewProps {
  initialSlots?: any[]
  currentTeacher?: any
}

export function ObservationMobileView({ initialSlots, currentTeacher }: ObservationMobileViewProps) {
  const [activeTab, setActiveTab] = useState<"MY_SLOTS" | "QUICK_EVAL" | "BROWSE">("MY_SLOTS")
  const [mySlots, setMySlots] = useState<ObservationSlotItem[]>([])
  const [availableSlots, setAvailableSlots] = useState<ObservationSlotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Evaluation Sheet state
  const [evaluatingSlot, setEvaluatingSlot] = useState<ObservationSlotItem | null>(null)
  const [scores, setScores] = useState<number[]>([4, 4, 4, 4])
  const [strengths, setStrengths] = useState("")
  const [weaknesses, setWeaknesses] = useState("")
  const [savingEval, setSavingEval] = useState(false)
  const [evalSuccess, setEvalSuccess] = useState(false)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  // Format helper for initialSlots
  const parseRawSlots = useCallback((rawList: any[], teacherId?: string) => {
    if (!Array.isArray(rawList)) return { my: [], avail: [] }
    const my: ObservationSlotItem[] = []
    const avail: ObservationSlotItem[] = []

    rawList.forEach((s: any) => {
      const isMyTeaching = teacherId && s.teacherId === teacherId
      const myReg = teacherId ? s.registrations?.find((r: any) => r.teacherId === teacherId) : null
      const myEval = myReg?.evaluation || null

      let dateStr = ""
      if (s.date instanceof Date) {
        dateStr = s.date.toISOString().split("T")[0]
      } else if (typeof s.date === "string") {
        dateStr = s.date.split("T")[0]
      }

      const item: ObservationSlotItem = {
        id: s.id,
        date: dateStr,
        slotIndex: s.startTime || "Tiết học",
        time: (s.startTime && s.endTime) ? `${s.startTime} - ${s.endTime}` : (s.startTime || "Trong ngày"),
        teacherName: s.teacher?.teacherName || "Giáo viên",
        teacherId: s.teacherId,
        subjectName: s.subjectName || "Môn học",
        className: s.className || "Lớp học",
        room: s.room || "Phòng học",
        roleType: isMyTeaching ? "TEACHING" : "OBSERVING",
        status: myReg ? (myReg.isApproved ? "Đã duyệt" : "Đã đăng ký") : (s.status || "ACTIVE"),
        hasEvaluated: Boolean(myEval),
        myEvaluation: myEval ? {
          id: myEval.id,
          totalScore: myEval.totalScore || 0,
          rating: myEval.overallRating || "Đạt",
          feedback: myEval.generalComment || myEval.strengths || ""
        } : null,
        observersCount: s.registrations?.length || 0
      }

      if (isMyTeaching || myReg) {
        my.push(item)
      } else {
        avail.push(item)
      }
    })

    return { my, avail }
  }, [])

  // Initialize from initialSlots if provided
  useEffect(() => {
    if (initialSlots && initialSlots.length > 0) {
      const { my, avail } = parseRawSlots(initialSlots, currentTeacher?.id)
      setMySlots(my)
      setAvailableSlots(avail)
      setLoading(false)
    }
  }, [initialSlots, currentTeacher, parseRawSlots])

  // Fetch fresh data from API
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch("/api/pwa/observations")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setMySlots(json.mySlots || [])
          setAvailableSlots(json.availableSlots || [])
        }
      }
    } catch (err) {
      console.error("[ObservationMobileView] Error loading data:", err)
    } finally {
      setLoading(false)
      if (isManual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenEvaluate = (slot: ObservationSlotItem) => {
    setEvaluatingSlot(slot)
    setScores([4, 4, 4, 4])
    setStrengths("")
    setWeaknesses("")
    setEvalSuccess(false)
  }

  const handleScoreChange = (index: number, val: number) => {
    setScores(prev => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  const totalScore = scores.reduce((a, b) => a + b, 0)
  const calculatedRating = totalScore >= 14 ? "Tốt" : totalScore >= 11 ? "Khá" : "Đạt"

  const handleSaveEvaluation = async () => {
    if (!evaluatingSlot) return
    setSavingEval(true)
    try {
      const res = await fetch("/api/pwa/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: evaluatingSlot.id,
          scores,
          totalScore,
          rating: calculatedRating,
          strengths,
          weaknesses
        })
      })

      if (res.ok) {
        setEvalSuccess(true)
        setTimeout(() => {
          setEvaluatingSlot(null)
          loadData()
        }, 800)
      }
    } catch (err) {
      console.error("[ObservationMobileView] Error saving evaluation:", err)
    } finally {
      setSavingEval(false)
    }
  }

  const handleRegisterSlot = async (slotId: string) => {
    setRegisteringId(slotId)
    try {
      const res = await fetch("/api/pwa/observations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId })
      })
      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error("[ObservationMobileView] Error registering slot:", err)
    } finally {
      setRegisteringId(null)
    }
  }

  const needsEvalSlots = mySlots.filter(s => s.roleType === "OBSERVING" && !s.hasEvaluated)

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24 font-sans text-slate-800">
      {/* 1. TOP APP BAR */}
      <div className="bg-[#003B3A] text-white px-4 pt-4 pb-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Dự Giờ & Thao Giảng
              </h1>
              <p className="text-[11px] text-[#5EEAD4] font-medium">SSM Mobile Workspace</p>
            </div>
          </div>

          <button
            onClick={() => loadData(true)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
          </button>
        </div>

        {/* 2. PILL TABS */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab("MY_SLOTS")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "MY_SLOTS"
                ? "bg-white text-[#003B3A] shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            Lịch của tôi ({mySlots.length})
          </button>

          <button
            onClick={() => setActiveTab("QUICK_EVAL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "QUICK_EVAL"
                ? "bg-[#00A19A] text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            <span>Cần đánh giá</span>
            {needsEvalSlots.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500 text-white font-extrabold">
                {needsEvalSlots.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("BROWSE")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "BROWSE"
                ? "bg-white text-[#003B3A] shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            Đăng ký dự ({availableSlots.length})
          </button>
        </div>
      </div>

      {/* 3. CONTENT LIST */}
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-[#00A19A] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đang tải lịch dự giờ...
            </p>
          </div>
        ) : activeTab === "MY_SLOTS" ? (
          mySlots.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E6ECEA] shadow-xs my-6">
              <Eye className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Chưa có tiết dự giờ nào</h3>
              <p className="text-xs text-slate-500 mt-1">Thầy/Cô chưa có lịch dạy hoặc đăng ký dự giờ nào gần đây.</p>
            </div>
          ) : (
            mySlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-[#E6ECEA] shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      slot.roleType === "TEACHING"
                        ? "bg-teal-50 text-[#00A19A] border-teal-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}>
                      {slot.roleType === "TEACHING" ? "TIẾT DẠY CỦA TÔI" : "TÔI DỰ GIỜ"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {slot.status}
                    </span>
                  </div>

                  {slot.hasEvaluated && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{slot.myEvaluation?.rating || "Đã đánh giá"}</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    {slot.subjectName} · {slot.className}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Giáo viên: <strong>{slot.teacherName}</strong></span>
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>{slot.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slot.room}</span>
                  </div>
                </div>

                {/* Action button */}
                {slot.roleType === "OBSERVING" && !slot.hasEvaluated && (
                  <button
                    onClick={() => handleOpenEvaluate(slot)}
                    className="w-full h-10 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Chấm điểm tiết dạy ngay</span>
                  </button>
                )}
              </div>
            ))
          )
        ) : activeTab === "QUICK_EVAL" ? (
          needsEvalSlots.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E6ECEA] shadow-xs my-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Tuyệt vời!</h3>
              <p className="text-xs text-slate-500 mt-1">Thầy/Cô đã hoàn tất đánh giá cho tất cả các tiết dự giờ gần đây.</p>
            </div>
          ) : (
            needsEvalSlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-teal-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    CHỜ ĐÁNH GIÁ
                  </span>
                  <span className="text-xs font-mono text-slate-400">{slot.date}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {slot.subjectName} · {slot.className}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giáo viên dạy: <strong>{slot.teacherName}</strong> · {slot.time}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenEvaluate(slot)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00A19A] to-[#008B85] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Đánh giá nhanh 4 tiêu chí chuẩn</span>
                </button>
              </div>
            ))
          )
        ) : (
          availableSlots.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E6ECEA] shadow-xs my-6">
              <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Không có tiết mở nào</h3>
              <p className="text-xs text-slate-500 mt-1">Hiện không có tiết dự giờ nào đang mở cho việc đăng ký.</p>
            </div>
          ) : (
            availableSlots.map(slot => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-4 border border-[#E6ECEA] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003B3A]">
                    {slot.subjectName} · {slot.className}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ĐANG MỞ ĐĂNG KÝ
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>Giáo viên dạy: <strong>{slot.teacherName}</strong></p>
                  <p>Thời gian: {slot.date} · {slot.time} ({slot.room})</p>
                </div>

                <button
                  onClick={() => handleRegisterSlot(slot.id)}
                  disabled={registeringId === slot.id}
                  className="w-full h-10 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{registeringId === slot.id ? "Đang đăng ký..." : "Đăng ký tham dự"}</span>
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* 4. QUICK EVALUATION BOTTOM SHEET */}
      {evaluatingSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E6ECEA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#003B3A]">
                  Đánh Giá Tiết Dự Giờ
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {evaluatingSlot.subjectName} · {evaluatingSlot.className} ({evaluatingSlot.teacherName})
                </p>
              </div>

              <button
                onClick={() => setEvaluatingSlot(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Score header */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-800 uppercase block">Tổng điểm & Xếp loại</span>
                  <span className="text-xs text-teal-700 font-medium mt-0.5 block">Quy đổi thang chuẩn SSM</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#003B3A]">{totalScore}/16</span>
                  <span className="text-xs font-bold text-[#00A19A] block mt-0.5">Xếp loại {calculatedRating}</span>
                </div>
              </div>

              {/* 4 Criteria Sliders / Pickers */}
              <div className="space-y-3">
                {[
                  "1. Chuẩn bị bài dạy & thiết bị",
                  "2. Phương pháp & nội dung giảng dạy",
                  "3. Hoạt động tích cực của học sinh",
                  "4. Hiệu quả tiết dạy & tương tác"
                ].map((title, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">{title}</span>
                      <span className="text-xs font-extrabold text-[#003B3A]">{scores[idx]} đ</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleScoreChange(idx, val)}
                          className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            scores[idx] === val
                              ? "bg-[#00A19A] text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {val} đ
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ưu điểm nổi bật:</label>
                <textarea
                  value={strengths}
                  onChange={e => setStrengths(e.target.value)}
                  placeholder="Ghi nhận điểm sáng của tiết dạy..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00A19A] min-h-[60px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Góp ý hoàn thiện:</label>
                <textarea
                  value={weaknesses}
                  onChange={e => setWeaknesses(e.target.value)}
                  placeholder="Khuyến nghị cho đồng nghiệp..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00A19A] min-h-[60px]"
                />
              </div>

              {evalSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã lưu kết quả đánh giá thành công!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEvaluation}
                  disabled={savingEval}
                  className="flex-1 h-11 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingEval ? "Đang lưu..." : "Lưu & Hoàn tất"}</span>
                </button>
                <button
                  onClick={() => setEvaluatingSlot(null)}
                  className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PwaBottomNav role="TEACHER" />
    </div>
  )
}
