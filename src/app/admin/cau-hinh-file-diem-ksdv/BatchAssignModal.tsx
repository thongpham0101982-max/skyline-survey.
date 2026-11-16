"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Layers, X, Check, Save, RefreshCw } from "lucide-react"
import {
  STANDARD_PERIOD_OPTIONS,
  NormalizedSystemOption,
  SUBJECT_PRESETS,
  getOrientationPresetByGrade,
  resolvePresetDataForSubject,
  isSubjectApplicable,
  sortGradesNaturally
} from "./presets"

interface BatchAssignModalProps {
  isOpen: boolean
  onClose: () => void
  selectedYearId: string
  periodsForYear: any[]
  normalizedSystems: NormalizedSystemOption[]
  grades: string[]
  subjects: any[]

  initialPeriodId: string
  initialSystemCodes: string[]
  initialGrades: string[]
  currentFormPayload: {
    columnCount: number
    columnNames: string[]
    columnTypes: string[]
    columnMaxScores: number[]
    hasCompositeColumn: boolean
    compositeColumnName: string
    hasRemarkColumn: boolean
    formula: string
    formulaCustom: string
    weights: number[]
    roundingRule: string
    passScore: number | null
    commitmentThreshold: number | null
  }

  onSuccess: (message: string) => void
}

