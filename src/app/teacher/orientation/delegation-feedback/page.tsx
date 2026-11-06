"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  UserCheck,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ShieldCheck,
  FileText,
  User,
  GraduationCap,
  Sparkles
} from "lucide-react"

export default function DelegationFeedbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = searchParams.get("studentId")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [student, setStudent] = useState<any>(null)
  const [delegationMission, setDelegationMission] = useState<any>(null)

  // Form Fields
  const [feedbackDate, setFeedbackDate] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })
  const [meetingType, setMeetingType] = useState<"DIRECT" | "PHONE" | "ONLINE">("DIRECT")
  const [parentRepresentative, setParentRepresentative] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [agreementContent, setAgreementContent] = useState("")
  const [parentConsentLevel, setParentConsentLevel] = useState<"HIGH" | "SUPPORT_NEEDED" | "CONCERNED">("HIGH")
  const [followUpPlan, setFollowUpPlan] = useState("")
  const [additionalNote, setAdditionalNote] = useState("")
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<any>(null)

  useEffect(() => {
    if (!studentId) {
      setErrorMessage("Thiếu mã học sinh (studentId). Vui lòng kiểm tra lại đường dẫn từ email.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/orientation/records?studentId=${studentId}`)
        const json = await res.json()

        if (!json.success) {
          setErrorMessage(json.error || "Không thể tải hồ sơ học sinh.")
          return
        }

        const st = json.student || json.data?.student
        setStudent(st)

        const record = json.data
        if (record?.parentRepresentativeName) {
          setParentRepresentative(record.parentRepresentativeName)
        }
        if (record?.parentPhone) {
          setParentPhone(record.parentPhone)
        }

        // Parse delegation mission & existing feedback
        if (record?.admissionConsultantNote) {
          try {
            if (record.admissionConsultantNote.trim().startsWith("{")) {
              const parsed = JSON.parse(record.admissionConsultantNote)
              setDelegationMission({
                teacherName: parsed.delegatedTeacherName || "",
                duration: parsed.delegationDuration || "4 tuần đầu năm học",
                note: parsed.delegationNote || "",
                delegatedAt: parsed.delegatedAt || "",
                delegatedBy: parsed.delegatedBy || "Ban Giám Đốc Cơ Sở"
              })

              if (parsed.delegationFeedback) {
                const fb = parsed.delegationFeedback
                if (fb.feedbackDate) setFeedbackDate(fb.feedbackDate.slice(0, 16))
                if (fb.meetingType) setMeetingType(fb.meetingType)
                if (fb.parentRepresentative) setParentRepresentative(fb.parentRepresentative)
                if (fb.parentPhone) setParentPhone(fb.parentPhone)
                if (fb.agreementContent) setAgreementContent(fb.agreementContent)
                if (fb.parentConsentLevel) setParentConsentLevel(fb.parentConsentLevel)
                if (fb.followUpPlan) setFollowUpPlan(fb.followUpPlan)
                if (fb.additionalNote) setAdditionalNote(fb.additionalNote)
                setLastUpdatedInfo({
                  updatedAt: fb.updatedAt,
                  updatedBy: fb.updatedBy
                })
              }
            }
          } catch (e) {}
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Lỗi kết nối máy chủ.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreementContent.trim()) {
      alert("Vui lòng nhập nội dung trao đổi & thỏa thuận cam kết với PHHS.")
      return
    }

    try {
      setSaving(true)
      setSaveSuccess(false)
      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveDelegationFeedback",
          studentId,
          feedbackDate: new Date(feedbackDate).toISOString(),
          meetingType,
          parentRepresentative,
          parentPhone,
          agreementContent,
          parentConsentLevel,
          followUpPlan,
          additionalNote
        })
      })

      const data = await res.json()
      if (data.success) {
        setSaveSuccess(true)
        setLastUpdatedInfo({
          updatedAt: new Date().toISOString(),
          updatedBy: "Bạn (vừa cập nhật)"
        })
      } else {
        alert(data.error || "Không thể lưu kết quả trao đổi.")
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi lưu kết quả.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Đang tải hồ sơ ủy quyền...</p>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Không thể mở biểu mẫu</h2>
          <p className="text-xs text-slate-600">{errorMessage}</p>
          <button
            onClick={() => router.push("/teacher")}
            className="px-4 py-2 bg-[#003B3A] text-white text-xs font-semibold rounded-xl hover:bg-[#002b2a] transition-all"
          >
            Quay lại không gian Giáo viên
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12">
      {/* HEADER BAR CHUẨN SKY-LINE ACADEMIC LEDGER */}
      <div className="bg-[#003B3A] border-b-4 border-[#00A19A] text-white py-5 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/teacher/input-assessments")}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-teal-300">
                Hệ Thống Giáo Dục Sky-Line • Sky-Line SSM
              </div>
              <h1 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-300" />
                <span>Phiếu Nhập Kết Quả Ủy Quyền Trao Đổi Phụ Huynh Học Sinh</span>
              </h1>
            </div>
          </div>
          {lastUpdatedInfo?.updatedAt && (
            <div className="text-right text-[11px] text-teal-200 bg-white/10 px-3 py-1 rounded-lg">
              Đã ghi nhận: <span className="font-bold text-white tabular-nums">{new Date(lastUpdatedInfo.updatedAt).toLocaleDateString("vi-VN")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* THÔNG TIN HỌC SINH & NHIỆM VỤ ỦY QUYỀN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Học sinh */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#003B3A] uppercase tracking-wide">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                <span>Thông tin học sinh khảo sát</span>
              </div>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full tabular-nums">
                Mã HS: {student?.studentCode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Họ và tên:</span>
                <strong className="text-slate-900 text-sm font-bold">{student?.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Khối & Hệ đào tạo:</span>
                <span className="font-semibold text-slate-800">
                  Khối {student?.grade || "1"} • {student?.surveyFormType || student?.surveySystem || "Chất lượng cao"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Cơ sở tiếp nhận:</span>
                <span className="font-semibold text-[#003B3A]">
                  {student?.admissionCampus || student?.batch?.campus?.campusName || "Cơ sở Sky-Line"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Đợt / Kỳ khảo sát:</span>
                <span className="text-slate-700">
                  {student?.batch?.name || student?.period?.name || "Khảo sát đầu vào"}
                </span>
              </div>
            </div>
          </div>

          {/* Card Nhiệm vụ ủy quyền từ GĐCS */}
          <div className="bg-[#f0fdfa] rounded-xl border border-teal-200 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-xs text-teal-900 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Nhiệm vụ GĐCS giao</span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-700">
              <div>
                <span className="text-slate-500 text-[11px] block">Thời hạn ủy quyền:</span>
                <strong className="text-teal-900">{delegationMission?.duration || "4 tuần đầu năm học"}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Nhiệm vụ trọng tâm:</span>
                <p className="text-[11.5px] italic text-slate-800 bg-white p-2 rounded-lg border border-teal-100">
                  &quot;{delegationMission?.note || "Chủ động liên hệ PHHS, trao đổi cởi mở kết quả khảo sát, thống nhất cam kết nề nếp và phương án đồng hành."}&quot;
                </p>
              </div>
              <div className="text-[10.5px] text-slate-500 pt-1">
                Phê duyệt bởi: <strong>{delegationMission?.delegatedBy || "Ban Giám Đốc Cơ Sở"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* THÔNG BÁO LƯU THÀNH CÔNG */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu thành công kết quả trao đổi với Phụ huynh học sinh! Ban Giám Đốc Cơ Sở đã được cập nhật dữ liệu.</span>
            </div>
          </div>
        )}

        {/* FORM NHẬP KẾT QUẢ TRAO ĐỔI VỚI PHHS */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-[#003B3A]">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Nội dung ghi nhận buổi làm việc với Phụ huynh học sinh</span>
            </div>
            <span className="text-[11px] text-slate-500">Bắt buộc điền các mục đánh dấu (*)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Thời gian trao đổi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>Thời gian trao đổi / làm việc (*):</span>
              </label>
              <input
                type="datetime-local"
                value={feedbackDate}
                onChange={e => setFeedbackDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none tabular-nums font-medium"
              />
            </div>

            {/* Hình thức trao đổi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                <span>Hình thức làm việc (*):</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMeetingType("DIRECT")}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                    meetingType === "DIRECT"
                      ? "bg-teal-50 border-teal-600 text-[#003B3A] shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  Trực tiếp
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType("PHONE")}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                    meetingType === "PHONE"
                      ? "bg-teal-50 border-teal-600 text-[#003B3A] shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  Điện thoại
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType("ONLINE")}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                    meetingType === "ONLINE"
                      ? "bg-teal-50 border-teal-600 text-[#003B3A] shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  Trực tuyến
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Đại diện PHHS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-700" />
                <span>Người đại diện PHHS đã trao đổi (*):</span>
              </label>
              <input
                type="text"
                value={parentRepresentative}
                onChange={e => setParentRepresentative(e.target.value)}
                placeholder="Ví dụ: Mẹ - Nguyễn Thị Mai..."
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700" />
                <span>Số điện thoại PHHS liên hệ:</span>
              </label>
              <input
                type="text"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                placeholder="Số điện thoại PHHS..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Mức độ đồng thuận của PHHS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mức độ đồng thuận & Cam kết của Phụ huynh học sinh (*):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setParentConsentLevel("HIGH")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  parentConsentLevel === "HIGH"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  parentConsentLevel === "HIGH" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                }`}>
                  {parentConsentLevel === "HIGH" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="font-bold text-xs text-emerald-800">Đồng thuận cao</div>
                  <div className="text-[10.5px] text-slate-600">Yên tâm gửi gắm, cam kết phối hợp chặt chẽ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setParentConsentLevel("SUPPORT_NEEDED")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  parentConsentLevel === "SUPPORT_NEEDED"
                    ? "bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  parentConsentLevel === "SUPPORT_NEEDED" ? "border-amber-600 bg-amber-600" : "border-slate-300"
                }`}>
                  {parentConsentLevel === "SUPPORT_NEEDED" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="font-bold text-xs text-amber-800">Cần tiếp tục hỗ trợ</div>
                  <div className="text-[10.5px] text-slate-600">Đồng thuận nhưng cần GVCN theo sát thích ứng</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setParentConsentLevel("CONCERNED")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  parentConsentLevel === "CONCERNED"
                    ? "bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  parentConsentLevel === "CONCERNED" ? "border-rose-600 bg-rose-600" : "border-slate-300"
                }`}>
                  {parentConsentLevel === "CONCERNED" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="font-bold text-xs text-rose-800">Còn băn khoăn</div>
                  <div className="text-[10.5px] text-slate-600">Có điểm chưa thống nhất, cần xin ý kiến GĐCS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Nội dung trao đổi & Cam kết thỏa thuận */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nội dung trao đổi & Thỏa thuận cam kết phối hợp giáo dục (*):
            </label>
            <textarea
              rows={4}
              value={agreementContent}
              onChange={e => setAgreementContent(e.target.value)}
              required
              placeholder="Ghi rõ: Các nội dung đã chia sẻ với Phụ huynh (tình hình khảo sát, điểm mạnh, điểm cần lưu ý); phản hồi của PHHS; các thỏa thuận cụ thể về rèn luyện nề nếp, thích ứng môi trường học tập..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none leading-relaxed"
            />
          </div>

          {/* Kế hoạch đồng hành tiếp theo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kế hoạch đồng hành tiếp theo trong các tuần đầu năm học:
            </label>
            <textarea
              rows={2}
              value={followUpPlan}
              onChange={e => setFollowUpPlan(e.target.value)}
              placeholder="Ví dụ: GV trao đổi định kỳ thứ 6 hàng tuần với PH; phối hợp GVCN xếp bạn kèm cặp; báo cáo GĐCS sau 2 tuần..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none"
            />
          </div>

          {/* Ghi chú bổ sung */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ghi chú thêm hoặc Đề xuất lên Ban Giám Đốc Cơ Sở (nếu có):
            </label>
            <textarea
              rows={2}
              value={additionalNote}
              onChange={e => setAdditionalNote(e.target.value)}
              placeholder="Đề xuất về xếp lớp, hỗ trợ tâm lý chuyên sâu nếu học sinh có dấu hiệu đặc biệt..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-900 outline-none"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/teacher/input-assessments")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Quay lại danh sách
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu kết quả...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-teal-300" />
                  <span>Lưu kết quả trao đổi với PHHS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
