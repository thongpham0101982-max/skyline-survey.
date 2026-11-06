"use client"

import React, { useState, useEffect } from "react"
import {
  X, Calendar, Sparkles, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, User, BookOpen, Send, RefreshCw,
  HeartHandshake, HelpCircle, Check, Award, UserCheck
} from "lucide-react"

interface QuickConsultationModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  academicYearId: string
  onSaveSuccess?: () => void
  student?: any
  orientationData?: any
  onApplyOrientationSummary?: (summary: any) => void
}

export default function QuickConsultationModal({
  isOpen,
  onClose,
  studentId,
  academicYearId,
  onSaveSuccess,
  student,
  orientationData,
  onApplyOrientationSummary
}: QuickConsultationModalProps) {
  const isAdmissionMode = Boolean(student || orientationData)

  // Snapshot data state
  const [snapshot, setSnapshot] = useState<any>(null)
  const [sgsiData, setSgsiData] = useState<any>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  // AI Advisor state
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [aiAdmissionSummary, setAiAdmissionSummary] = useState<any>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  // Admission specific 5-dimension editable states
  const [admissionStrengths, setAdmissionStrengths] = useState(orientationData?.studentStrengths || "")
  const [admissionNeedsSupport, setAdmissionNeedsSupport] = useState(orientationData?.studentNeedsSupport || "")
  const [admissionAdaptability, setAdmissionAdaptability] = useState("")
  const [admissionPlacement, setAdmissionPlacement] = useState(orientationData?.proposedPlacementRecommendation || "")
  const [admissionVerification, setAdmissionVerification] = useState("")

  // Form states (chế độ cố vấn trong năm học)
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split("T")[0])
  const [meetingFormat, setMeetingFormat] = useState<"DIRECT" | "ONLINE">("DIRECT")
  const [topics, setTopics] = useState<string[]>([])
  const [content, setContent] = useState("")
  const [difficulties, setDifficulties] = useState("")
  const [nextActions, setNextActions] = useState("")
  const [deadline, setDeadline] = useState("")
  const [notes, setNotes] = useState("")
  const [privateAdvisorNotes, setPrivateAdvisorNotes] = useState("")
  const [shareWithParent, setShareWithParent] = useState(true)
  const [sessionStatus, setSessionStatus] = useState<"SCHEDULED" | "COMPLETED">("COMPLETED")
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Sync AI admission output into local editable fields
  useEffect(() => {
    if (aiAdmissionSummary) {
      if (aiAdmissionSummary.diemManhNoiBat) {
        setAdmissionStrengths(aiAdmissionSummary.diemManhNoiBat)
      }
      if (aiAdmissionSummary.noiDungCanPhatTrien) {
        setAdmissionNeedsSupport(aiAdmissionSummary.noiDungCanPhatTrien)
      }
      if (aiAdmissionSummary.khaNangThichNghi) {
        setAdmissionAdaptability(aiAdmissionSummary.khaNangThichNghi)
      }
      if (aiAdmissionSummary.khuyenNghiXepLop) {
        const text = [
          aiAdmissionSummary.khuyenNghiXepLop,
          aiAdmissionSummary.heHocDeXuat ? `(${aiAdmissionSummary.heHocDeXuat})` : "",
          aiAdmissionSummary.deXuatHoTroBanDau ? `• Hỗ trợ: ${aiAdmissionSummary.deXuatHoTroBanDau}` : ""
        ].filter(Boolean).join(" ")
        setAdmissionPlacement(text)
      }
      if (aiAdmissionSummary.noiDungCanXacMinh) {
        setAdmissionVerification(aiAdmissionSummary.noiDungCanXacMinh)
      }
    }
  }, [aiAdmissionSummary])

  // Refer Support state
  const [showReferModal, setShowReferModal] = useState(false)
  const [referType, setReferType] = useState<"ACADEMIC" | "PSYCHOLOGICAL">("ACADEMIC")
  const [referReason, setReferReason] = useState("")
  const [referring, setReferring] = useState(false)

  const quickDifficultyTags = [
    "Khó tập trung", "Chưa nắm bài trên lớp", "Quản lý thời gian",
    "Áp lực điểm số", "Tâm lý/Bạn bè", "Thiếu động lực học"
  ]

  // Load snapshot & SGSI khi mở modal
  useEffect(() => {
    if (isOpen && studentId) {
      if (isAdmissionMode) {
        setLoadingSnapshot(false)
        return
      }
      setLoadingSnapshot(true)
      Promise.all([
        fetch(`/api/advisory/academic-snapshot?studentId=${studentId}&academicYearId=${academicYearId}`)
          .then(r => r.ok ? r.json() : null),
        fetch(`/api/advisory/sgsi/calculate?studentId=${studentId}&academicYearId=${academicYearId}`)
          .then(r => r.ok ? r.json() : null)
      ])
        .then(([snap, sgsi]) => {
          setSnapshot(snap)
          setSgsiData(sgsi)
        })
        .catch(console.error)
        .finally(() => setLoadingSnapshot(false))
    }
  }, [isOpen, studentId, academicYearId, isAdmissionMode])

  // Tự động phân tích AI nếu chưa có khi mở modal ở admission mode
  useEffect(() => {
    if (isOpen && isAdmissionMode && !aiAdmissionSummary && !loadingAi) {
      handleFetchAiSuggestions()
    }
  }, [isOpen, isAdmissionMode])

  // Gọi gợi ý AI Advisor / AI Admission
  const handleFetchAiSuggestions = async () => {
    try {
      setLoadingAi(true)
      if (isAdmissionMode) {
        const res = await fetch("/api/admin/orientation/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "synthesize_summary",
            student: student,
            criteriaAnswers: orientationData?.answers || {},
            parentData: {
              parentExpectations: orientationData?.parentExpectations,
              parentPersonalityNotes: orientationData?.parentPersonalityNotes,
              parentSpecialRequests: orientationData?.parentSpecialRequests,
              cooperationCommitment: orientationData?.cooperationCommitment,
              parentHealthNotes: orientationData?.parentHealthNotes
            },
            surveyScores: {
              mathScore: student?.mathScore ?? orientationData?.mathScore,
              literatureScore: student?.literatureScore ?? orientationData?.literatureScore,
              writtenEnglishScore: student?.writtenEnglishScore ?? orientationData?.writtenEnglishScore,
              oralEnglishScore: student?.oralEnglishScore ?? orientationData?.oralEnglishScore
            }
          })
        })
        if (res.ok) {
          const data = await res.json()
          setAiAdmissionSummary(data)
          if (data.diemManhNoiBat) setAdmissionStrengths(data.diemManhNoiBat)
          if (data.noiDungCanPhatTrien) setAdmissionNeedsSupport(data.noiDungCanPhatTrien)
          if (data.khaNangThichNghi) setAdmissionAdaptability(data.khaNangThichNghi)
          if (data.khuyenNghiXepLop) {
            const placement = [
              data.khuyenNghiXepLop,
              data.heHocDeXuat ? `(${data.heHocDeXuat})` : "",
              data.deXuatHoTroBanDau ? `• Hỗ trợ: ${data.deXuatHoTroBanDau}` : ""
            ].filter(Boolean).join(" ")
            setAdmissionPlacement(placement)
          }
          if (data.noiDungCanXacMinh) setAdmissionVerification(data.noiDungCanXacMinh)
        }
      } else {
        setShowAiPanel(true)
        const res = await fetch("/api/advisory/ai-advisor/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, academicYearId })
        })
        if (res.ok) {
          const data = await res.json()
          setAiSuggestions(data)
        }
      }
    } catch (e) {
      console.error("AI error:", e)
    } finally {
      setLoadingAi(false)
    }
  }

  // Chuyển toàn bộ 5 chiều định hướng vào Phiếu Định Hướng
  const handleApplyToOrientation = () => {
    if (onApplyOrientationSummary) {
      onApplyOrientationSummary({
        diemManhNoiBat: admissionStrengths || aiAdmissionSummary?.diemManhNoiBat,
        noiDungCanPhatTrien: admissionNeedsSupport || aiAdmissionSummary?.noiDungCanPhatTrien,
        khuyenNghiXepLop: admissionPlacement || aiAdmissionSummary?.khuyenNghiXepLop,
        heHocDeXuat: aiAdmissionSummary?.heHocDeXuat,
        deXuatHoTroBanDau: aiAdmissionSummary?.deXuatHoTroBanDau,
        noiDungCanXacMinh: admissionVerification || aiAdmissionSummary?.noiDungCanXacMinh,
        khaNangThichNghi: admissionAdaptability || aiAdmissionSummary?.khaNangThichNghi
      })
    }
    setToastMessage("Đã điền toàn bộ nội dung vào Phiếu Định Hướng!")
    setTimeout(() => {
      onClose()
    }, 300)
  }

  // Áp dụng câu hỏi AI vào nội dung
  const handleApplyAiQuestion = (q: string) => {
    setContent(prev => (prev ? `${prev}\n- ${q}` : `- ${q}`))
  }

  // Áp dụng hành động AI vào nextActions
  const handleApplyAiAction = (act: string, days = 7) => {
    setNextActions(prev => (prev ? `${prev}\n• ${act}` : `• ${act}`))
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDeadline(d.toISOString().split("T")[0])
  }

  // Toggle tag khó khăn
  const handleToggleTag = (tag: string) => {
    if (topics.includes(tag)) {
      setTopics(topics.filter(t => t !== tag))
    } else {
      setTopics([...topics, tag])
      setDifficulties(prev => prev ? `${prev}, ${tag}` : tag)
    }
  }

  // Lưu biên bản cố vấn 1-1
  const handleSaveConsultation = async () => {
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung trao đổi chính của buổi cố vấn.")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/advisory/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          meetingDate,
          content: `[Hình thức: ${meetingFormat === "DIRECT" ? "Trực tiếp" : "Online"}] ${content}`,
          difficulties,
          nextActions,
          deadline: deadline || null,
          notes,
          parentSharedSummary: notes,
          privateAdvisorNotes,
          shareWithParent,
          sessionFormat: meetingFormat,
          sessionStatus
        })
      })

      if (res.ok) {
        const savedLog = await res.json()

        // Nếu có hành động tiếp theo, tự động sinh Action Item
        if (nextActions.trim()) {
          await fetch("/api/advisory/action-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId,
              academicYearId,
              consultationLogId: savedLog.id,
              actionDescription: nextActions,
              deadline: deadline || null
            })
          }).catch(console.error)
        }

        setToastMessage("Đã lưu biên bản cố vấn thành công!")
        setTimeout(() => {
          onClose()
          if (onSaveSuccess) onSaveSuccess()
        }, 1200)
      } else {
        alert("Có lỗi khi lưu biên bản. Vui lòng thử lại.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Chuyển ca sang hỗ trợ học tập / tâm lý
  const handleReferSupport = async () => {
    if (!referReason.trim()) {
      alert("Vui lòng nhập lý do chuyển ca hỗ trợ.")
      return
    }
    try {
      setReferring(true)
      const res = await fetch("/api/advisory/refer-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          supportType: referType,
          reason: referReason,
          notes: difficulties ? `Khó khăn từ phiên cố vấn: ${difficulties}` : undefined
        })
      })
      if (res.ok) {
        alert(`Đã chuyển ca sang bộ phận ${referType === "PSYCHOLOGICAL" ? "Tâm lý học đường" : "Hỗ trợ học thuật"} thành công!`)
        setShowReferModal(false)
        setReferReason("")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setReferring(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#0A5C59] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-teal-200 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  {isAdmissionMode ? "Biên Bản Định Hướng & Cố Vấn Đầu Vào" : "Biên Bản Cố Vấn Học Tập 1-1"}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 text-[11px] font-bold border border-teal-400/30">
                  {isAdmissionMode ? "Sky-Line AI Admission" : "Tối giản < 90s"}
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                {isAdmissionMode
                  ? `${student?.fullName || student?.name || "Học sinh"} (${student?.studentCode || "—"}) • Khối ${student?.grade || "1"} • ${student?.registeredCampus || student?.admissionCampus || "Cơ sở Sky-Line"}`
                  : snapshot?.student
                  ? `${snapshot.student.studentName} (${snapshot.student.studentCode}) • Lớp ${snapshot.student.className}`
                  : "Đang tải hồ sơ..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFetchAiSuggestions}
              disabled={loadingAi}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-900 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-900 fill-amber-900" />
              <span>{loadingAi ? "AI đang phân tích..." : isAdmissionMode ? "Trợ lý AI Admission" : "Trợ lý AI Advisor"}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY: 2 COLUMNS */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* CỘT TRÁI: SNAPSHOT HỌC THUẬT & CHỈ SỐ TĂNG TRƯỞNG SGSI (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Chỉ số SGSI */}
            {sgsiData && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-teal-800" /> Chỉ số Tăng trưởng (SGSI)
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${sgsiData.tierBadgeClass}`}>
                    {sgsiData.ratingTier}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{sgsiData.compositeSgsiScore}</span>
                  <span className="text-xs text-slate-500">/ 100 điểm tăng trưởng</span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-[10px] text-center">
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <span className="text-slate-400 block font-medium">Tiến bộ (45%)</span>
                    <strong className="text-slate-800">{sgsiData.breakdown?.academicProgress?.score}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <span className="text-slate-400 block font-medium">Hỗ trợ (35%)</span>
                    <strong className="text-slate-800">{sgsiData.breakdown?.supportEffect?.score}</strong>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <span className="text-slate-400 block font-medium">Quy trình (20%)</span>
                    <strong className="text-slate-800">{sgsiData.breakdown?.processQuality?.score}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Snapshot Học thuật */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAdmissionMode ? "Tóm tắt Khảo sát & Học bạ (SSM)" : "Tóm tắt Kết quả Học tập"}</span>
              </span>

              {isAdmissionMode ? (
                <div className="space-y-2 text-xs">
                  {/* Điểm khảo sát 4 môn */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Điểm khảo sát các môn (SSM):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60 flex justify-between items-center shadow-2xs">
                        <span className="text-slate-500">Toán:</span>
                        <strong className="text-teal-900 font-black">{student?.mathScore ?? orientationData?.mathScore ?? "—"}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60 flex justify-between items-center shadow-2xs">
                        <span className="text-slate-500">Tiếng Việt/Văn:</span>
                        <strong className="text-teal-900 font-black">{student?.literatureScore ?? orientationData?.literatureScore ?? "—"}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60 flex justify-between items-center shadow-2xs">
                        <span className="text-slate-500">Tiếng Anh (viết):</span>
                        <strong className="text-teal-900 font-black">{student?.writtenEnglishScore ?? orientationData?.writtenEnglishScore ?? "—"}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60 flex justify-between items-center shadow-2xs">
                        <span className="text-slate-500">Tiếng Anh (nói):</span>
                        <strong className="text-teal-900 font-black">{student?.oralEnglishScore ?? orientationData?.oralEnglishScore ?? "—"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Học bạ &amp; Rèn luyện:</span>
                    </div>
                    <strong className="font-bold">
                      {student?.kqHocTap || student?.academicRating || "Tốt"} / {student?.kqRenLuyen || student?.conductRating || "Tốt"}
                    </strong>
                  </div>

                  <div className="text-[11px] text-slate-500 p-1 flex justify-between">
                    <span>Trường cũ:</span>
                    <strong className="text-slate-700">{student?.oldSchoolName || "Chưa cập nhật"}</strong>
                  </div>
                </div>
              ) : loadingSnapshot ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải snapshot...</div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-600">Điểm trung bình các môn:</span>
                    <strong className="text-slate-900 font-bold">{snapshot?.academicPerformance?.avgScore ?? "Chưa có"}</strong>
                  </div>

                  {snapshot?.academicPerformance?.underBenchmarkCount > 0 ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Môn cần lưu ý (&lt; 6.0 điểm):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {snapshot.academicPerformance.underBenchmarkSubjects.map((s: any) => (
                          <span key={s.subjectId} className="px-2 py-0.5 rounded bg-white text-rose-700 font-bold text-[10px] shadow-2xs">
                            {s.subjectName} ({s.score})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Các môn học đều đạt chuẩn benchmark.</span>
                    </div>
                  )}

                  {snapshot?.baselineAssessment && (
                    <div className="text-[11px] text-slate-500 pt-1">
                      Mốc KSCL đầu năm: Toán: <strong>{snapshot.baselineAssessment.mathScore ?? "-"}</strong> | Anh: <strong>{snapshot.baselineAssessment.englishScore ?? "-"}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2.5. Trao đổi & Nguyện vọng Phụ huynh (Chế độ Tuyển sinh / Định hướng) */}
            {isAdmissionMode && (orientationData?.parentExpectations || orientationData?.parentPersonalityNotes || orientationData?.parentSpecialRequests) && (
              <div className="p-4 rounded-2xl bg-white border border-teal-200/80 shadow-xs space-y-2.5">
                <span className="text-xs font-black uppercase text-teal-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Trao đổi &amp; Nguyện vọng từ PHHS</span>
                </span>
                <div className="space-y-2 text-[11px] leading-relaxed">
                  {orientationData?.parentExpectations && (
                    <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                      <span className="font-bold text-teal-900 block mb-0.5">Nguyện vọng gia đình:</span>
                      <p className="text-slate-700">{orientationData.parentExpectations}</p>
                    </div>
                  )}
                  {orientationData?.parentPersonalityNotes && (
                    <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                      <span className="font-bold text-teal-900 block mb-0.5">Tính cách &amp; Thói quen:</span>
                      <p className="text-slate-700">{orientationData.parentPersonalityNotes}</p>
                    </div>
                  )}
                  {orientationData?.parentSpecialRequests && (
                    <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                      <span className="font-bold text-teal-900 block mb-0.5">Đề xuất hỗ trợ từ PH:</span>
                      <p className="text-slate-700">{orientationData.parentSpecialRequests}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Nút Chuyển ca sang Phụ đạo / Tâm lý */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1">
                  <HeartHandshake className="w-4 h-4 text-amber-700" /> Phối Hợp Chuyên Môn
                </span>
                <button
                  type="button"
                  onClick={() => setShowReferModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer shadow-xs"
                >
                  Chuyển Ca Hỗ Trợ
                </button>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Khi học sinh có biểu hiện tụt dốc học tập nghiêm trọng hoặc cần tư vấn tâm lý chuyên sâu, bấm chuyển ca để phân công giáo viên phụ đạo hoặc chuyên gia tâm lý.
              </p>
            </div>

            {/* 4. Khung AI Suggestions (Chỉ hiện ở mode Cố vấn học tập thường) */}
            {!isAdmissionMode && showAiPanel && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-600 via-white to-amber-50 border border-teal-200 shadow-xs space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                  <span className="text-xs font-black text-teal-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{isAdmissionMode ? "Dự thảo Sky-Line AI Admission" : "Gợi Ý Từ AI Advisor"}</span>
                  </span>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="text-teal-700 hover:text-teal-800 text-xs font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                {loadingAi ? (
                  <div className="py-4 text-center text-xs text-teal-800 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-teal-800" />
                    <span>{isAdmissionMode ? "Đang tổng hợp hồ sơ đầu vào..." : "Đang phân tích số liệu học thuật..."}</span>
                  </div>
                ) : isAdmissionMode && aiAdmissionSummary ? (
                  /* GIAO DIỆN TỔNG HỢP 5 CHIỀU SKY-LINE AI ADMISSION */
                  <div className="space-y-2.5 text-xs">
                    {/* 1. Điểm mạnh */}
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-black text-emerald-800 uppercase">🌟 1. Điểm mạnh nổi bật</span>
                        <button
                          type="button"
                          onClick={() => setContent(prev => prev ? `${prev}\n- Thế mạnh: ${aiAdmissionSummary.diemManhNoiBat}` : `Thế mạnh: ${aiAdmissionSummary.diemManhNoiBat}`)}
                          className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          Chèn +
                        </button>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-relaxed">{aiAdmissionSummary.diemManhNoiBat}</p>
                    </div>

                    {/* 2. Cần phát triển & Hỗ trợ */}
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-black text-amber-800 uppercase">🎯 2. Nhu cầu hỗ trợ</span>
                        <button
                          type="button"
                          onClick={() => setDifficulties(prev => prev ? `${prev}, ${aiAdmissionSummary.noiDungCanPhatTrien}` : aiAdmissionSummary.noiDungCanPhatTrien)}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                        >
                          Thêm khó khăn +
                        </button>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-relaxed">{aiAdmissionSummary.noiDungCanPhatTrien}</p>
                    </div>

                    {/* 3. Khả năng thích nghi */}
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200 space-y-1 shadow-2xs">
                      <span className="text-[10.5px] font-black text-blue-800 uppercase block">🌱 3. Thích nghi &amp; Tâm thế</span>
                      <p className="text-slate-800 text-[11px] leading-relaxed">{aiAdmissionSummary.khaNangThichNghi}</p>
                    </div>

                    {/* 4. Hành động & Xếp lớp */}
                    {(aiAdmissionSummary.khuyenNghiXepLop || aiAdmissionSummary.deXuatHoTroBanDau) && (
                      <div className="p-2.5 bg-white rounded-xl border border-teal-200 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black text-teal-800 uppercase">🤝 4. Xếp lớp &amp; Giải pháp</span>
                          <button
                            type="button"
                            onClick={() => {
                              const act = `Xếp lớp: ${aiAdmissionSummary.khuyenNghiXepLop} • Hỗ trợ: ${aiAdmissionSummary.deXuatHoTroBanDau || "Theo dõi tuần đầu"}`
                              handleApplyAiAction(act, 14)
                            }}
                            className="text-[10px] text-teal-800 font-bold hover:underline cursor-pointer"
                          >
                            Tạo việc cần làm +
                          </button>
                        </div>
                        <p className="text-slate-800 text-[11px] leading-relaxed">
                          {aiAdmissionSummary.khuyenNghiXepLop} {aiAdmissionSummary.heHocDeXuat ? `(${aiAdmissionSummary.heHocDeXuat})` : ""}: {aiAdmissionSummary.deXuatHoTroBanDau}
                        </p>
                      </div>
                    )}

                    {/* Nút bấm liên thông điền vào phiếu định hướng */}
                    {onApplyOrientationSummary && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyOrientationSummary(aiAdmissionSummary)
                            alert("Đã cập nhật dự thảo AI vào Phiếu Định Hướng thành công!")
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>✓ Điền toàn bộ vào Phiếu Định Hướng</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : aiSuggestions ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-teal-800 block mb-1">Câu hỏi gợi mở cho phiên:</span>
                      <div className="space-y-1">
                        {aiSuggestions.questions?.map((q: string, i: number) => (
                          <div
                            key={i}
                            onClick={() => handleApplyAiQuestion(q)}
                            className="p-2 rounded-xl bg-white hover:bg-teal-100/60 border border-teal-200 cursor-pointer transition-all text-slate-800 text-[11px] leading-snug flex items-start justify-between gap-1 group"
                          >
                            <span>{q}</span>
                            <span className="text-[10px] text-teal-800 font-bold opacity-0 group-hover:opacity-100 shrink-0">Chèn +</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-teal-800 block mb-1">Hành động gợi ý cho HS:</span>
                      <div className="space-y-1">
                        {aiSuggestions.actionPlan?.map((act: any, i: number) => (
                          <div
                            key={i}
                            onClick={() => handleApplyAiAction(act.actionText, act.deadlineDays)}
                            className="p-2 rounded-xl bg-white hover:bg-teal-100/60 border border-teal-200 cursor-pointer transition-all text-slate-800 text-[11px] flex items-center justify-between gap-1 group"
                          >
                            <span>• {act.actionText}</span>
                            <span className="text-[10px] text-teal-800 font-bold opacity-0 group-hover:opacity-100 shrink-0">Áp dụng +</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

          </div>

          {/* CỘT PHẢI: FORM GHI CHÉP (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            
            {isAdmissionMode ? (
              /* GIAO DIỆN CHUẨN HÓA 5 CHIỀU ĐỊNH HƯỚNG ĐẦU VÀO (SKY-LINE AI ADMISSION) */
              <div className="space-y-3.5">
                {/* Header trạng thái */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-emerald-600 border border-teal-200/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-teal-950 uppercase tracking-wide">
                        Định Hướng Đầu Vào (Chuẩn Hóa 5 Chiều Theo SSM)
                      </h4>
                      <p className="text-[11px] text-teal-700">
                        {loadingAi ? "AI đang tổng hợp và đối soát dữ liệu..." : "Tổng hợp từ Khảo sát, Học bạ và Phỏng vấn. Thầy/Cô có toàn quyền chỉnh sửa."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchAiSuggestions}
                    disabled={loadingAi}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-teal-800 border border-teal-300 hover:bg-teal-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? "animate-spin text-teal-600" : ""}`} />
                    <span>{loadingAi ? "Đang phân tích..." : "Phân tích lại"}</span>
                  </button>
                </div>

                {/* 1. Điểm mạnh nổi bật */}
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌟 1. Điểm mạnh nổi bật của học sinh:</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Năng lực cốt lõi
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={admissionStrengths}
                    onChange={e => setAdmissionStrengths(e.target.value)}
                    placeholder="Ghi nhận điểm mạnh về nhận thức, ngôn ngữ, tư duy logic, năng khiếu hoặc thái độ tích cực..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* 2. Nội dung cần phát triển & Nhu cầu hỗ trợ */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎯 2. Nội dung cần tiếp tục phát triển &amp; Nhu cầu hỗ trợ:</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                      Trọng tâm bồi dưỡng
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={admissionNeedsSupport}
                    onChange={e => setAdmissionNeedsSupport(e.target.value)}
                    placeholder="Nội dung cần củng cố kiến thức, kỹ năng tự học, khả năng tập trung, thói quen sinh hoạt..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                {/* 3. Khả năng thích nghi & Tâm thế học tập */}
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌱 3. Khả năng thích nghi &amp; Tâm thế học tập:</span>
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                      Tâm thế sẵn sàng
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={admissionAdaptability}
                    onChange={e => setAdmissionAdaptability(e.target.value)}
                    placeholder="Ghi nhận mức độ sẵn sàng hòa nhập, tâm thế tương tác với thầy cô, bạn bè mới tại Sky-Line..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* 4. Đề xuất xếp lớp & Giải pháp tiếp nhận ban đầu */}
                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🤝 4. Đề xuất xếp lớp &amp; Giải pháp tiếp nhận ban đầu:</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-bold bg-white px-2 py-0.5 rounded border border-teal-200">
                      Khuyến nghị phân lớp
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={admissionPlacement}
                    onChange={e => setAdmissionPlacement(e.target.value)}
                    placeholder="Đề xuất khối lớp, hệ học và phương án giáo viên đồng hành trong 2 tuần đầu..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                {/* 5. Nội dung cần tiếp tục xác minh (nếu có) */}
                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🔍 5. Nội dung cần tiếp tục xác minh / Phối hợp PHHS:</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-bold bg-white px-2 py-0.5 rounded border border-teal-200">
                      Theo dõi thêm
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={admissionVerification}
                    onChange={e => setAdmissionVerification(e.target.value)}
                    placeholder="Ghi nhận thông tin cần xác minh thêm từ gia đình (thói quen, sức khỏe, lịch sử học tập)..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* GIAO DIỆN BIÊN BẢN CỐ VẤN HỌC THUẬT TRONG NĂM HỌC */
              <div className="space-y-4">
                {/* Hàng 1: Ngày họp & Hình thức */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Ngày tư vấn:
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      Hình thức gặp:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMeetingFormat("DIRECT")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          meetingFormat === "DIRECT"
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Trực tiếp
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeetingFormat("ONLINE")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          meetingFormat === "ONLINE"
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Online
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: Chọn nhanh Khó khăn */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Khó khăn ghi nhận (Chọn nhanh):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickDifficultyTags.map(tag => {
                      const selected = topics.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            selected
                              ? "bg-teal-700 text-white font-bold shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}{tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Hàng 3: Nội dung trao đổi cốt lõi */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Nội dung trao đổi &amp; Đánh giá từ Cố vấn: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Ghi vắn tắt nội dung chính đã trao đổi với học sinh..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                {/* Hàng 4: Hành động tiếp theo & Deadline (Sinh Action Item) */}
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                      Hành động tiếp theo (Giao cho Học sinh):
                    </label>
                    <span className="text-[10px] text-teal-700 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
                      Tự động tạo việc cần làm
                    </span>
                  </div>

                  <input
                    type="text"
                    value={nextActions}
                    onChange={e => setNextActions(e.target.value)}
                    placeholder="Ví dụ: Ôn tập lại 2 bài hình học; Đọc xong chương 3 môn Sinh..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="text-xs text-teal-800 font-bold">Hạn chót:</span>
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-xs font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hàng 5: Phân tách Ghi chú chuyên môn riêng (Private) vs Chia sẻ Phụ huynh (Shared) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-amber-950 uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>🔒 Ghi chú riêng của CVHT (Private):</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={privateAdvisorNotes}
                      onChange={e => setPrivateAdvisorNotes(e.target.value)}
                      placeholder="Ghi chú chuyên môn nội bộ (Tuyệt đối không gửi sang cổng PHHS & HS)..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-medium focus:outline-none"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-sky-950 uppercase">
                        👨‍👩‍👧 Khuyến nghị gửi Phụ huynh:
                      </label>
                      <label className="inline-flex items-center gap-1 text-[10px] font-black text-sky-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareWithParent}
                          onChange={e => setShareWithParent(e.target.checked)}
                          className="w-3.5 h-3.5 accent-teal-700 rounded"
                        />
                        <span>{shareWithParent ? "Chia sẻ PHHS" : "Không chia sẻ"}</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Lời dặn dò / khuyến nghị phối hợp gửi tới Quý Phụ huynh..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-sky-200 text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 italic">
                {isAdmissionMode 
                  ? "✓ Liên thông trực tiếp với Phiếu Khảo sát Định Hướng & Cố Vấn Tuyển Sinh"
                  : "Thời gian ghi chép trung bình: 60 - 90 giây"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                {isAdmissionMode ? (
                  <button
                    type="button"
                    onClick={handleApplyToOrientation}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ Điền toàn bộ vào Phiếu Định Hướng</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveConsultation}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Hoàn Tất Phiên
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* POPUP PHỤ: CHUYỂN CA HỖ TRỢ */}
      {showReferModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                Chuyển Ca Hỗ Trợ Chuyên Môn
              </h3>
              <button onClick={() => setShowReferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình hỗ trợ:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReferType("ACADEMIC")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      referType === "ACADEMIC"
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Phụ Đạo Học Thuật
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferType("PSYCHOLOGICAL")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      referType === "PSYCHOLOGICAL"
                        ? "bg-[#003B3A] text-white border-teal-400 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Tâm Lý Học Đường
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý do &amp; Yêu cầu cụ thể:</label>
                <textarea
                  rows={3}
                  value={referReason}
                  onChange={e => setReferReason(e.target.value)}
                  placeholder="Mô tả cụ thể vấn đề của học sinh để bộ phận tiếp nhận có giải pháp hỗ trợ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReferModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReferSupport}
                disabled={referring}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer shadow-xs"
              >
                {referring ? "Đang chuyển..." : "Xác Nhận Chuyển"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
