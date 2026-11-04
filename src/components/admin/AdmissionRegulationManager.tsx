"use client"

import React, { useState, useEffect } from "react"
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Sliders,
  Sparkles,
  Download,
  X,
  Info
} from "lucide-react"
import {
  AdmissionRegulationConfig,
  AdmissionRegulationRule,
  DEFAULT_ADMISSION_REGULATIONS,
  parseAdmissionRegulationConfig,
  exportEligibleStudentsRegulationExcel
} from "@/lib/admissionRegulationEngine"

interface AdmissionRegulationManagerProps {
  initialConfig?: AdmissionRegulationConfig
  availableSubjects?: { id: string; name: string; code?: string }[]
  availableSystems?: { id?: string; code: string; name?: string }[]
  onConfigSaved?: (newConfig: AdmissionRegulationConfig) => void
  onClose?: () => void
  isModal?: boolean
  readOnly?: boolean
}

const ALL_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
const DEFAULT_SUBJECT_OPTIONS = [
  "Tâm lý",
  "Năng lực tư duy",
  "Tiếng Anh (vấn đáp)",
  "Tiếng Anh (viết)",
  "Toán học",
  "Tiếng Việt",
  "Ngữ Văn",
  "Phiếu định hướng đầu vào",
  "EPT"
]

