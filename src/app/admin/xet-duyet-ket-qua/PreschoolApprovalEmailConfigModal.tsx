"use client"

import React, { useEffect, useState } from "react"
import { Building2, Check, Loader2, Mail, RotateCcw, ShieldCheck, Users, X } from "lucide-react"

export type PreschoolCampusCode = "CS1" | "CS2" | "CS3" | "CS4" | "CS5"

export interface PreschoolCampusApprovalEmails {
  bghmn: string
  gdcs: string
  tuVan: string
  giaoVu: string
}

export interface PreschoolApprovalEmailConfigData {
  autoMergeDbStaff: boolean
  includeKtdbclCc: boolean
  ktdbclEmails: string
  campuses: Record<PreschoolCampusCode, PreschoolCampusApprovalEmails>
}

export const DEFAULT_PRESCHOOL_APPROVAL_EMAIL_CONFIG: PreschoolApprovalEmailConfigData = {
  autoMergeDbStaff: true,
  includeKtdbclCc: true,
  ktdbclEmails: "ktdbcl@skylineschool.edu.vn",
  campuses: {
    CS1: {
      bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn",
      gdcs: "longtt@skylineschool.edu.vn",
      tuVan: "thuongttn@skylineschool.edu.vn",
      giaoVu: "phuongvt@skylineschool.edu.vn, thuda@skylineschool.edu.vn",
    },
    CS2: {
      bghmn: "yenlth@skylineschool.edu.vn, thanhmaitt@skylineschool.edu.vn",
      gdcs: "khanhpt@skylineschool.edu.vn",
      tuVan: "hoaipt@skylineschool.edu.vn, dinhnth@skylineschool.edu.vn, doanhtt@skylineschool.edu.vn, huyennt@skylineschool.edu.vn",
      giaoVu: "thuda@skylineschool.edu.vn, dunglp@skylineschool.edu.vn",
    },
    CS3: {
      bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn",
      gdcs: "thanhtt@skylineschool.edu.vn",
      tuVan: "thungatt@skylineschool.edu.vn, hapvy@skylineschool.edu.vn",
      giaoVu: "thuda@skylineschool.edu.vn",
    },
    CS4: {
      bghmn: "quyenlth@skylineschool.edu.vn, chault@skylineschool.edu.vn",
      gdcs: "trungct@skylineschool.edu.vn",
      tuVan: "senttt@skylineschool.edu.vn, anhntm@skylineschool.edu.vn",
      giaoVu: "bichtramtt@skylineschool.edu.vn",
    },
    CS5: {
      bghmn: "monghatn@skylineschool.edu.vn, ngocltb@skylineschool.edu.vn",
      gdcs: "trungdq1@skylineschool.edu.vn, oanhntk@skylineschool.edu.vn",
      tuVan: "linhnmh@skylineschool.edu.vn, quyenttx@skylineschool.edu.vn",
      giaoVu: "dunglp@skylineschool.edu.vn",
    },
  },
}

const SUGGESTED_PRESCHOOL_STAFF: Record<
  PreschoolCampusCode,
  { bghmn: Array<{ label: string; email: string }>; gdcs: Array<{ label: string; email: string }> }
> = {
  CS1: {
    bghmn: [
      { label: "Lê Thị Hoàng Yến (BGH MN)", email: "yenlth@skylineschool.edu.vn" },
      { label: "Đặng Hoàng Bảo Yến (BGH MN)", email: "yendhb@skylineschool.edu.vn" },
    ],
    gdcs: [{ label: "Tống Thiên Long (GĐCS CS1)", email: "longtt@skylineschool.edu.vn" }],
  },
  CS2: {
    bghmn: [
      { label: "Lê Thị Hoàng Yến (BGH MN)", email: "yenlth@skylineschool.edu.vn" },
      { label: "Trần Thị Thanh Mai (BGH MN)", email: "thanhmaitt@skylineschool.edu.vn" },
    ],
    gdcs: [{ label: "Phạm Thị Khánh (GĐCS CS2)", email: "khanhpt@skylineschool.edu.vn" }],
  },
  CS3: {
    bghmn: [
      { label: "Lê Thị Hoàng Yến (BGH MN)", email: "yenlth@skylineschool.edu.vn" },
      { label: "Đặng Hoàng Bảo Yến (BGH MN)", email: "yendhb@skylineschool.edu.vn" },
    ],
    gdcs: [{ label: "Trần Thị Thanh (GĐCS CS3)", email: "thanhtt@skylineschool.edu.vn" }],
  },
  CS4: {
    bghmn: [
      { label: "Lâm Thị Hoàng Quyên (BGH MN)", email: "quyenlth@skylineschool.edu.vn" },
      { label: "Lê Thị Châu (BGH MN)", email: "chault@skylineschool.edu.vn" },
    ],
    gdcs: [{ label: "Cao Thanh Trung (GĐCS CS4)", email: "trungct@skylineschool.edu.vn" }],
  },
  CS5: {
    bghmn: [
      { label: "Trần Nguyễn Thị Mộng Hà (BGH MN)", email: "monghatn@skylineschool.edu.vn" },
      { label: "Lê Thị Bích Ngọc (BGH MN)", email: "ngocltb@skylineschool.edu.vn" },
    ],
    gdcs: [
      { label: "Đỗ Quang Trung (GĐCS CS5)", email: "trungdq1@skylineschool.edu.vn" },
      { label: "Nguyễn Thị Kiều Oanh (GĐCS CS5)", email: "oanhntk@skylineschool.edu.vn" },
    ],
  },
}

