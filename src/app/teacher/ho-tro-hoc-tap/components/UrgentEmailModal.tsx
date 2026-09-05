"use client"

import { useState, useEffect } from "react"
import { Mail, X, AlertTriangle, Send, Users, Calendar, ShieldAlert, Search, CheckSquare, Square } from "lucide-react"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "../academic-calendar"
import { getTrackingLevelBadge } from "../client"

interface Props {
  isOpen: boolean
  onClose: () => void
  academicYearId: string
  targets: any[]
  selectedTargetIds?: string[]
}

export function UrgentEmailModal({
  isOpen,
  onClose,
  academicYearId,
  targets,
  selectedTargetIds = []
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("Tháng 9")
  const [selectedWeek, setSelectedWeek] = useState<string>("Tuần 1")
  const [isMonthlySummary, setIsMonthlySummary] = useState(false)
  const [urgencyNotes, setUrgencyNotes] = useState("")
  const [phhsTopics, setPhhsTopics] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [checkedTargetIds, setCheckedTargetIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState("")

  useEffect(() => {
    if (isOpen) {
      if (selectedTargetIds && selectedTargetIds.length > 0) {
        setCheckedTargetIds([...selectedTargetIds])
      } else {
        setCheckedTargetIds(targets.map(t => t.id))
      }
      setStudentSearch("")
    }
  }, [isOpen, selectedTargetIds, targets])

  if (!isOpen) return null

  const periodName = isMonthlySummary ? selectedMonth : `${selectedWeek} - ${selectedMonth}`
  const weeks = MONTH_WEEKS_CONFIG[selectedMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]

  const filteredDisplayTargets = targets.filter(t => {
    if (!studentSearch.trim()) return true
    const q = studentSearch.toLowerCase()
    const name = (t.student?.studentName || t.student?.fullName || "").toLowerCase()
    const code = (t.student?.studentCode || t.student?.code || "").toLowerCase()
    const cls = (t.student?.class?.className || t.student?.className || "").toLowerCase()
    return name.includes(q) || code.includes(q) || cls.includes(q)
  })

  const allFilteredChecked = filteredDisplayTargets.length > 0 && filteredDisplayTargets.every(t => checkedTargetIds.includes(t.id))

  const handleToggleSelectAll = () => {
    if (allFilteredChecked) {
      const filteredIds = new Set(filteredDisplayTargets.map(t => t.id))
      setCheckedTargetIds(prev => prev.filter(id => !filteredIds.has(id)))
    } else {
      const newChecked = new Set([...checkedTargetIds, ...filteredDisplayTargets.map(t => t.id)])
      setCheckedTargetIds(Array.from(newChecked))
    }
  }

  const handleToggleTarget = (id: string) => {
    setCheckedTargetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSendUrgentEmail = async () => {
    if (checkedTargetIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 học sinh để gửi thông báo")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendUrgentEmailToGVCN",
          academicYearId,
          targetIds: checkedTargetIds,
          periodName,
          periodType: isMonthlySummary ? "MONTH" : "WEEK",
          urgencyNotes,
          phhsTopics,
          customMessage
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error("Gửi email thất bại: " + data.error)
      } else {
        toast.success(`Đã gửi SOS Mail thông tin kết quả đến ${data.sentCount || 0} GVCN (${checkedTargetIds.length} học sinh) thành công!`, { duration: 5000 })
        onClose()
      }
    } catch (e: any) {
      toast.error("Lỗi khi gửi email: " + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4.5 bg-gradient-to-r from-rose-950 via-rose-800 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs shadow-xs">
              <ShieldAlert className="h-6 w-6 text-rose-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                🚨 SOS Mail: Báo cáo Kết quả đến GVCN
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Khẩn / Ưu tiên</span>
              </h3>
              <p className="text-xs text-rose-100 font-medium pt-0.5">
                Gửi thông tin kết quả đánh giá & phối hợp kế hoạch hỗ trợ học sinh với Giáo viên Chủ nhiệm
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-2 bg-rose-50/60 p-4 rounded-2xl border border-rose-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-rose-950 uppercase tracking-tight flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-rose-700" />
                1. Chọn Kỳ đánh giá gửi thông báo:
              </label>
              <span className="text-xs font-black text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                {periodName}
              </span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-1">
              {ACADEMIC_MONTHS.map(m => {
                const isSelected = selectedMonth === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(m)
                      setSelectedWeek("Tuần 1")
                    }}
                    className={`py-1.5 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? "bg-rose-800 text-white border-transparent font-black shadow-xs scale-[1.03]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300"
                    }`}
                  >
                    {m.replace("Tháng ", "T")}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-rose-200/60 mt-2">
              <span className="text-[11px] font-bold text-slate-600 mr-1">Chi tiết:</span>
              {weeks.map(w => {
                const isSelected = !isMonthlySummary && selectedWeek === w
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setSelectedWeek(w)
                      setIsMonthlySummary(false)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-rose-800 text-white border-transparent shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50"
                    }`}
                  >
                    📅 {w}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setIsMonthlySummary(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isMonthlySummary
                    ? "bg-gradient-to-r from-rose-800 to-red-700 text-white border-transparent shadow-xs font-black"
                    : "bg-white text-rose-800 border-rose-300 hover:bg-rose-50"
                }`}
              >
                ⭐ Tổng kết {selectedMonth}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Users className="h-4 w-4 text-rose-700" />
                2. Chọn Học sinh thông báo kết quả (Có thể chọn 1 hoặc nhiều HS):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Đã chọn: <strong className="text-rose-950 font-black">{checkedTargetIds.length}</strong> / {targets.length} HS
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  {allFilteredChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  <span>{allFilteredChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}</span>
                </button>
              </div>
            </div>

            {targets.length > 3 && (
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lọc nhanh học sinh theo tên, mã HS, lớp..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:bg-white"
                />
              </div>
            )}

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 p-2 text-xs divide-y divide-slate-100">
              {filteredDisplayTargets.length === 0 ? (
                <div className="text-center py-4 text-slate-400 font-medium">
                  Không tìm thấy học sinh nào phù hợp.
                </div>
              ) : (
                filteredDisplayTargets.map((t, idx) => {
                  const isChecked = checkedTargetIds.includes(t.id)
                  const targetEvals = t.evaluations || []
                  const matchedEval = targetEvals.find((e: any) =>
                    e.periodName === periodName ||
                    (e.periodName && e.periodName.includes(selectedWeek) && e.periodName.includes(selectedMonth))
                  ) || targetEvals[targetEvals.length - 1]
                  const bInfo = matchedEval ? getTrackingLevelBadge(matchedEval.trackingLevel) : null

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTarget(t.id)}
                      className={`py-2 px-2.5 rounded-xl flex items-center justify-between text-xs gap-2 transition-all cursor-pointer ${
                        isChecked ? "bg-rose-50/90 border border-rose-200 shadow-2xs font-semibold" : "hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <span className="font-extrabold text-slate-900">{idx + 1}. {t.student?.studentName || "N/A"}</span>
                          <span className="text-slate-500 ml-1.5 font-normal">({t.student?.studentCode})</span>
                          <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded ml-1.5 text-[10px]">
                            {t.student?.class?.className || "Lớp"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {bInfo ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${bInfo.badge}`}>
                            {bInfo.shortLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa đánh giá</span>
                        )}
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              3. Nội dung cần GVCN phối hợp trao đổi với Phụ huynh (PHHS):
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Nhờ GVCN liên hệ PHHS đôn đốc việc làm bài tập môn Toán mỗi tối 30 phút, kiểm tra nề nếp..."
              value={phhsTopics}
              onChange={e => setPhhsTopics(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-rose-700" />
              4. Lưu ý chuyên môn & yêu cầu can thiệp phối hợp với GVCN:
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Đề nghị GVCN bố trí bạn ngồi kèm cặp trong giờ học, theo dõi biểu hiện tâm lý và động viên học sinh..."
              value={urgencyNotes}
              onChange={e => setUrgencyNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-slate-50">
          <div className="text-xs font-bold text-slate-600">
            {checkedTargetIds.length > 0 ? (
              <span>Sẵn sàng gửi cho <strong className="text-rose-700 font-black">{checkedTargetIds.length}</strong> học sinh</span>
            ) : (
              <span className="text-rose-600 italic">Vui lòng chọn ít nhất 1 học sinh</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border hover:bg-slate-100 py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={sending || checkedTargetIds.length === 0}
              onClick={handleSendUrgentEmail}
              className="bg-gradient-to-r from-rose-800 to-red-700 hover:from-rose-900 hover:to-red-800 text-white py-2.5 px-5 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "Đang gửi SOS Mail..." : `Gửi SOS Mail đến GVCN (${checkedTargetIds.length} HS)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