export function AdmissionRegulationManager({
  initialConfig,
  availableSubjects = [],
  availableSystems = [],
  onConfigSaved,
  onClose,
  isModal = false,
  readOnly = false
}: AdmissionRegulationManagerProps) {
  const [config, setConfig] = useState<AdmissionRegulationConfig>(
    initialConfig || DEFAULT_ADMISSION_REGULATIONS
  )
  const [activeTab, setActiveTab] = useState<"rules" | "document">("rules")
  const [selectedRuleIdx, setSelectedRuleIdx] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!initialConfig)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null)

  const subjectNames = Array.from(
    new Set([
      ...availableSubjects.map(s => s.name).filter(Boolean),
      ...DEFAULT_SUBJECT_OPTIONS
    ])
  )

  const systemCodes = Array.from(
    new Set([
      ...availableSystems.map(s => s.code).filter(Boolean),
      "HNS",
      "HNG",
      "SB"
    ])
  )

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    fetch("/api/assessment-configs?categoryType=QUY_CHE_TS")
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!mounted) return
        const parsed = parseAdmissionRegulationConfig(data)
        setConfig(parsed)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [initialConfig])

  const showToast = (text: string, type: "ok" | "err" = "ok") => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const updateRule = (idx: number, patch: Partial<AdmissionRegulationRule>) => {
    setConfig(prev => {
      const nextRules = [...prev.rules]
      nextRules[idx] = { ...nextRules[idx], ...patch }
      return { ...prev, rules: nextRules }
    })
  }

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  const handleAddRule = () => {
    const newRule: AdmissionRegulationRule = {
      id: `rule-custom-${Date.now()}`,
      name: `Quy tắc Khối/Hệ mới #${config.rules.length + 1}`,
      grades: ["2", "3", "4", "5"],
      systems: ["HNS", "HNG", "SB"],
      minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Tốt", "Giỏi", "Khá"],
      minConductRatings: ["Tốt", "Đạt"],
      minCoreScoreHNS: 7.0,
      minCoreScoreHNG_SB: 8.0,
      minEnglishScoreDirect: 8.0,
      intlCertKeywords: "IELTS, Cambridge, Flyers, KET, PET",
      defaultSubjects: ["Toán học", "Tiếng Việt", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Tâm lý"],
      transcriptExemptSubjects: ["Toán học", "Tiếng Việt"],
      directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Tâm lý"],
      regulationNote: "Nhập điều kiện xét học bạ và phân công môn khảo sát cho nhóm này...",
      isActive: true
    }
    setConfig(prev => ({ ...prev, rules: [...prev.rules, newRule] }))
    setSelectedRuleIdx(config.rules.length)
  }

  const handleDeleteRule = (idx: number) => {
    if (config.rules.length <= 1) {
      showToast("Cần giữ lại ít nhất 1 quy tắc Quy chế", "err")
      return
    }
    setConfig(prev => {
      const nextRules = prev.rules.filter((_, i) => i !== idx)
      return { ...prev, rules: nextRules }
    })
    setSelectedRuleIdx(prev => Math.max(0, prev - 1))
  }

  const handleResetDefault = () => {
    setConfig(DEFAULT_ADMISSION_REGULATIONS)
    setSelectedRuleIdx(0)
    showToast("Đã nạp lại cấu hình Quy chế Tuyển sinh mặc định của Sky-Line")
  }

  const handleSave = async () => {
    if (readOnly) return
    setSaving(true)
    try {
      const payloadConfig: AdmissionRegulationConfig = {
        ...config,
        updatedAt: new Date().toISOString()
      }
      const res = await fetch("/api/assessment-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryType: "QUY_CHE_TS",
          code: "SKYLINE_K12_REGULATION",
          name: JSON.stringify(payloadConfig),
          upsert: true
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Không thể lưu Quy chế")
      }
      showToast("Đã lưu Quy chế Tuyển sinh & cập nhật đối chiếu tự động!", "ok")
      if (onConfigSaved) onConfigSaved(payloadConfig)
    } catch (e: any) {
      showToast(e.message || "Lỗi khi lưu Quy chế Tuyển sinh", "err")
    } finally {
      setSaving(false)
    }
  }

  const currentRule = config.rules[selectedRuleIdx] || config.rules[0]

  return (
    <div className={`bg-white ${isModal ? "rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" : "rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"}`}>
      {/* Header Banner chuẩn Sky-Line */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-100 border border-teal-300/30">
                Quy chế Tuyển sinh Sky-Line
              </span>
              <span className="text-[11px] text-teal-200 font-medium">
                Năm học {config.effectiveYear || "2026-2027"}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white mt-0.5">
              Nhập & Cấu hình Quy chế Tuyển sinh Đầu vào (K-12)
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const res = exportEligibleStudentsRegulationExcel({
                customConfig: config,
                templateOnly: true
              })
              showToast(`Đã tải file mẫu "${res.fileName}" (${res.exportedCount} dòng mẫu chuẩn Quy chế)!`, "ok")
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-400/20 hover:bg-teal-400/30 text-white border border-teal-200/40 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Xuất file Excel mẫu danh sách Học sinh đủ điều kiện Xét học bạ / Tuyển thẳng (miễn môn văn hóa theo quy chế)"
          >
            <Download className="w-3.5 h-3.5 text-teal-200" />
            <span>Xuất Mẫu DS Đủ ĐK Quy chế (.xlsx)</span>
          </button>

          {/* Chuyển Tab trong trình cấu hình */}
          <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "rules"
                  ? "bg-white text-[#003B3A] shadow-xs"
                  : "text-teal-100 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Quy tắc Điểm & Môn KS ({config.rules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("document")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "document"
                  ? "bg-white text-[#003B3A] shadow-xs"
                  : "text-teal-100 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Văn bản & Ghi chú Quy chế</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between ${
            toastMsg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`p-5 overflow-y-auto flex-1 space-y-5 ${isModal ? "max-h-[calc(90vh-145px)]" : ""}`}>
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Đang tải cấu hình Quy chế Tuyển sinh...
          </div>
        ) : activeTab === "rules" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột trái: Danh sách Nhóm Quy tắc theo Cấp / Khối */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#003B3A]">
                  Nhóm Cấp / Khối áp dụng
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#005854] border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm nhóm</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {config.rules.map((r, idx) => {
                  const isSel = idx === selectedRuleIdx
                  return (
                    <div
                      key={r.id || idx}
                      onClick={() => setSelectedRuleIdx(idx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? "bg-teal-50/70 border-[#00736E] shadow-xs ring-2 ring-[#00A19A]/15"
                          : "bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs sm:text-sm text-[#003B3A] leading-snug">
                          {r.name}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            r.isActive !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.isActive !== false ? "Đang áp dụng" : "Tắt"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <span className="text-[10px] font-semibold text-slate-500">Khối:</span>
                        {r.grades.map(g => (
                          <span
                            key={g}
                            className="px-1.5 py-0.2 rounded bg-[#005854] text-white text-[10px] font-bold"
                          >
                            K{g}
                          </span>
                        ))}
                        <span className="text-slate-300 mx-0.5">•</span>
                        <span className="text-[10px] font-semibold text-[#00736E]">
                          HNS ≥ {r.minCoreScoreHNS} | HNG/SB ≥ {r.minCoreScoreHNG_SB}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/70 text-[11px] text-slate-600 space-y-1 leading-relaxed">
                <div className="font-bold text-[#005854] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Cơ chế Đối chiếu Tự động</span>
                </div>
                <p>
                  Khi bạn lưu Quy chế tại đây, bảng <strong>Hồ sơ Kết quả Học tập & Quy chế Tuyển sinh</strong> ở trang Phân công Khảo sát sẽ tự động tính toán lại <strong>Môn cần KS</strong> và <strong>Môn được miễn</strong> cho từng học sinh theo ngưỡng mới.
                </p>
              </div>
            </div>

            {/* Cột phải: Form chi tiết của Nhóm Quy tắc đang chọn */}
            {currentRule && (
              <div className="lg:col-span-8 bg-slate-50/60 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex-1 min-w-[220px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tên Nhóm Quy chế (Cấp / Khối)
                    </label>
                    <input
                      type="text"
                      value={currentRule.name}
                      disabled={readOnly}
                      onChange={e => updateRule(selectedRuleIdx, { name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentRule.isActive !== false}
                        disabled={readOnly}
                        onChange={e => updateRule(selectedRuleIdx, { isActive: e.target.checked })}
                        className="w-4 h-4 accent-[#00736E] rounded"
                      />
                      <span>Kích hoạt áp dụng</span>
                    </label>

                    {!readOnly && config.rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(selectedRuleIdx)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        title="Xóa nhóm quy chế này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Chọn Khối & Hệ Đào tạo áp dụng */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#003B3A] mb-2">
                      1. Khối lớp áp dụng quy tắc này
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_GRADES.map(g => {
                        const active = currentRule.grades.includes(g)
                        return (
                          <button
                            key={g}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIdx, {
                                grades: toggleArrayItem(currentRule.grades, g)
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              active
                                ? "bg-[#005854] text-white border-[#005854] shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            Khối {g}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#003B3A] mb-2">
                      2. Hệ đào tạo áp dụng
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {systemCodes.map(sys => {
                        const active = currentRule.systems.includes(sys)
                        return (
                          <button
                            key={sys}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIdx, {
                                systems: toggleArrayItem(currentRule.systems, sys)
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              active
                                ? "bg-[#00736E] text-white border-[#00736E]"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            {sys}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Ngưỡng điểm Học bạ trường cũ & Điều kiện Xếp loại */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B3A] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#00736E]" />
                      <span>3. Điều kiện Học bạ Trường cũ & Chứng chỉ Quốc tế (Xét học bạ / Tuyển thẳng)</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Điểm TB Toán/Văn tối thiểu — <strong className="text-[#005854]">Hệ HNS</strong>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        disabled={readOnly}
                        value={currentRule.minCoreScoreHNS}
                        onChange={e =>
                          updateRule(selectedRuleIdx, {
                            minCoreScoreHNS: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#003B3A] focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                      <span className="text-[10px] text-slate-400">Để=0 nếu là Khối 1 không xét điểm</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Điểm TB Toán/Văn tối thiểu — <strong className="text-[#00736E]">Hệ HNG / SB</strong>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        disabled={readOnly}
                        value={currentRule.minCoreScoreHNG_SB}
                        onChange={e =>
                          updateRule(selectedRuleIdx, {
                            minCoreScoreHNG_SB: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#003B3A] focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Điểm Tiếng Anh tối thiểu (Xét tuyển thẳng)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        disabled={readOnly}
                        value={currentRule.minEnglishScoreDirect}
                        onChange={e =>
                          updateRule(selectedRuleIdx, {
                            minEnglishScoreDirect: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#003B3A] focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Mức Xếp loại KQHT đạt điều kiện (phân cách bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={currentRule.minAcademicRatings.join(", ")}
                        onChange={e =>
                          updateRule(selectedRuleIdx, {
                            minAcademicRatings: e.target.value
                              .split(",")
                              .map(s => s.trim())
                              .filter(Boolean)
                          })
                        }
                        placeholder="Hoàn thành xuất sắc, Hoàn thành tốt, Tốt, Giỏi, Khá"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Từ khóa Chứng chỉ Quốc tế / Giải thưởng (Xét tuyển thẳng)
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={currentRule.intlCertKeywords}
                        onChange={e =>
                          updateRule(selectedRuleIdx, {
                            intlCertKeywords: e.target.value
                          })
                        }
                        placeholder="IELTS, Flyers, KET, PET, FCE, TOEFL, Học sinh giỏi..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Cấu hình Phân luồng Môn Khảo sát & Môn Miễn */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B3A]">
                    4. Quy tắc Phân luồng Môn Khảo sát & Môn Miễn giảm
                  </h4>

                  {/* 4a. Môn khảo sát bắt buộc tiêu chuẩn */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      a) Các môn khảo sát tiêu chuẩn (Áp dụng cho HS diện Khảo sát hoặc chưa đủ ĐK miễn):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.defaultSubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIdx, {
                                defaultSubjects: toggleArrayItem(currentRule.defaultSubjects, subName)
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              active
                                ? "bg-[#005854] text-white border-[#005854]"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            {active ? "✓ " : ""}
                            {subName}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 4b. Môn được miễn khi đạt ngưỡng Học bạ trường cũ */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      b) Các môn được <span className="text-emerald-700 font-bold">MIỄN KHẢO SÁT</span> khi Học bạ trường cũ (Bộ GD&ĐT) đạt ngưỡng điểm ở Mục 3:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.transcriptExemptSubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIdx, {
                                transcriptExemptSubjects: toggleArrayItem(
                                  currentRule.transcriptExemptSubjects,
                                  subName
                                )
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              active
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            {active ? "Miễn: " : ""}
                            {subName}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 4c. Môn phỏng vấn/xếp lớp đối với HS diện Tuyển thẳng */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      c) Các môn cần phân công đối với học sinh diện <span className="text-teal-700 font-bold">TUYỂN THẲNG / CHỨNG CHỈ QUỐC TẾ</span>:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.directAdmissionSubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIdx, {
                                directAdmissionSubjects: toggleArrayItem(
                                  currentRule.directAdmissionSubjects,
                                  subName
                                )
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              active
                                ? "bg-[#00A19A] text-white border-[#00A19A]"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            {active ? "✓ " : ""}
                            {subName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Ghi chú Quy chế của Nhóm Khối */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#003B3A] mb-1.5">
                    5. Nội dung / Ghi chú Quy chế tiếp nhận hiển thị cho nhóm này
                  </label>
                  <textarea
                    rows={2}
                    disabled={readOnly}
                    value={currentRule.regulationNote}
                    onChange={e => updateRule(selectedRuleIdx, { regulationNote: e.target.value })}
                    placeholder="Nhập tóm tắt quy định tiếp nhận, điều kiện xét học bạ hoặc phỏng vấn..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: VĂN BẢN & GHI CHÚ QUY CHẾ CHUNG */
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#003B3A] mb-1">
                  Tên Văn bản / Quyết định Quy chế Tuyển sinh
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={config.documentTitle}
                  onChange={e => setConfig(prev => ({ ...prev, documentTitle: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#003B3A] mb-1">
                  Năm học áp dụng
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={config.effectiveYear}
                  onChange={e => setConfig(prev => ({ ...prev, effectiveYear: e.target.value }))}
                  placeholder="2026-2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003B3A] mb-1">
                Nội dung chi tiết / Hướng dẫn Quy chế Tuyển sinh & Phân công Khảo sát (Có thể dán từ văn bản Quy chế)
              </label>
              <textarea
                rows={10}
                disabled={readOnly}
                value={config.generalNotes}
                onChange={e => setConfig(prev => ({ ...prev, generalNotes: e.target.value }))}
                placeholder="Dán hoặc nhập các quy định chung về điều kiện tiếp nhận học sinh, quy định miễn giảm môn thi, quy định xét tuyển học bạ và phỏng vấn định hướng..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm leading-relaxed text-slate-700 focus:bg-white focus:outline-none focus:border-[#00A19A]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-[#00736E] shrink-0 mt-0.5" />
              <div>
                Nội dung văn bản quy chế này được lưu trữ chung cho toàn hệ thống trong năm học và hiển thị nhanh cho Giáo vụ / Ban Khảo thí khi thực hiện <strong>Phân công Khảo sát</strong> và <strong>Xét duyệt Kết quả</strong>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục Mặc định Sky-Line</span>
            </button>
          )}
          {config.updatedAt && (
            <span className="text-[11px] text-slate-400">
              Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString("vi-VN")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#005854] to-[#00736E] hover:from-[#003B3A] hover:to-[#005854] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Đang lưu..." : "Lưu Quy chế Tuyển sinh"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