const CAMPUS_KEYS: PreschoolCampusCode[] = ["CS1", "CS2", "CS3", "CS4", "CS5"]

export function parseSavedPreschoolApprovalEmailConfig(
  configs?: any[]
): PreschoolApprovalEmailConfigData {
  const base: PreschoolApprovalEmailConfigData = JSON.parse(
    JSON.stringify(DEFAULT_PRESCHOOL_APPROVAL_EMAIL_CONFIG)
  )
  if (!Array.isArray(configs)) return base

  // Đồng bộ trước danh sách Tư vấn & Giáo vụ từ cấu hình Phổ thông (EMAIL_ROUTING_V1) nếu đã lưu
  const k12Found = configs.find(
    (c: any) => c.categoryType === "APPROVAL_EMAIL_CONFIG" && c.code === "EMAIL_ROUTING_V1"
  )
  if (k12Found?.name) {
    try {
      const k12Parsed = JSON.parse(k12Found.name)
      if (k12Parsed?.campuses) {
        for (const cs of CAMPUS_KEYS) {
          const kc = k12Parsed.campuses[cs]
          if (kc) {
            const k12TuVan = String(kc.tuvan || kc.tuVan || "").trim()
            const k12GiaoVu = String(kc.giaovu || kc.giaoVu || "").trim()
            if (k12TuVan) base.campuses[cs].tuVan = k12TuVan
            if (k12GiaoVu) base.campuses[cs].giaoVu = k12GiaoVu
          }
        }
      }
    } catch {}
  }

  const found = configs.find(
    (c: any) =>
      c.categoryType === "APPROVAL_EMAIL_CONFIG" && c.code === "PRESCHOOL_APPROVAL_ROUTING_V1"
  )
  if (!found?.name) return base
  try {
    const parsed = JSON.parse(found.name)
    if (typeof parsed.autoMergeDbStaff === "boolean") base.autoMergeDbStaff = parsed.autoMergeDbStaff
    if (typeof parsed.includeKtdbclCc === "boolean") base.includeKtdbclCc = parsed.includeKtdbclCc
    if (typeof parsed.ktdbclEmails === "string") base.ktdbclEmails = parsed.ktdbclEmails
    if (parsed.campuses) {
      for (const cs of CAMPUS_KEYS) {
        if (parsed.campuses[cs]) {
          const savedTuVan = String(parsed.campuses[cs].tuVan || parsed.campuses[cs].tuvan || "").trim()
          const savedGiaoVu = String(parsed.campuses[cs].giaoVu || parsed.campuses[cs].giaovu || "").trim()
          base.campuses[cs] = {
            bghmn:
              typeof parsed.campuses[cs].bghmn === "string"
                ? parsed.campuses[cs].bghmn
                : base.campuses[cs].bghmn,
            gdcs:
              typeof parsed.campuses[cs].gdcs === "string"
                ? parsed.campuses[cs].gdcs
                : base.campuses[cs].gdcs,
            tuVan: savedTuVan && !/^tuyensinh\.cs\d+@skylineschool\.edu\.vn$/i.test(savedTuVan)
              ? savedTuVan
              : base.campuses[cs].tuVan,
            giaoVu: savedGiaoVu ? savedGiaoVu : base.campuses[cs].giaoVu,
          }
        }
      }
    }
  } catch {
    // fallback to default
  }
  return base
}

