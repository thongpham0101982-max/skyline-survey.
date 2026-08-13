"use client"

import { useState, useEffect } from "react"
import {
  Compass, Plus, Search, Calendar, User, MessageSquare, AlertTriangle,
  CheckCircle2, Clock, Filter, Save, Trash2, Heart, Sparkles, AlertCircle,
  TrendingUp, Award, Table, BookOpen, Layers, Info, ChevronRight, FileText
} from "lucide-react"

export default function TeacherAdvisoryPage() {
  const [academicYearId, setAcademicYearId] = useState("")
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  
  const [activeTab, setActiveTab] = useState<"consultations" | "sos" | "tracking" | "rubric_eval">("tracking")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Data States
  const [consultations, setConsultations] = useState<any[]>([])
  const [helpRequests, setHelpRequests] = useState<any[]>([])
  const [warningStatusMap, setWarningStatusMap] = useState<Record<string, string>>({})
  
  // 1. Goal Progress Tracking States
  const [checkPoint, setCheckPoint] = useState<"GIUA_KY_1" | "CUOI_KY_1" | "GIUA_KY_2" | "CUOI_KY_2">("GIUA_KY_1")
  const [trackingList, setTrackingList] = useState<any[]>([])

  // 2. Term Evaluation Rubric States
  const [evalTerm, setEvalTerm] = useState<"HK1" | "HK2">("HK1")
  const [rubricForm, setRubricForm] = useState({
    goalCompletionLevel: 4,
    initiativeLevel: 4,
    participationAttitude: 5,
    recommendations: ""
  })

  // Rubric Definitions matching Excel
  const RUBRICS = {
    goalCompletion: [
      { level: 1, text: "Hầu như không đạt được mục tiêu nào đã đặt ra trong Kế hoạch cá nhân" },
      { level: 2, text: "Đạt được một phần nhỏ; phần lớn mục tiêu chưa đạt" },
      { level: 3, text: "Đạt được khoảng một nửa số mục tiêu đã đặt ra" },
      { level: 4, text: "Đạt được phần lớn mục tiêu, còn một vài điểm chưa hoàn thành" },
      { level: 5, text: "Đạt đầy đủ hoặc vượt các mục tiêu đã đặt ra" }
    ],
    initiative: [
      { level: 1, text: "Hoàn toàn thụ động, phải nhắc nhở liên tục mới thực hiện" },
      { level: 2, text: "Ít chủ động, thường xuyên cần giáo viên nhắc nhở" },
      { level: 3, text: "Chủ động ở mức trung bình, thỉnh thoảng cần nhắc" },
      { level: 4, text: "Khá chủ động, tự thực hiện phần lớn công việc đã thống nhất" },
      { level: 5, text: "Rất chủ động, tự giác thực hiện và chủ động đề xuất thêm" }
    ],
    participation: [
      { level: 1, text: "Không hợp tác; thường vắng mặt hoặc từ chối trao đổi" },
      { level: 2, text: "Tham gia miễn cưỡng, ít chia sẻ trong buổi gặp" },
      { level: 3, text: "Tham gia đầy đủ nhưng còn dè dặt, ít chủ động chia sẻ" },
      { level: 4, text: "Tham gia tích cực, chia sẻ cởi mở với giáo viên" },
      { level: 5, text: "Rất tích cực; chủ động chia sẻ và đóng góp cho buổi gặp" }
    ]
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }

    fetch("/api/classes?isGVCN=true")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data)
          setSelectedClassId(data[0].id)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedClassId) return
    fetch(`/api/students/search?classId=${selectedClassId}${academicYearId ? `&academicYearId=${academicYearId}` : ''}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data)
          if (data.length > 0) setSelectedStudentId(data[0].id)
        }
      })
      .catch(console.error)

    fetch("/api/advisory/help-requests?classId=" + selectedClassId)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHelpRequests(data)
      })
      .catch(console.error)
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedStudentId) return
    loadStudentData()
  }, [selectedStudentId, checkPoint, evalTerm, academicYearId])

  async function loadStudentData() {
    try {
      // 1. Load Student Goals for Tracking
      const goalRes = await fetch(`/api/advisory/goals?studentId=${selectedStudentId}&academicYearId=${academicYearId}`)
      const goalData = goalRes.ok ? await goalRes.json() : null

      // Load existing tracking logs for current checkPoint
      const trackRes = await fetch(`/api/advisory/tracking?studentId=${selectedStudentId}&academicYearId=${academicYearId}&checkPoint=${checkPoint}`)
      const existingTrackLogs = trackRes.ok ? await trackRes.json() : []

      if (goalData && goalData.goals && goalData.goals.length > 0) {
        const list = goalData.goals.map((g: any) => {
          const matched = existingTrackLogs.find((t: any) => t.targetText === g.targetText || t.goalId === g.id)
          return {
            goalId: g.id,
            category: g.category || "HOC_TAP",
            targetText: g.targetText,
            progressStatus: matched?.progressStatus || "TIEN_TRIEN",
            teacherNotes: matched?.teacherNotes || ""
          }
        })
        setTrackingList(list)
      } else if (existingTrackLogs.length > 0) {
        setTrackingList(existingTrackLogs)
      } else {
        setTrackingList([
          { category: "HOC_TAP", targetText: "Học tập & Môn học", progressStatus: "TIEN_TRIEN", teacherNotes: "" },
          { category: "THOI_QUEN_SUC_KHOE", targetText: "Kỷ luật & Thói quen tự học", progressStatus: "TIEN_TRIEN", teacherNotes: "" },
          { category: "KY_NANG_SO_THICH", targetText: "Kỹ năng giao tiếp & hợp tác", progressStatus: "TIEN_TRIEN", teacherNotes: "" }
        ])
      }

      // 2. Load Term Evaluation
      const evalRes = await fetch(`/api/advisory/term-evaluations?studentId=${selectedStudentId}&academicYearId=${academicYearId}`)
      if (evalRes.ok) {
        const evals = await evalRes.json()
        const matchedEval = evals.find((e: any) => e.term === evalTerm)
        if (matchedEval) {
          setRubricForm({
            goalCompletionLevel: matchedEval.goalCompletionLevel || 4,
            initiativeLevel: matchedEval.initiativeLevel || 4,
            participationAttitude: matchedEval.participationAttitude || 5,
            recommendations: matchedEval.recommendations || ""
          })
        }
      }

      // 3. Load Consultation logs
      const consRes = await fetch(`/api/advisory/consultations?studentId=${selectedStudentId}&academicYearId=${academicYearId}`)
      if (consRes.ok) setConsultations(await consRes.json())

    } catch (e) {
      console.error(e)
    }
  }

  // Save Progress Tracking
  async function handleSaveTracking() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          checkPoint,
          items: trackingList
        })
      })

      if (res.ok) {
        setToastMessage("Đã lưu bảng Theo dõi mục tiêu thành công!")
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Save Term Evaluation Rubric
  async function handleSaveRubricEval() {
    if (!selectedStudentId) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/term-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          term: evalTerm,
          ...rubricForm
        })
      })

      if (res.ok) {
        setToastMessage("Đã lưu Đánh giá kỳ theo Rubric thành công!")
        setTimeout(() => setToastMessage(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const activeStudent = students.find(s => s.id === selectedStudentId)

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 uppercase tracking-wider text-teal-200">
            <Compass className="w-4 h-4 text-teal-300" />
            <span>QUẢN LÝ CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU</span>
          </div>

          {/* Class & Student Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-slate-800">Lớp: {c.className}</option>
              ))}
            </select>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="text-slate-800">HS: {s.studentName} ({s.studentCode})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Cố Vấn Học Tập — {activeStudent?.studentName || "Chọn Học Sinh"}
          </h1>
          <p className="text-xs text-teal-100 font-medium mt-1">
            Theo dõi mục tiêu định kỳ (Giữa kỳ / Cuối kỳ), nhật ký tham vấn và Đánh giá kỳ theo bộ Tiêu chí Rubric chuẩn.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
          <button
            onClick={() => setActiveTab("tracking")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === "tracking"
                ? "bg-white text-[#003B3A] shadow-md"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>1. Theo Dõi Mục Tiêu (Định Kỳ)</span>
          </button>

          <button
            onClick={() => setActiveTab("rubric_eval")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === "rubric_eval"
                ? "bg-white text-[#003B3A] shadow-md"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>2. Đánh Giá Kỳ theo Rubric</span>
          </button>

          <button
            onClick={() => setActiveTab("consultations")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === "consultations"
                ? "bg-white text-[#003B3A] shadow-md"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>3. Nhật Ký Tham Vấn ({consultations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sos")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === "sos"
                ? "bg-white text-[#003B3A] shadow-md"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>4. Yêu Cầu SOS ({helpRequests.length})</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ----------------- TAB 1: THEO DÕI MỤC TIÊU (ĐỊNH KỲ) ----------------- */}
      {activeTab === "tracking" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>Bảng Theo Dõi Tiến Độ Mục Tiêu Của Học Sinh</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Mục tiêu cụ thể căn cứ vào dữ liệu nhập của Học sinh ({activeStudent?.studentName})
              </p>
            </div>

            {/* Checkpoint selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Mốc kiểm tra:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                {[
                  { id: "GIUA_KY_1", label: "Giữa kỳ 1" },
                  { id: "CUOI_KY_1", label: "Cuối kỳ 1" },
                  { id: "GIUA_KY_2", label: "Giữa kỳ 2" },
                  { id: "CUOI_KY_2", label: "Cuối kỳ 2" }
                ].map(cp => (
                  <button
                    key={cp.id}
                    onClick={() => setCheckPoint(cp.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      checkPoint === cp.id
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {cp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Goal Progress Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-black border-b border-slate-200">
                  <th className="p-3">Học sinh</th>
                  <th className="p-3">Nhóm mục tiêu</th>
                  <th className="p-3">Mục tiêu cụ thể (Dữ liệu Học sinh nhập)</th>
                  <th className="p-3">Mốc kiểm tra</th>
                  <th className="p-3">Mức độ đạt</th>
                  <th className="p-3">Ghi chú của GVCN / CVHT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold">
                {trackingList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{activeStudent?.studentName || "N/A"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 font-bold max-w-xs">{item.targetText}</td>
                    <td className="p-3 font-bold text-slate-600">
                      {checkPoint === "GIUA_KY_1" ? "Giữa kỳ 1" : checkPoint === "CUOI_KY_1" ? "Cuối kỳ 1" : checkPoint === "GIUA_KY_2" ? "Giữa kỳ 2" : "Cuối kỳ 2"}
                    </td>
                    <td className="p-3">
                      <select
                        value={item.progressStatus}
                        onChange={(e) => {
                          const updated = [...trackingList]
                          updated[idx].progressStatus = e.target.value
                          setTrackingList(updated)
                        }}
                        className={`px-2.5 py-1 rounded-xl font-black text-xs border focus:outline-none ${
                          item.progressStatus === "DAT"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : item.progressStatus === "CHUA_DAT"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        <option value="TIEN_TRIEN">🟡 Đang tiến triển</option>
                        <option value="DAT">🟢 Đạt</option>
                        <option value="CHUA_DAT">🔴 Chưa Đạt</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.teacherNotes}
                        onChange={(e) => {
                          const updated = [...trackingList]
                          updated[idx].teacherNotes = e.target.value
                          setTrackingList(updated)
                        }}
                        placeholder="Nhập ghi chú theo dõi..."
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveTracking}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : "Lưu Bảng Theo Dõi Mục Tiêu"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: ĐÁNH GIÁ KỲ THEO RUBRIC ----------------- */}
      {activeTab === "rubric_eval" && (
        <div className="space-y-6">

          {/* Form Đánh Giá Kỳ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Phiếu Đánh Giá Kỳ Cố Vấn Học Tập ({activeStudent?.studentName})</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Đánh giá 3 tiêu chí theo Thang điểm 1 - 5 dựa trên Rubric chuẩn bên dưới
                </p>
              </div>

              {/* Term selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Kỳ đánh giá:</span>
                <select
                  value={evalTerm}
                  onChange={(e) => setEvalTerm(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 font-black text-xs border border-teal-200"
                >
                  <option value="HK1">Học kỳ I</option>
                  <option value="HK2">Học kỳ II</option>
                </select>
              </div>
            </div>

            {/* Excel Evaluation Table Format */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="p-3 border-r border-slate-200 w-1/5">Học sinh</th>
                    <th className="p-3 border-r border-slate-200 w-28">Kỳ đánh giá</th>
                    <th className="p-3 border-r border-slate-200">Mức hoàn thành mục tiêu (1-5)</th>
                    <th className="p-3 border-r border-slate-200">Mức độ chủ động (1-5)</th>
                    <th className="p-3 border-r border-slate-200">Thái độ tham gia (1-5)</th>
                    <th className="p-3">Khuyến nghị cho phụ huynh / giáo viên bộ môn</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="p-3 border-r border-slate-200 font-black text-slate-900">
                      {activeStudent?.studentName || "N/A"}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-700">
                      {evalTerm === "HK1" ? "Học kỳ I" : "Học kỳ II"}
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <select
                        value={rubricForm.goalCompletionLevel}
                        onChange={(e) => setRubricForm({ ...rubricForm, goalCompletionLevel: Number(e.target.value) })}
                        className="w-full p-2 rounded-xl border border-slate-200 font-black text-xs bg-amber-50 text-amber-900"
                      >
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>Mức {v} - {RUBRICS.goalCompletion[v-1].text.slice(0, 30)}...</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <select
                        value={rubricForm.initiativeLevel}
                        onChange={(e) => setRubricForm({ ...rubricForm, initiativeLevel: Number(e.target.value) })}
                        className="w-full p-2 rounded-xl border border-slate-200 font-black text-xs bg-blue-50 text-blue-900"
                      >
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>Mức {v} - {RUBRICS.initiative[v-1].text.slice(0, 30)}...</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <select
                        value={rubricForm.participationAttitude}
                        onChange={(e) => setRubricForm({ ...rubricForm, participationAttitude: Number(e.target.value) })}
                        className="w-full p-2 rounded-xl border border-slate-200 font-black text-xs bg-emerald-50 text-emerald-900"
                      >
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>Mức {v} - {RUBRICS.participation[v-1].text.slice(0, 30)}...</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <textarea
                        rows={3}
                        value={rubricForm.recommendations}
                        onChange={(e) => setRubricForm({ ...rubricForm, recommendations: e.target.value })}
                        placeholder="Nhập khuyến nghị chi tiết cho Phụ huynh và GVBM..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveRubricEval}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#003B3A] text-white text-xs font-black flex items-center gap-2 hover:bg-[#004D4A] shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Đánh Giá Kỳ theo Rubric"}</span>
              </button>
            </div>
          </div>

          {/* Bảng Tra Cứu Rubric Đánh Giá (Chuẩn 100% Theo Mẫu Excel Image 2) */}
          <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200 space-y-4">
            <div>
              <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" />
                <span>RUBRIC ĐÁNH GIÁ (Thang đo dùng chung cho 3 tiêu chí, điểm 1 - 5)</span>
              </h3>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                Giáo viên đối chiếu mô tả dưới đây để chọn điểm 1 - 5 cho từng học sinh
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-amber-300 bg-white">
                <thead>
                  <tr className="bg-amber-100 text-amber-950 font-black border-b border-amber-300">
                    <th className="p-3 border-r border-amber-300 w-1/6">Tiêu chí</th>
                    <th className="p-3 border-r border-amber-300">Mức 1</th>
                    <th className="p-3 border-r border-amber-300">Mức 2</th>
                    <th className="p-3 border-r border-amber-300">Mức 3</th>
                    <th className="p-3 border-r border-amber-300">Mức 4</th>
                    <th className="p-3">Mức 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200 font-semibold text-slate-800">
                  <tr>
                    <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                      1. Mức hoàn thành mục tiêu
                    </td>
                    {RUBRICS.goalCompletion.map(r => (
                      <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                      2. Mức độ chủ động
                    </td>
                    {RUBRICS.initiative.map(r => (
                      <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-amber-900 bg-amber-50 border-r border-amber-300">
                      3. Thái độ tham gia
                    </td>
                    {RUBRICS.participation.map(r => (
                      <td key={r.level} className="p-3 border-r border-amber-200">{r.text}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ----------------- TAB 3: NHẬT KÝ THAM VẤN ----------------- */}
      {activeTab === "consultations" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-[#003B3A]">Nhật Ký Tham Vấn Cố Vấn Học Tập</h3>
          <p className="text-xs text-slate-500 font-medium">Danh sách các buổi gặp tham vấn cá nhân giữa Thầy/Cô và Học sinh.</p>
          {consultations.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium text-center py-6">Chưa có nhật ký tham vấn nào.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map(c => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>📅 Ngày gặp: {new Date(c.meetingDate).toLocaleDateString("vi-VN")}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black uppercase">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">Nội dung: {c.content}</p>
                  {c.difficulties && <p className="text-xs text-slate-600 font-medium">Khó khăn: {c.difficulties}</p>}
                  {c.nextActions && <p className="text-xs text-teal-700 font-semibold">Hành động tiếp theo: {c.nextActions}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 4: YÊU CẦU HỖ TRỢ SOS ----------------- */}
      {activeTab === "sos" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-rose-600 flex items-center gap-2">
            <Heart className="w-4 h-4 fill-rose-500" />
            <span>Yêu Cầu Hỗ Trợ Khẩn Cấp Từ Học Sinh (SOS)</span>
          </h3>
          {helpRequests.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium text-center py-6">Không có yêu cầu hỗ trợ khẩn cấp nào.</p>
          ) : (
            <div className="space-y-3">
              {helpRequests.map(r => (
                <div key={r.id} className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900">{r.student?.studentName} ({r.student?.class?.className})</span>
                    <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] font-black uppercase">
                      {r.urgency}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
