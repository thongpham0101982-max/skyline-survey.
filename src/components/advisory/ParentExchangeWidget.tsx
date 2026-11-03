"use client"

import React, { useState, useEffect } from "react"
import {
  MessageSquareHeart,
  Send,
  CheckCircle2,
  Clock,
  Home,
  Calendar,
  UserCheck,
  RefreshCw,
  Zap,
  Feather,
  Star
} from "lucide-react"

interface ParentExchangeWidgetProps {
  studentId: string
  studentName?: string
  academicYearId: string
  homeroomTeacherName?: string
  primaryColor?: string
  darkColor?: string
}

const TOPIC_OPTIONS = [
  { id: "PHOI_HOP_GIA_DINH", label: "Phản hồi việc đồng hành & hỗ trợ con tại gia đình" },
  { id: "HOI_TIEN_DO_MUC_TIEU", label: "Trao đổi về mục tiêu SMART & tiến độ 7 ngày" },
  { id: "DAT_LICH_TRAO_DOI", label: "Đề nghị hẹn lịch trao đổi 1:1 cùng Cố vấn học tập" },
  { id: "DE_XUAT_HO_TRO", label: "Đề xuất CVHT hỗ trợ thêm về phương pháp / tâm lý" }
]

export default function ParentExchangeWidget({
  studentId,
  studentName = "con",
  academicYearId
}: ParentExchangeWidgetProps) {
  const [exchanges, setExchanges] = useState<any[]>([])
  const [actionItems, setActionItems] = useState<any[]>([])
  const [sharedReflections, setSharedReflections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState("PHOI_HOP_GIA_DINH")
  const [message, setMessage] = useState("")
  const [homeSupportSummary, setHomeSupportSummary] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState("")

  async function loadParentSharedData() {
    if (!studentId) return
    try {
      setLoading(true)
      const [resEx, resAct, resRef] = await Promise.all([
        fetch(
          `/api/advisory/parent-exchange?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/action-items?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/reflections?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null)
      ])

      if (resEx && resEx.ok) {
        const data = await resEx.json()
        setExchanges(Array.isArray(data.exchanges) ? data.exchanges : [])
      }
      if (resAct && resAct.ok) {
        const aData = await resAct.json()
        setActionItems(Array.isArray(aData.actionItems) ? aData.actionItems : [])
      }
      if (resRef && resRef.ok) {
        const rData = await resRef.json()
        setSharedReflections(Array.isArray(rData) ? rData : [])
      }
    } catch (e) {
      console.error("Failed to load parent shared data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadParentSharedData()
    }
  }, [studentId, academicYearId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      alert("Quý Phụ huynh vui lòng nhập nội dung trao đổi hoặc phản hồi.")
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch("/api/advisory/parent-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          topic,
          message: message.trim(),
          homeSupportSummary: homeSupportSummary.trim(),
          preferredTime: preferredTime.trim()
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setMessage("")
        setHomeSupportSummary("")
        setPreferredTime("")
        setToastMsg(data.message || "Đã gửi yêu cầu trao đổi tới Cố vấn học tập!")
        setTimeout(() => setToastMsg(""), 4000)
        loadParentSharedData()
      } else {
        alert(data.error || "Không thể gửi yêu cầu lúc này, vui lòng thử lại.")
      }
    } catch (err) {
      console.error("Submit parent exchange error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* KHỐI 1: THEO DÕI HÀNH ĐỘNG 7 NGÀY & PHIẾU TỰ PHẢN TƯ ĐƯỢC CHIA SẺ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CỘT TRÁI */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Hành Động 7 Ngày & Minh Chứng Của Con
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700">
              {actionItems.filter(a => a.status === "COMPLETED").length}/{actionItems.length} hoàn thành
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Chưa có đầu việc hành động 7 ngày nào được ghi nhận cho {studentName}.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {actionItems.slice(0, 8).map(act => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        act.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : act.status === "IN_PROGRESS"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {act.status === "COMPLETED"
                        ? "Đã hoàn thành"
                        : act.status === "IN_PROGRESS"
                        ? "Đang thực hiện"
                        : "Chờ thực hiện"}
                    </span>
                    {act.deadline && (
                      <span className="text-[10px] text-slate-400">
                        Hạn: {new Date(act.deadline).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-800">{act.actionDescription}</p>
                  {act.evidenceNotes && (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Minh chứng: “{act.evidenceNotes}”
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Feather className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Phiếu Tự Phản Tư Con Chia Sẻ Cùng Gia Đình
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
              {sharedReflections.length} phiếu
            </span>
          </div>

          {sharedReflections.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Chỉ các phiếu tự phản tư được con bật quyền “Chia sẻ cùng Ba Mẹ” mới hiển thị tại đây.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sharedReflections.map(ref => (
                <div
                  key={ref.id}
                  className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString("vi-VN") : "—"}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(ref.selfRating || 5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="font-medium text-slate-800">“{ref.reflectionText}”</p>
                  {ref.advisorFeedback && (
                    <div className="text-[11px] text-teal-700 font-medium">
                      CVHT: “{ref.advisorFeedback}”
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KHỐI 2: KÊNH PHẢN HỒI HỖ TRỢ TẠI GIA ĐÌNH & GỬI YÊU CẦU TRAO ĐỔI VỚI CVHT */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Phản Hồi Hỗ Trợ Tại Gia Đình & Gửi Yêu Cầu Trao Đổi Với CVHT
              </h3>
              <p className="text-[11px] text-slate-500">
                Kết nối trực tiếp với Hồ sơ Cố vấn học tập của Thầy/Cô phụ trách {studentName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadParentSharedData}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {toastMsg && (
          <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* FORM GỬI YÊU CẦU */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-6 space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/70"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Chủ đề trao đổi
                </label>
                <select
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                >
                  {TOPIC_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Khung giờ mong muốn liên hệ (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={e => setPreferredTime(e.target.value)}
                  placeholder="VD: Chiều thứ Sáu (16h30 - 17h00)"
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Ghi nhận việc đồng hành cùng con tại gia đình (Tùy chọn)
              </label>
              <input
                type="text"
                value={homeSupportSummary}
                onChange={e => setHomeSupportSummary(e.target.value)}
                placeholder="VD: Gia đình nhắc con tự học 45 phút mỗi tối..."
                className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                Nội dung trao đổi gửi Thầy/Cô CVHT (*)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Nhập nội dung Phụ huynh muốn phản hồi hoặc đề nghị hỗ trợ..."
                className="w-full p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-8 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Đang gửi..." : "Gửi Phản Hồi & Yêu Cầu Trao Đổi"}</span>
            </button>
          </form>

          {/* DANH SÁCH LỊCH SỬ TRAO ĐỔI */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Lịch sử phản hồi ({exchanges.length})</span>
              </span>
            </div>

            {exchanges.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-medium text-slate-500">
                  Chưa có yêu cầu trao đổi nào được gửi
                </p>
                <p className="text-[11px] text-slate-400">
                  Tiến độ tiếp nhận và phản hồi của CVHT sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {exchanges.map(item => {
                  const isResponded = item.status === "RESPONDED" || item.status === "CLOSED"
                  const topicLabel =
                    TOPIC_OPTIONS.find(t => t.id === item.topic)?.label || item.topic

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 truncate">
                          {topicLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            isResponded
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isResponded ? "Đã phản hồi" : "Chờ tiếp nhận"}
                        </span>
                      </div>

                      <p className="text-slate-600">“{item.message}”</p>

                      {item.advisorResponse && (
                        <div className="p-2 rounded-lg bg-teal-50/80 border border-teal-100 text-teal-900">
                          <span className="font-semibold text-[11px]">
                            CVHT ({item.teacherName || "GVCN"}):{" "}
                          </span>
                          “{item.advisorResponse}”
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