function splitEmails(raw: string): string[] {
  return String(raw || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.includes("@"))
}

function toggleEmail(raw: string, email: string): string {
  const norm = email.trim().toLowerCase()
  const list = splitEmails(raw)
  const exists = list.some((e) => e.toLowerCase() === norm)
  return exists
    ? list.filter((e) => e.toLowerCase() !== norm).join(", ")
    : [...list, norm].join(", ")
}

interface Props {
  isOpen: boolean
  onClose: () => void
  config: PreschoolApprovalEmailConfigData
  onSaved: (cfg: PreschoolApprovalEmailConfigData) => void
}

export function PreschoolApprovalEmailConfigModal({ isOpen, onClose, config, onSaved }: Props) {
  const [draft, setDraft] = useState<PreschoolApprovalEmailConfigData>(() =>
    JSON.parse(JSON.stringify(config))
  )
  const [activeTab, setActiveTab] = useState<PreschoolCampusCode | "KTDBCL">("CS1")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(config)))
      setMsg(null)
    }
  }, [isOpen, config])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/assessment-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryType: "APPROVAL_EMAIL_CONFIG",
          code: "PRESCHOOL_APPROVAL_ROUTING_V1",
          name: JSON.stringify(draft),
          upsert: true,
        }),
      })
      if (res.ok) {
        onSaved(draft)
        setMsg({ text: "Đã lưu cấu hình email BGHMN & GĐCS xét duyệt thành công!", type: "ok" })
        setTimeout(() => onClose(), 650)
      } else {
        const err = await res.json().catch(() => ({}))
        setMsg({ text: err.error || "Không thể lưu cấu hình", type: "err" })
      }
    } catch (e: any) {
      setMsg({ text: "Lỗi kết nối: " + (e?.message || e), type: "err" })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_PRESCHOOL_APPROVAL_EMAIL_CONFIG)))
    setMsg({
      text: "Đã khôi phục danh bạ BGHMN & GĐCS mặc định Sky-Line (nhấn Lưu cấu hình để áp dụng).",
      type: "ok",
    })
  }

  const currentCampus = activeTab !== "KTDBCL" ? draft.campuses[activeTab] : null
  const currentSuggestions = activeTab !== "KTDBCL" ? SUGGESTED_PRESCHOOL_STAFF[activeTab] : null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#003B3A] px-5 py-4 text-white border-b border-[#003B3A]">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-[#5EEAD4]" />
            <div>
              <h3 className="text-sm font-semibold">
                Cấu hình Email BGHMN, GĐCS, Tư vấn &amp; Giáo vụ (Mầm non)
              </h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                Định tuyến email xét duyệt và thông báo kết quả khảo sát đầu vào Mầm non theo từng cơ sở.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Campus & KTDBCL Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
          {CAMPUS_KEYS.map((cs) => {
            const bghCount = splitEmails(draft.campuses[cs].bghmn).length
            const gdcsCount = splitEmails(draft.campuses[cs].gdcs).length
            const tuVanCount = splitEmails(draft.campuses[cs].tuVan || "").length
            const giaoVuCount = splitEmails(draft.campuses[cs].giaoVu || "").length
            const active = activeTab === cs
            return (
              <button
                key={cs}
                type="button"
                onClick={() => setActiveTab(cs)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
                  active
                    ? "bg-[#003B3A] text-white"
                    : "bg-white text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{cs}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-[#00A19A] text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {bghCount + gdcsCount + tuVanCount + giaoVuCount}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setActiveTab("KTDBCL")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "KTDBCL"
                ? "bg-[#003B3A] text-white"
                : "bg-white text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>KT&ĐBCL & Tùy chọn</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {msg && (
            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                msg.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          {activeTab !== "KTDBCL" && currentCampus && currentSuggestions ? (
            <div className="space-y-4">
              {/* BGH MN */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#00A19A]" />
                    Email Ban Giám hiệu Mầm non (BGHMN) — {activeTab}
                  </label>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {splitEmails(currentCampus.bghmn).length} email
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={currentCampus.bghmn}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      campuses: {
                        ...prev.campuses,
                        [activeTab]: { ...prev.campuses[activeTab], bghmn: e.target.value },
                      },
                    }))
                  }
                  placeholder="Nhập các email cách nhau bằng dấu phẩy..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {currentSuggestions.bghmn.map((item) => {
                    const selected = splitEmails(currentCampus.bghmn).some(
                      (e) => e.toLowerCase() === item.email.toLowerCase()
                    )
                    return (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            campuses: {
                              ...prev.campuses,
                              [activeTab]: {
                                ...prev.campuses[activeTab],
                                bghmn: toggleEmail(prev.campuses[activeTab].bghmn, item.email),
                              },
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          selected
                            ? "border-[#00A19A] bg-[#F0FDFA] text-[#003B3A]"
                            : "border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-[#008B85]" />}
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* GĐCS */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#00A19A]" />
                    Email Giám đốc Cơ sở (GĐCS) — {activeTab}
                  </label>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {splitEmails(currentCampus.gdcs).length} email
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={currentCampus.gdcs}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      campuses: {
                        ...prev.campuses,
                        [activeTab]: { ...prev.campuses[activeTab], gdcs: e.target.value },
                      },
                    }))
                  }
                  placeholder="Nhập các email cách nhau bằng dấu phẩy..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {currentSuggestions.gdcs.map((item) => {
                    const selected = splitEmails(currentCampus.gdcs).some(
                      (e) => e.toLowerCase() === item.email.toLowerCase()
                    )
                    return (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            campuses: {
                              ...prev.campuses,
                              [activeTab]: {
                                ...prev.campuses[activeTab],
                                gdcs: toggleEmail(prev.campuses[activeTab].gdcs, item.email),
                              },
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          selected
                            ? "border-[#00A19A] bg-[#F0FDFA] text-[#003B3A]"
                            : "border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-[#008B85]" />}
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tư vấn tuyển sinh cơ sở */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-[#00A19A]" />
                    Email Tư vấn tuyển sinh — {activeTab}
                  </label>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {splitEmails(currentCampus.tuVan || "").length} email
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={currentCampus.tuVan || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      campuses: {
                        ...prev.campuses,
                        [activeTab]: { ...prev.campuses[activeTab], tuVan: e.target.value },
                      },
                    }))
                  }
                  placeholder="Nhập các email Tư vấn tuyển sinh cơ sở cách nhau bằng dấu phẩy (vd: tuvan.cs2@skylineschool.edu.vn)..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Nhận thông báo tự động ngay khi BGH / Nhóm trưởng Mầm non xét duyệt (B6/B9A) và khi GĐCS phê duyệt (B10).
                </p>
              </div>

              {/* Giáo vụ cơ sở */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-[#00A19A]" />
                    Email Giáo vụ cơ sở — {activeTab}
                  </label>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {splitEmails(currentCampus.giaoVu || "").length} email
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={currentCampus.giaoVu || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      campuses: {
                        ...prev.campuses,
                        [activeTab]: { ...prev.campuses[activeTab], giaoVu: e.target.value },
                      },
                    }))
                  }
                  placeholder="Nhập các email Giáo vụ cơ sở cách nhau bằng dấu phẩy (vd: giaovu.cs2@skylineschool.edu.vn)..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Nhận thông báo tự động khi BGH / NT Mầm non duyệt (B6/B9A) và khi GĐCS phê duyệt kết quả (B10) để xuất thư.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.includeKtdbclCc}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, includeKtdbclCc: e.target.checked }))
                    }
                    className="mt-0.5 accent-[#003B3A]"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">
                      Gửi bản lưu cho Ban KT&ĐBCL / Khảo thí
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tự động đính kèm email Ban KT&ĐBCL trong danh sách nhận thông báo xét duyệt Mầm non.
                    </div>
                  </div>
                </label>

                {draft.includeKtdbclCc && (
                  <textarea
                    rows={2}
                    value={draft.ktdbclEmails}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, ktdbclEmails: e.target.value }))
                    }
                    placeholder="ktdbcl@skylineschool.edu.vn"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
                  />
                )}
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.autoMergeDbStaff}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, autoMergeDbStaff: e.target.checked }))
                    }
                    className="mt-0.5 accent-[#003B3A]"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">
                      Tự động gộp thêm email tài khoản BGHMN / GĐCS được gán cơ sở trong SSM
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Nếu bật, hệ thống sẽ lấy thêm email từ hồ sơ giáo viên (`Teacher.email`) của các tài khoản BGH_MN / GĐCS đang phụ trách cơ sở đó.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005250] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