export function BatchAssignModal({
  isOpen,
  onClose,
  selectedYearId,
  periodsForYear,
  normalizedSystems,
  grades,
  subjects,
  initialPeriodId,
  initialSystemCodes,
  initialGrades,
  currentFormPayload,
  onSuccess
}: BatchAssignModalProps) {
  const [batchPeriodId, setBatchPeriodId] = useState(initialPeriodId || "ALL")
  const [batchSystemCodes, setBatchSystemCodes] = useState<string[]>(
    initialSystemCodes.length > 0 ? initialSystemCodes : ["ALL"]
  )
  const [batchGrades, setBatchGrades] = useState<string[]>(
    initialGrades.length > 0 ? initialGrades : ["Khối 6"]
  )
  const [batchSubjectIds, setBatchSubjectIds] = useState<string[]>([])
  const [batchPresetMode, setBatchPresetMode] = useState<string>("AUTO_BY_SUBJECT")
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState("")

  // Tính danh sách các môn hợp lệ cho ít nhất 1 khối trong batchGrades
  const validSubjectsForSelectedGrades = useMemo(() => {
    return subjects.filter(sub =>
      batchGrades.some(g => isSubjectApplicable(sub, g, batchPeriodId))
    )
  }, [subjects, batchGrades, batchPeriodId])

  useEffect(() => {
    if (isOpen) {
      setBatchPeriodId(initialPeriodId || "ALL")
      setBatchSystemCodes(initialSystemCodes.length > 0 ? initialSystemCodes : ["ALL"])
      const initG = initialGrades.length > 0 ? initialGrades : ["Khối 6"]
      setBatchGrades(initG)
      const valid = subjects.filter(s =>
        initG.some(g => isSubjectApplicable(s, g, initialPeriodId || "ALL"))
      )
      setBatchSubjectIds(valid.map(s => s.id))
      setBatchPresetMode("AUTO_BY_SUBJECT")
      setErrorText("")
    }
  }, [isOpen, initialPeriodId, initialSystemCodes, initialGrades, subjects])

  if (!isOpen) return null

  const toggleSystem = (code: string) => {
    setBatchSystemCodes(prev => {
      if (prev.includes(code)) {
        const next = prev.filter(x => x !== code)
        return next.length > 0 ? next : ["ALL"]
      }
      if (code === "ALL") return ["ALL"]
      return [...prev.filter(x => x !== "ALL"), code]
    })
  }

  const toggleGrade = (grade: string) => {
    setBatchGrades(prev => {
      if (prev.includes(grade)) {
        if (prev.length === 1) return prev
        return prev.filter(x => x !== grade)
      }
      return sortGradesNaturally([...prev, grade])
    })
  }

  const handleSaveBatch = async () => {
    setErrorText("")
    if (batchGrades.length === 0) {
      setErrorText("Vui lòng chọn ít nhất một khối lớp để gán.")
      return
    }
    if (batchSubjectIds.length === 0) {
      setErrorText("Vui lòng chọn ít nhất một môn khảo sát.")
      return
    }

    try {
      setSaving(true)
      const items: any[] = []

      for (const sysCode of batchSystemCodes) {
        for (const g of batchGrades) {
          for (const subId of batchSubjectIds) {
            const subObj = subjects.find(s => s.id === subId)
            if (!subObj) continue
            // Chỉ tạo cấu hình cho tổ hợp (Môn, Khối, Kỳ) hợp lệ theo quy chế chuyên môn
            if (!isSubjectApplicable(subObj, g, batchPeriodId)) continue

            let tpl: any = null
            if (batchPresetMode === "CURRENT") {
              tpl = { ...currentFormPayload }
            } else if (batchPresetMode === "AUTO_BY_SUBJECT") {
              const p = resolvePresetDataForSubject(subObj.code, g)
              if (p) {
                tpl = {
                  columnCount: p.columnCount,
                  columnNames: p.columnNames,
                  columnTypes: p.columnTypes,
                  columnMaxScores: p.columnMaxScores,
                  hasCompositeColumn: p.hasComposite,
                  compositeColumnName: p.compositeColumnName,
                  hasRemarkColumn: currentFormPayload.hasRemarkColumn,
                  formula: p.formulaType,
                  formulaCustom: p.formulaCustom || "",
                  weights: p.weights,
                  roundingRule: p.roundingRule,
                  passScore: p.passScore,
                  commitmentThreshold: p.commitmentThreshold
                }
              } else {
                tpl = { ...currentFormPayload }
              }
            } else if (batchPresetMode === "PHIEU_DINH_HUONG") {
              const p = getOrientationPresetByGrade(g)
              tpl = {
                columnCount: p.columnCount,
                columnNames: p.columnNames,
                columnTypes: p.columnTypes,
                columnMaxScores: p.columnMaxScores,
                hasCompositeColumn: p.hasComposite,
                compositeColumnName: p.compositeColumnName,
                hasRemarkColumn: true,
                formula: p.formulaType,
                formulaCustom: p.formulaCustom || "",
                weights: p.weights,
                roundingRule: p.roundingRule,
                passScore: null,
                commitmentThreshold: null
              }
            } else if (batchPresetMode === "TAV_70") {
              const numG = parseInt(g.replace(/\D/g, ""), 10) || 1
              const p =
                numG >= 10
                  ? SUBJECT_PRESETS.TAv_70_THPT
                  : numG >= 6
                    ? SUBJECT_PRESETS.TAv_70_THCS
                    : numG === 1
                      ? SUBJECT_PRESETS.TAv_70_KHOI_1
                      : SUBJECT_PRESETS.TAv_70_TIEU_HOC
              tpl = {
                columnCount: p.columnCount,
                columnNames: p.columnNames,
                columnTypes: p.columnTypes,
                columnMaxScores: p.columnMaxScores,
                hasCompositeColumn: p.hasComposite,
                compositeColumnName: p.compositeColumnName,
                hasRemarkColumn: true,
                formula: p.formulaType,
                formulaCustom: p.formulaCustom || "",
                weights: p.weights,
                roundingRule: p.roundingRule,
                passScore: p.passScore,
                commitmentThreshold: p.commitmentThreshold
              }
            } else {
              const presetKeyMap: Record<string, string> = {
                TAV_10: "TAv_10",
                TAVD_30: "TAvd_30",
                TAVD_10: "TAvd_10",
                TOA: "TOA",
                TVI: "TVI",
                TLY: "TLY",
                NLTD: "NLTD",
                NLTD_SCORE: "NLTD_SCORE",
                CHILD_DEV_16: "CHILD_DEV_16",
                EPT: "EPT"
              }
              const p = SUBJECT_PRESETS[presetKeyMap[batchPresetMode] || batchPresetMode]
              if (p) {
                tpl = {
                  columnCount: p.columnCount,
                  columnNames: p.columnNames,
                  columnTypes: p.columnTypes,
                  columnMaxScores: p.columnMaxScores,
                  hasCompositeColumn: p.hasComposite,
                  compositeColumnName: p.compositeColumnName,
                  hasRemarkColumn: true,
                  formula: p.formulaType,
                  formulaCustom: p.formulaCustom || "",
                  weights: p.weights,
                  roundingRule: p.roundingRule,
                  passScore: p.passScore,
                  commitmentThreshold: p.commitmentThreshold
                }
              } else {
                tpl = { ...currentFormPayload }
              }
            }

            items.push({
              periodId: batchPeriodId,
              educationSystemId: sysCode,
              grade: g,
              subjectId: subId,
              ...tpl
            })
          }
        }
      }

      if (items.length === 0) {
        setErrorText("Không có tổ hợp môn - khối hợp lệ nào theo quy chế khảo sát đầu vào.")
        setSaving(false)
        return
      }

      const res = await fetch("/api/admin/input-assessments/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          items
        })
      })

      const data = await res.json()
      if (data.success) {
        onSuccess(
          `Đã gán thành công ${data.count} cấu hình mẫu (${batchGrades.length} khối × ${batchSystemCodes.length} hệ)!`
        )
        onClose()
      } else {
        setErrorText(data.error || "Không thể gán cấu hình hàng loạt.")
      }
    } catch (e: any) {
      setErrorText("Lỗi kết nối: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E2E8F0] overflow-hidden max-h-[90vh] flex flex-col tabular-nums">
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#5EEAD4]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Gán cấu hình hàng loạt đa khối & đa môn
              </h3>
              <p className="text-xs text-teal-100/80">
                Thiết lập đồng bộ cho nhiều khối lớp, hệ học (HNG...) và môn khảo sát trong một thao tác
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {errorText && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-[#E11D48]">
              {errorText}
            </div>
          )}

          {/* 1. Mốc thời gian / Kỳ KS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#003B3A]">
              1. Mốc thời gian / Kỳ khảo sát áp dụng
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STANDARD_PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBatchPeriodId(opt.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                    batchPeriodId === opt.id
                      ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] ring-1 ring-[#00A19A]/40 font-bold"
                      : "bg-[#F8FAFC] hover:bg-white text-slate-700 border-[#E2E8F0]"
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>
            {periodsForYear.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">Kỳ cụ thể:</span>
                {periodsForYear.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBatchPeriodId(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      batchPeriodId === p.id
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-700 border-[#E2E8F0]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Hệ học (Chương trình) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#003B3A]">
              2. Hệ học (Chương trình) — Có thể chọn nhiều hệ
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleSystem("ALL")}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${
                  batchSystemCodes.includes("ALL")
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-white text-slate-700 border-[#E2E8F0]"
                }`}
              >
                {batchSystemCodes.includes("ALL") && <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />}
                <span>Tất cả hệ học (Mẫu chung)</span>
              </button>

              {normalizedSystems.map(sys => {
                const checked = batchSystemCodes.includes(sys.code)
                return (
                  <button
                    key={sys.code}
                    type="button"
                    onClick={() => toggleSystem(sys.code)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${
                      checked
                        ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] font-bold"
                        : "bg-white text-slate-700 border-[#E2E8F0]"
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-[#00A19A]" />}
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-[#003B3A]">
                      {sys.code}
                    </span>
                    <span>{sys.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Khối lớp áp dụng (Đa khối) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#003B3A]">
                3. Chọn các khối lớp áp dụng ({batchGrades.length}/{grades.length} khối)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "Khối 1", list: ["Khối 1"] },
                  { label: "Tiểu học K2–5", list: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
                  { label: "THCS K6–9", list: ["Khối 6", "Khối 7", "Khối 8", "Khối 9"] },
                  { label: "THPT K10–12", list: ["Khối 10", "Khối 11", "Khối 12"] },
                  { label: "Toàn bộ K1–12", list: grades }
                ].map(grp => (
                  <button
                    key={grp.label}
                    type="button"
                    onClick={() => setBatchGrades(grp.list)}
                    className="px-2 py-0.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F0FDFA] text-slate-600 hover:text-[#00736E] border border-[#E2E8F0] text-[11px] font-semibold"
                  >
                    {grp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {grades.map(g => {
                const checked = batchGrades.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrade(g)}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      checked
                        ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A] font-bold"
                        : "bg-white text-slate-600 border-[#E2E8F0]"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                        checked
                          ? "bg-[#00A19A] border-[#00A19A] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span>{g}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Cấu trúc mẫu áp dụng */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#003B3A]">
              4. Quy tắc lấy cấu trúc cột điểm
            </label>
            <select
              value={batchPresetMode}
              onChange={e => setBatchPresetMode(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#003B3A] outline-none focus:border-[#00A19A]"
            >
              <option value="AUTO_BY_SUBJECT">
                Tự động lấy đúng mẫu chuẩn Sky-Line riêng cho từng môn & từng cấp học (Khuyên dùng khi chọn nhiều môn)
              </option>
              <option value="CURRENT">
                Áp dụng đồng nhất cấu trúc cột điểm đang chỉnh sửa trên biểu mẫu hiện tại
              </option>
              <option value="EPT">Mẫu EPT chuẩn hóa 4 kỹ năng (Listening, Reading, Writing, Speaking — 100đ)</option>
              <option value="TAV_70">Mẫu Tiếng Anh viết chuẩn Sky-Line (Thang 70đ theo cấp học)</option>
              <option value="TAVD_30">Mẫu Tiếng Anh vấn đáp chuẩn Sky-Line (Thang 30đ)</option>
              <option value="TOA">Mẫu Toán học (Thang 10đ)</option>
              <option value="TVI">Mẫu Tiếng Việt / Ngữ văn (Thang 10đ)</option>
              <option value="TLY">Mẫu Đánh giá Tâm lý (6 tiêu chí — 80đ)</option>
              <option value="NLTD">Mẫu Năng lực tư duy Khối 1</option>
              <option value="PHIEU_DINH_HUONG">Mẫu Phiếu định hướng đầu vào (Tự động theo nhóm khối)</option>
            </select>
          </div>

          {/* 5. Chọn các môn khảo sát */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003B3A]">
                5. Chọn các môn khảo sát ({batchSubjectIds.length}/{validSubjectsForSelectedGrades.length})
              </label>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    setBatchSubjectIds(validSubjectsForSelectedGrades.map(s => s.id))
                  }
                  className="text-[#00736E] hover:underline"
                >
                  Chọn tất cả môn hợp lệ
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setBatchSubjectIds([])}
                  className="text-slate-500 hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
              {validSubjectsForSelectedGrades.map(s => {
                const checked = batchSubjectIds.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-semibold border transition-colors ${
                      checked
                        ? "bg-white text-[#003B3A] border-[#00A19A]"
                        : "bg-transparent text-slate-600 border-transparent hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setBatchSubjectIds(prev => [...prev, s.id])
                        } else {
                          setBatchSubjectIds(prev => prev.filter(x => x !== s.id))
                        }
                      }}
                      className="rounded text-[#00A19A] focus:ring-[#00A19A] w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-[#003B3A]">
                      {s.code}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Sẽ áp dụng cho{" "}
            <strong className="text-[#003B3A]">{batchGrades.length} khối</strong> ×{" "}
            <strong className="text-[#003B3A]">{batchSystemCodes.length} hệ</strong> ×{" "}
            <strong className="text-[#003B3A]">{batchSubjectIds.length} môn</strong>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#003B3A] hover:bg-[#004d4b] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#5EEAD4]" />
              )}
              <span>Thực hiện gán hàng loạt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
