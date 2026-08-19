"use client"

import { useState, useEffect } from "react"
import {
  Sparkles, Save, Heart, CheckCircle2, Compass, Send, BookOpen, User,
  Check, Info, CheckSquare, HelpCircle, Award, Feather, FileText, ArrowRight,
  ShieldCheck, Edit3, History, Clock, MessageSquare, AlertCircle, Users, Lock
} from "lucide-react"
import Link from "next/link"
import { GoalMultiSelector } from "@/components/advisory/GoalMultiSelector"

export default function StudentGoalPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("Học sinh Sky-Line")
  const [studentGrade, setStudentGrade] = useState("K8")
  const [gradeLevel, setGradeLevel] = useState("K8")
  const [className, setClassName] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [presets, setPresets] = useState<any[]>([])
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])

  // Goal Form Data States - Dynamic Multi Custom Goals per Category
  const [selectedPresetGoals, setSelectedPresetGoals] = useState<Record<string, boolean>>({})
  const [customGoals, setCustomGoals] = useState<Record<string, any>>({
    HOC_TAP: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    THOI_QUEN: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    KY_NANG_CAM_XUC: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    DINH_HUONG: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" }
  })
  
  const [studentCommitment, setStudentCommitment] = useState("")
  const [fingerprintStamped, setFingerprintStamped] = useState(false)

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
          const sId = data.id || data.studentId
          setStudentId(sId)
          setStudentName(data.studentName)
          setClassName(data.className || "")
          
          let parsedGrade = "K8"
          if (data.grade) {
            const gNum = String(data.grade).replace(/[^0-9]/g, "")
            if (gNum) parsedGrade = "K" + gNum
          } else if (data.className) {
            const match = data.className.toUpperCase().match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
            if (match && match[1]) parsedGrade = "K" + match[1]
          }

          setStudentGrade(parsedGrade)
          setGradeLevel(parsedGrade)
          localStorage.setItem("currentStudent", JSON.stringify(data))

          fetchGoalsForStudent(sId, parsedGrade)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }
  }, [])

  async function fetchGoalsForStudent(sId: string, gLevel: string) {
    if (!sId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/advisory/goals?studentId=${sId}&academicYearId=${academicYearId}&gradeLevel=${gLevel}&_t=${Date.now()}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets || [])
        setTrackingLogs(data.trackingLogs || [])

        if (data.existingSheet) {
          setStudentCommitment(data.existingSheet.studentCommitment || "")
          setFingerprintStamped(!!data.existingSheet.signedByStudent)
          if (data.existingSheet.submittedAt) {
            setSubmittedAt(new Date(data.existingSheet.submittedAt).toLocaleDateString("vi-VN"))
          }
          const customMap: Record<string, any> = {
            HOC_TAP: { items: [], teacherSupport: "", parentSupport: "" },
            THOI_QUEN: { items: [], teacherSupport: "", parentSupport: "" },
            KY_NANG_CAM_XUC: { items: [], teacherSupport: "", parentSupport: "" },
            DINH_HUONG: { items: [], teacherSupport: "", parentSupport: "" }
          }

          data.existingSheet.goals.forEach((g: any) => {
            let catKey = g.category
            if (catKey === "THOI_QUEN_SUC_KHOE") catKey = "THOI_QUEN"
            if (catKey === "KY_NANG_SO_THICH" || catKey === "PHAM_CHAT") catKey = "KY_NANG_CAM_XUC"

            if (catKey && customMap[catKey]) {
              if (g.teacherSupportRequest) customMap[catKey].teacherSupport = g.teacherSupportRequest
              if (g.parentSupportRequest) customMap[catKey].parentSupport = g.parentSupportRequest
              
              if (g.targetText) {
                customMap[catKey].items.push({
                  targetText: g.targetText || "",
                  actionText: g.actions?.[0]?.actionText || "",
                  teacherSupport: g.teacherSupportRequest || "",
                  parentSupport: g.parentSupportRequest || ""
                })
              }
            }
          })

          Object.keys(customMap).forEach(cat => {
            if (customMap[cat].items.length === 0) {
              customMap[cat].items = [{ targetText: "", actionText: "" }]
            }
          })

          setCustomGoals(customMap)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoals() {
    if (submittedAt) {
      alert("Phiếu mục tiêu đã được gửi cho GVCN nên không thể chỉnh sửa.")
      return
    }

    if (!studentId) {
      alert("Chưa xác định được thông tin học sinh. Vui lòng đăng nhập lại.")
      return
    }

    try {
      setSaving(true)
      const goalListPayload: any[] = []

      // Collect ALL custom specific goals added by student
      Object.keys(customGoals).forEach(cat => {
        const catObj = customGoals[cat]
        if (catObj && catObj.items && Array.isArray(catObj.items)) {
          catObj.items.forEach((item: any) => {
            if (item.targetText && item.targetText.trim()) {
              goalListPayload.push({
                category: cat,
                targetText: item.targetText.trim(),
                teacherSupportRequest: item.teacherSupport || catObj.teacherSupport || null,
                parentSupportRequest: item.parentSupport || catObj.parentSupport || null,
                actions: item.actionText ? [{ actionText: item.actionText.trim() }] : []
              })
            }
          })
        }
      })

      if (goalListPayload.length === 0) {
        alert("Vui lòng chọn hoặc gõ ít nhất 1 mục tiêu cụ thể trước khi lưu phiếu.")
        setSaving(false)
        return
      }

      const res = await fetch("/api/advisory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          gradeLevel,
          goals: goalListPayload,
          studentCommitment,
          signedByStudent: fingerprintStamped
        })
      })

      const resData = await res.json().catch(() => ({}))

      if (res.ok && resData.success) {
        setSubmittedAt(new Date().toLocaleDateString("vi-VN"))
        setToastMessage("Đã LƯU & GỬI PHIẾU MỤC TIÊU Khối " + gradeLevel.replace("K","") + " về Quản lý Cố Vấn Học Tập & GVCN thành công!")
        setTimeout(() => setToastMessage(""), 5000)
        fetchGoalsForStudent(studentId, gradeLevel)
      } else {
        alert(resData.error || "Lỗi khi lưu phiếu mục tiêu. Vui lòng thử lại.")
      }
    } catch (e: any) {
      console.error(e)
      alert("Lỗi kết nối khi lưu phiếu: " + (e.message || "Vui lòng thử lại."))
    } finally {
      setSaving(false)
    }
  }

  const isK1 = gradeLevel === "K1"
  const isSubmitted = !!submittedAt

  // 4 Target Categories matching official Word/PDF Form Template
  const secondaryCategories = [
    {
      key: "HOC_TAP",
      number: "1",
      title: "Mục tiêu học tập",
      hint: "Môn học, phương pháp học, điểm số...",
    },
    {
      key: "THOI_QUEN",
      number: "2",
      title: "Mục tiêu thói quen",
      hint: "Kỷ luật, tự học, hoàn thành nhiệm vụ đúng thời hạn, thói quen ăn uống, nghỉ ngơi...",
    },
    {
      key: "KY_NANG_CAM_XUC",
      number: "3",
      title: "Mục tiêu kỹ năng, cảm xúc",
      hint: "Giao tiếp, thuyết trình, làm việc nhóm, tư duy phản biện, quản lý cảm xúc...",
    },
    {
      key: "DINH_HUONG",
      number: "4",
      title: "Mục tiêu định hướng",
      hint: "Khám phá bản thân, ngành nghề, lộ trình tương lai...",
    }
  ]

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-teal-800 font-extrabold text-sm animate-pulse space-y-2">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang nạp Sổ Mục Tiêu Năm Học cho {studentName}...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>MỤC TIÊU NĂM HỌC 2026 - 2027 — KHỐI {gradeLevel.replace("K", "")}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white font-black text-xs flex items-center gap-1.5 border border-white/30 shadow-xs">
              🏫 Học sinh: {studentName} {className ? `(${className})` : ""}
            </span>

            <Link
              href="/hocsinh/portal/ho-tro"
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Nút SOS "Em Cần Hỗ Trợ"</span>
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">MỤC TIÊU NĂM HỌC 2026 - 2027</h1>
          <p className="text-xs sm:text-sm text-teal-100 font-medium italic">
            Em hãy dành thời gian suy nghĩ và tự điền các mục tiêu cụ thể của mình cho năm học này cùng các hành động và nội dung cần Thầy Cô / Ba Mẹ hỗ trợ nhé!
          </p>
        </div>

        {/* Submission Status Badge */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {isSubmitted ? (
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>ĐÃ LƯU & GỬI CHO GVCN VÀ QUẢN LÝ CỐ VẤN ({submittedAt})</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 shadow-sm">
              <Clock className="w-4 h-4" />
              <span>ĐANG DỰ THẢO — CHƯA GỬI</span>
            </span>
          )}
        </div>
      </div>

      {/* Lock Notice Banner when Submitted */}
      {isSubmitted && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-amber-950">PHIẾU MỤC TIÊU ĐÃ GỬI CHO GVCN — CHẾ ĐỘ CHỈ XEM</h3>
              <p className="text-xs text-amber-800 font-medium">
                Phiếu mục tiêu năm học đã được gửi chính thức ngày <strong className="text-amber-950 font-black">{submittedAt}</strong>. Học sinh chỉ có thể xem lại và theo dõi nhật ký đánh giá từ GVCN, không thể chỉnh sửa.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-amber-200 text-amber-950 rounded-2xl font-black text-xs shrink-0 border border-amber-300 shadow-xs">
            🔒 ĐÃ KHÓA CHỈNH SỬA
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-800 font-black text-xs flex items-center justify-between animate-bounce shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {isK1 ? (
        <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-6 text-sky-950 text-center space-y-2">
          <div className="text-4xl">🎒</div>
          <h3 className="font-black text-sm uppercase">PHIẾU MỤC TIÊU HỌC SINH KHỐI 1</h3>
          <p className="text-xs font-medium text-sky-800">
            Hệ thống Mẫu Mục Tiêu linh động áp dụng chính thức từ <strong>Khối 2 đến Khối 12</strong>. Học sinh Khối 1 thực hiện theo hướng dẫn trực tiếp từ Thầy Cô GVCN tại lớp.
          </p>
        </div>
      ) : (
        /* ------------------- FORM ĐIỀN MỤC TIÊU LINH ĐỘNG (TỰ ĐỘNG KHỚP HÀNH ĐỘNG GỢI Ý) ------------------- */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-3xl p-5 text-teal-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✨</div>
              <div>
                <h3 className="font-black text-sm uppercase text-teal-900">BẢNG LẬP MỤC TIÊU NĂM HỌC — LỰA CHỌN LINH ĐỘNG (KHỐI 2 - KHỐI 12)</h3>
                <p className="text-xs text-teal-700 font-medium">
                  Em hãy tự điền các <strong>mục tiêu cụ thể của mình</strong> bên dưới cùng <strong>hành động cụ thể</strong> và <strong>nội dung mong muốn Thầy Cô / Ba Mẹ hỗ trợ</strong>.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-teal-700 text-white rounded-2xl font-black text-xs shrink-0 shadow-xs">
              Khối {gradeLevel.replace("K", "")}
            </span>
          </div>

          {/* Render 4 Categories with Dynamic Goal & Action Multi-Selection */}
          {secondaryCategories.map((catObj) => {
            const item = customGoals[catObj.key] || { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" }
            return (
              <div key={catObj.key} className="space-y-4">
                <GoalMultiSelector
                  categoryKey={catObj.key}
                  categoryTitle={`${catObj.number}. ${catObj.title}`}
                  categoryHint={catObj.hint}
                  presets={presets}
                  selectedPresetIds={Object.keys(selectedPresetGoals).filter(id => selectedPresetGoals[id])}
                  onSelectionChange={(selectedIds) => {
                    const updatedMap = { ...selectedPresetGoals }
                    presets.filter(p => p.category === catObj.key).forEach(p => {
                      updatedMap[p.id] = selectedIds.includes(p.id)
                    })
                    setSelectedPresetGoals(updatedMap)
                  }}
                  customItems={item.items || [{ targetText: "", actionText: "" }]}
                  onCustomItemsChange={(newItems) => setCustomGoals(prev => ({
                    ...prev,
                    [catObj.key]: { ...prev[catObj.key], items: newItems }
                  }))}
                  readOnly={isSubmitted}
                />


              </div>
            )
          })}
        </div>
      )}

      {/* ------------------- LỜI CAM KẾT & XÁC NHẬN ĐỒNG HÀNH ------------------- */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md space-y-5">
        <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <span>LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ✍️</span>
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
            <span>Em cam kết sẽ:</span>
          </label>
          <textarea
            rows={3}
            readOnly={isSubmitted}
            value={studentCommitment}
            onChange={(e) => !isSubmitted && setStudentCommitment(e.target.value)}
            placeholder="Chủ động và nghiêm túc thực hiện những mục tiêu đã đề ra, duy trì kỷ luật, thói quen tự học..."
            className={`w-full p-4 rounded-2xl border-2 text-xs font-semibold focus:outline-none ${
              isSubmitted ? "bg-slate-100/80 text-slate-700 border-slate-200 cursor-not-allowed" : "border-slate-200 focus:border-teal-500"
            }`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitted}
              onClick={() => !isSubmitted && setFingerprintStamped(!fingerprintStamped)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md ${
                isSubmitted
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                  : fingerprintStamped
                  ? "bg-rose-500 text-white shadow-rose-200 scale-105"
                  : "bg-white text-slate-400 border-2 border-dashed border-slate-300 hover:border-rose-400"
              }`}
            >
              👉
            </button>
            <div>
              <p className="text-xs font-black text-slate-800">
                {fingerprintStamped ? "🔴 Đã đóng dấu vân tay xác nhận cam kết!" : "Chưa đóng dấu ấn vân tay"}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {isSubmitted ? "Phiếu đã được đóng dấu cam kết và gửi về GVCN" : "Nhấn vào dấu tay để xác nhận cam kết cá nhân"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveGoals}
            disabled={saving || isSubmitted}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
              isSubmitted
                ? "bg-slate-400 text-slate-100 cursor-not-allowed shadow-none"
                : "bg-[#003B3A] hover:bg-[#002D2C] text-white shadow-teal-950/20 hover:scale-105 active:scale-95"
            }`}
          >
            {isSubmitted ? (
              <>
                <Lock className="w-4 h-4 text-slate-200" />
                <span>ĐÃ GỬI CHO GVCN (KHÔNG THỂ SỬA)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-teal-300" />
                <span>{saving ? "Đang gửi..." : "LƯU & GỬI PHIẾU MỤC TIÊU CHO GVCN"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------------------- BẢNG LỊCH SỬ PHIẾU & THEO DÕI ĐÁNH GIÁ CỦA GVCN ------------------- */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <span>LỊCH SỬ PHIẾU & NHẬT KÝ THEO DÕI ĐÁNH GIÁ CỦA GVCN</span>
          </h3>
          <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            {trackingLogs.length} Nhật ký ghi nhận
          </span>
        </div>

        {trackingLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black">
                <tr>
                  <th className="p-3 rounded-l-xl">Mốc kiểm tra</th>
                  <th className="p-3">Nội dung mục tiêu</th>
                  <th className="p-3">Trạng thái tiến độ</th>
                  <th className="p-3 rounded-r-xl">Nhận xét của GVCN / Thầy Cô</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trackingLogs.map((log: any, idx: number) => {
                  const checkPointNames: Record<string, string> = {
                    DAU_NAM: "1. Mốc Đầu Năm Học",
                    GIUA_KY_1: "2. Mốc Giữa Học Kỳ 1",
                    CUOI_KY_1: "3. Mốc Cuối Học Kỳ 1",
                    GIUA_KY_2: "4. Mốc Giữa Học Kỳ 2",
                    CUOI_NAM: "5. Mốc Cuối Năm Học"
                  }
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-900">
                        {checkPointNames[log.checkPoint] || log.checkPoint}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{log.targetText}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                          {log.progressStatus || "TIẾN TRIỂN TỐT"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 bg-amber-50/40 rounded-xl">
                        {log.teacherNotes || "Chờ Thầy Cô nhận xét"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Chưa có nhật ký theo dõi từ GVCN</p>
            <p className="text-[11px] text-slate-400">Sau khi em nhấn "LƯU & GỬI PHIẾU MỤC TIÊU", Thầy Cô GVCN sẽ theo dõi và gửi nhận xét động viên em tại đây!</p>
          </div>
        )}
      </div>

    </div>
  )
}
