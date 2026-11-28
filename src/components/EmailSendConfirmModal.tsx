"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  Users,
  X,
} from "lucide-react"

export interface EmailConfirmRecipient {
  key: string
  teacherName: string
  teacherEmail?: string
  batchName?: string
  scopeLabel?: string
  studentCount?: number
}

interface EmailSendConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (selectedKeys: string[]) => Promise<void> | void
  loading?: boolean
  mode: "SINGLE" | "BULK"
  periodName: string
  batchLabel: string
  isAllBatches?: boolean
  recipients: EmailConfirmRecipient[]
  ccHint?: string
  senderSummary?: string
  subjectPreview?: string
}

export function EmailSendConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  mode,
  periodName,
  batchLabel,
  isAllBatches = false,
  recipients,
  ccHint = "ktdbcl@skylineschool.edu.vn & Giáo vụ cơ sở",
  senderSummary,
  subjectPreview,
}: EmailSendConfirmModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (open) {
      setSelectedKeys(recipients.map((r) => r.key))
      setAcknowledged(false)
      setSearchTerm("")
    }
  }, [open, recipients])

  const filteredRecipients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return recipients
    return recipients.filter(
      (r) =>
        r.teacherName.toLowerCase().includes(q) ||
        (r.teacherEmail || "").toLowerCase().includes(q) ||
        (r.batchName || "").toLowerCase().includes(q) ||
        (r.scopeLabel || "").toLowerCase().includes(q)
    )
  }, [recipients, searchTerm])

  const selectedRecipients = useMemo(
    () => recipients.filter((r) => selectedKeys.includes(r.key)),
    [recipients, selectedKeys]
  )

  const distinctBatches = useMemo(() => {
    const set = new Set(
      selectedRecipients
        .map((r) => (r.batchName || "").trim())
        .filter((b) => b && b !== "Tất cả đợt" && b !== "Tất cả các đợt")
    )
    return set.size
  }, [selectedRecipients])

  const isHighRisk =
    mode === "BULK" &&
    (isAllBatches || distinctBatches > 1 || selectedRecipients.length >= 5)

  const allSelected =
    recipients.length > 0 && selectedKeys.length === recipients.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys([])
    } else {
      setSelectedKeys(recipients.map((r) => r.key))
    }
  }

  const toggleOne = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  if (!open) return null

  const canSubmit =
    !loading &&
    selectedRecipients.length > 0 &&
    (!isHighRisk || acknowledged)

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      <div className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header — Sky-Line Deep Pine */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isHighRisk
              ? "bg-[#003B3A] border-rose-500/40"
              : "bg-[#003B3A] border-[#003B3A]"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isHighRisk
                  ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
                  : "bg-amber-400/20 border-amber-300/40 text-amber-200"
              }`}
            >
              {isHighRisk ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                {isHighRisk
                  ? "Cảnh báo xác nhận gửi email hàng loạt"
                  : "Bạn có chắc chắn muốn gửi email thông báo?"}
              </h3>
              <p className="text-xs text-teal-100/90 mt-0.5 truncate">
                Kiểm tra kỹ danh sách giáo viên, đợt khảo sát và phạm vi trước khi phát hành email.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-6 pt-4 pb-3 space-y-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          {isHighRisk ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E11D48] shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1 leading-relaxed">
                <p className="font-bold text-[#E11D48]">
                  Cảnh báo phạm vi gửi rộng — Email không thể thu hồi sau khi gửi!
                </p>
                <p>
                  Bạn đang chọn gửi email thông báo cho{" "}
                  <strong className="tabular-nums">{selectedRecipients.length} giáo viên</strong>
                  {distinctBatches > 1 ? (
                    <>
                      {" "}
                      trải rộng trên{" "}
                      <strong className="tabular-nums">{distinctBatches} đợt khảo sát khác nhau</strong>
                    </>
                  ) : null}
                  {isAllBatches ? (
                    <>
                      {" "}
                      do bộ lọc đang để chế độ <strong>Toàn kỳ (Tất cả các đợt)</strong>
                    </>
                  ) : null}
                  . Nếu bạn chỉ muốn gửi cho 1 đợt hoặc 1 số giáo viên cụ thể, vui lòng bỏ chọn các dòng không cần thiết bên dưới hoặc đóng lại để lọc đúng đợt trước khi gửi.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <p className="text-xs text-amber-950 leading-relaxed">
                Hệ thống sẽ gửi email thông báo phân công chính thức kèm thông báo trên cổng SSM cho{" "}
                <strong className="tabular-nums">{selectedRecipients.length} giáo viên</strong> được chọn bên dưới. Vui lòng kiểm tra trước khi xác nhận.
              </p>
            </div>
          )}

          {/* Unified Ledger Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Kỳ khảo sát</div>
              <div className="text-xs font-bold text-[#003B3A] mt-0.5 truncate" title={periodName}>
                {periodName || "—"}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Phạm vi đợt</div>
              <div className="text-xs font-bold mt-0.5 truncate" title={batchLabel}>
                {isAllBatches ? (
                  <span className="text-[#E11D48]">
                    Toàn kỳ ({distinctBatches || "nhiều"} đợt)
                  </span>
                ) : (
                  <span className="text-[#00736E]">{batchLabel || "—"}</span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Số lượng sẽ gửi</div>
              <div className="text-xs font-bold text-[#003B3A] mt-0.5 tabular-nums flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>
                  {selectedRecipients.length} / {recipients.length} giáo viên
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 space-y-1">
            {senderSummary && (
              <div className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
                <span>
                  Đơn vị gửi: <span className="font-semibold text-[#003B3A]">{senderSummary}</span>
                </span>
              </div>
            )}
            {subjectPreview && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                <span className="truncate">
                  Tiêu đề email: <span className="font-semibold text-slate-700">{subjectPreview}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
              <span>
                Đồng gửi (Cc): <span className="font-semibold text-slate-700">{ccHint}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Recipient List Table */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {recipients.length > 5 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Lọc nhanh theo tên giáo viên, đợt khảo sát, môn..."
                className="flex-1 min-w-[220px] bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00736E]"
              />
              <button
                type="button"
                onClick={toggleAll}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#003B3A] transition-colors cursor-pointer"
              >
                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[280px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0 z-10">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    {mode === "BULK" && (
                      <th className="py-2.5 px-3 w-10 text-center text-white">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="w-3.5 h-3.5 rounded cursor-pointer accent-[#00A19A]"
                          aria-label="Chọn tất cả giáo viên"
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-3 text-white">Giáo viên nhận email</th>
                    <th className="py-2.5 px-3 text-teal-100">Đợt khảo sát</th>
                    <th className="py-2.5 px-3 text-teal-100">Phạm vi phân công</th>
                    {recipients.some((r) => typeof r.studentCount === "number") && (
                      <th className="py-2.5 px-3 text-[#5EEAD4] text-center">Học sinh</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredRecipients.map((r) => {
                    const checked = selectedKeys.includes(r.key)
                    return (
                      <tr
                        key={r.key}
                        onClick={() => {
                          if (mode === "BULK") toggleOne(r.key)
                        }}
                        className={`transition-colors align-middle ${
                          mode === "BULK" ? "cursor-pointer" : ""
                        } ${
                          checked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : "opacity-55 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {mode === "BULK" && (
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(r.key)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-[#00736E]"
                            />
                          </td>
                        )}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{r.teacherName}</div>
                          {r.teacherEmail && (
                            <div className="text-[11px] text-slate-500">{r.teacherEmail}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={r.batchName}>
                          {r.batchName || "Tất cả đợt"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[220px] truncate" title={r.scopeLabel}>
                          {r.scopeLabel || "—"}
                        </td>
                        {recipients.some((x) => typeof x.studentCount === "number") && (
                          <td className="py-2.5 px-3 text-center font-semibold text-[#00736E]">
                            {typeof r.studentCount === "number" ? `${r.studentCount} HS` : "—"}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mandatory safety checkbox for high-risk bulk sends */}
          {isHighRisk && (
            <label
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                acknowledged
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                  : "bg-rose-50/50 border-rose-200 text-rose-950 hover:bg-rose-50"
              }`}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded cursor-pointer accent-[#003B3A] shrink-0"
              />
              <span className="text-xs font-medium leading-relaxed">
                Tôi xác nhận đã kiểm tra kỹ danh sách{" "}
                <strong className="tabular-nums">{selectedRecipients.length} giáo viên</strong> và các đợt khảo sát ở trên, và chắc chắn muốn gửi email thông báo này.
              </span>
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {selectedRecipients.length === 0 ? (
              <span className="text-[#E11D48] font-semibold">
                Vui lòng chọn ít nhất 1 giáo viên để gửi email.
              </span>
            ) : isHighRisk && !acknowledged ? (
              <span className="text-[#D97706] font-semibold">
                Hãy tích vào ô xác nhận phía trên để mở khóa nút gửi email.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#059669] font-semibold">
                <Check className="w-3.5 h-3.5" />
                Sẵn sàng gửi {selectedRecipients.length} email thông báo.
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onConfirm(selectedKeys)}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isHighRisk
                  ? "bg-[#E11D48] hover:bg-rose-700"
                  : "bg-[#003B3A] hover:bg-[#005854]"
              }`}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="tabular-nums">
                {loading
                  ? "Đang gửi email..."
                  : `Xác nhận gửi email (${selectedRecipients.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
