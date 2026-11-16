"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  BarChart3,
  Lock,
  Plus,
  RefreshCw,
  Settings,
  X,
} from "lucide-react"
import type {
  WorkHubKpiDefinitionRecord,
  WorkHubKpiDirection,
  WorkHubKpiEvaluationResult,
  WorkHubKpiFormulaType,
  WorkHubKpiTargetScope,
} from "@/lib/workhub/types"

const DIRECTION_VI: Record<string, string> = {
  HIGHER_IS_BETTER: "Càng cao càng tốt",
  LOWER_IS_BETTER: "Càng thấp càng tốt",
  WITHIN_RANGE: "Đạt trong khoảng",
}

const BAND_META: Record<string, { label: string; cls: string }> = {
  PASS: { label: "Đạt ngưỡng", cls: "bg-emerald-50 text-[#059669] border-emerald-200" },
  WARNING: { label: "Cảnh báo", cls: "bg-amber-50 text-[#D97706] border-amber-200" },
  FAIL: { label: "Chưa đạt", cls: "bg-rose-50 text-[#E11D48] border-rose-200" },
  INSUFFICIENT_DATA: {
    label: "Chưa đủ dữ liệu",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
  },
}

const KPI_PRESET_TEMPLATES: Array<{
  kpiCode: string
  name: string
  purpose: string
  unit: string
  formulaType: WorkHubKpiFormulaType
  direction: WorkHubKpiDirection
  targetValue: number
  passThreshold: number
  warningThreshold: number
  failThreshold: number
}> = [
  {
    kpiCode: "KPI-QA-OTR",
    name: "Tỷ lệ công việc hoàn thành đúng hạn",
    purpose: "Đo lường mức độ đảm bảo tiến độ cam kết của các đầu việc được giao trong kỳ",
    unit: "%",
    formulaType: "ON_TIME_TASK_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 85,
    passThreshold: 85,
    warningThreshold: 70,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-QA-ACR",
    name: "Tỷ lệ công việc được nghiệm thu",
    purpose: "Đo tỷ lệ đầu việc gửi duyệt/đến hạn được cấp thẩm quyền nghiệm thu hoàn thành",
    unit: "%",
    formulaType: "ACCEPTED_TASK_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 90,
    passThreshold: 85,
    warningThreshold: 70,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-QA-RPR",
    name: "Tỷ lệ báo cáo tuần gửi đầy đủ",
    purpose: "Đánh giá kỷ luật nộp Báo cáo công việc hàng tuần đúng hạn của cá nhân / nhóm Ban KT&ĐBCL",
    unit: "%",
    formulaType: "ON_TIME_REPORT_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 100,
    passThreshold: 90,
    warningThreshold: 75,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-QA-DPR",
    name: "Tỷ lệ sản phẩm đáp ứng tiêu chí nghiệm thu",
    purpose: "Đo lường chất lượng đầu ra thực chất theo tiêu chí nghiệm thu chuyên môn",
    unit: "%",
    formulaType: "DELIVERABLE_PASS_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 90,
    passThreshold: 85,
    warningThreshold: 70,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-QA-OUT",
    name: "Số lượng sản phẩm chuyên môn đã xác nhận",
    purpose: "Ghi nhận số lượng sản phẩm khảo thí / ĐBCL hoàn chỉnh được xác nhận đạt chuẩn (không chia mẫu số)",
    unit: "sản phẩm",
    formulaType: "CONFIRMED_OUTPUT_COUNT",
    direction: "HIGHER_IS_BETTER",
    targetValue: 5,
    passThreshold: 5,
    warningThreshold: 3,
    failThreshold: 1,
  },
]

function WorkHubKpisInner() {
  const searchParams = useSearchParams()
  const now = new Date()

  const [activeSubTab, setActiveSubTab] = useState<"EVALUATION" | "DEFINITIONS">(() =>
    searchParams?.get("tab") === "definitions" ? "DEFINITIONS" : "EVALUATION"
  )
  const [targetScope, setTargetScope] = useState<WorkHubKpiTargetScope>(
    () => (searchParams?.get("targetScope") as WorkHubKpiTargetScope) || "INDIVIDUAL"
  )
  const [targetEntityId, setTargetEntityId] = useState<string>(
    () => searchParams?.get("targetEntityId") || ""
  )
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())

  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any | null>(null)

  const [inspectItem, setInspectItem] = useState<WorkHubKpiEvaluationResult | null>(null)
  const [manualInputItem, setManualInputItem] = useState<WorkHubKpiEvaluationResult | null>(null)
  const [manualValue, setManualValue] = useState<string>("")
  const [manualEvidence, setManualEvidence] = useState<string>("")

  // KPI Definition Builder Modal State (consolidated from former Settings screen)
  const [showKpiModal, setShowKpiModal] = useState<boolean>(false)
  const [editingKpi, setEditingKpi] = useState<WorkHubKpiDefinitionRecord | null>(null)
  const [kpiCode, setKpiCode] = useState("")
  const [kpiName, setKpiName] = useState("")
  const [kpiPurpose, setKpiPurpose] = useState("")
  const [kpiUnit, setKpiUnit] = useState("%")
  const [kpiScope, setKpiScope] = useState<WorkHubKpiTargetScope>("INDIVIDUAL")
  const [kpiFormula, setKpiFormula] = useState<WorkHubKpiFormulaType>("ON_TIME_TASK_RATE")
  const [kpiDirection, setKpiDirection] = useState<WorkHubKpiDirection>("HIGHER_IS_BETTER")
  const [kpiTarget, setKpiTarget] = useState<number>(85)
  const [kpiPass, setKpiPass] = useState<number>(85)
  const [kpiWarn, setKpiWarn] = useState<number>(70)
  const [kpiFail, setKpiFail] = useState<number>(50)
  const [kpiRangeMin, setKpiRangeMin] = useState<string>("5")
  const [kpiRangeMax, setKpiRangeMax] = useState<string>("15")
  const [kpiWeight, setKpiWeight] = useState<string>("")
  const [kpiCap, setKpiCap] = useState<number>(100)
  const [kpiEffectiveFrom, setKpiEffectiveFrom] = useState<string>(
    `${new Date().getFullYear()}-01-01`
  )
  const [kpiChangeReason, setKpiChangeReason] = useState<string>("")

  const loadKpis = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        resource: "kpis",
        targetScope,
        targetEntityId,
        month: String(month),
        year: String(year),
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        if (!targetEntityId && json.actor) {
          if (targetScope === "INDIVIDUAL") setTargetEntityId(json.actor.userId)
          else if (targetScope === "DEPARTMENT")
            setTargetEntityId(json.departments?.[0]?.id || json.actor.primaryDepartmentId || "")
          else setTargetEntityId(json.actor.primaryCampusId || json.campuses?.[0]?.id || "")
        }
      } else {
        toast.error(json.error || "Không tải được dữ liệu KPI")
      }
    } finally {
      setLoading(false)
    }
  }, [targetScope, targetEntityId, month, year])

  useEffect(() => {
    loadKpis()
  }, [loadKpis])

  const handleSaveManualOrConfirm = async (
    kpi: WorkHubKpiEvaluationResult,
    mode: "SAVE_MANUAL_VALUE" | "CONFIRM_RESULT"
  ) => {
    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString()
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString()

    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "RECORD_OR_CONFIRM_KPI",
        payload: {
          kpiId: kpi.kpiId,
          targetScope: kpi.targetScope,
          targetEntityId: kpi.targetEntityId,
          periodKey: kpi.periodKey,
          periodLabel: kpi.periodLabel,
          periodStart,
          periodEnd,
          mode,
          manualActualValue: mode === "SAVE_MANUAL_VALUE" ? Number(manualValue) : undefined,
          manualEvidenceNote: mode === "SAVE_MANUAL_VALUE" ? manualEvidence : undefined,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success(
        mode === "CONFIRM_RESULT"
          ? `Đã xác nhận chốt kết quả ${kpi.kpiCode} (khóa phiên bản v${kpi.kpiVersion})`
          : "Đã lưu số liệu KPI nhập tay"
      )
      setManualInputItem(null)
      await loadKpis()
    } else {
      toast.error(json.error || "Lỗi lưu kết quả KPI")
    }
  }

  const applyPreset = (preset: (typeof KPI_PRESET_TEMPLATES)[number]) => {
    setEditingKpi(null)
    setKpiCode(preset.kpiCode)
    setKpiName(preset.name)
    setKpiPurpose(preset.purpose)
    setKpiUnit(preset.unit)
    setKpiFormula(preset.formulaType)
    setKpiDirection(preset.direction)
    setKpiTarget(preset.targetValue)
    setKpiPass(preset.passThreshold)
    setKpiWarn(preset.warningThreshold)
    setKpiFail(preset.failThreshold)
    setKpiWeight("")
    setShowKpiModal(true)
  }

  const openEditKpi = (def: WorkHubKpiDefinitionRecord) => {
    setEditingKpi(def)
    setKpiCode(def.kpiCode)
    setKpiName(def.name)
    setKpiPurpose(def.purpose)
    setKpiUnit(def.unit)
    setKpiScope(def.targetScope)
    setKpiFormula(def.formulaType)
    setKpiDirection(def.direction)
    setKpiTarget(def.targetValue)
    setKpiPass(def.passThreshold)
    setKpiWarn(def.warningThreshold)
    setKpiFail(def.failThreshold)
    setKpiRangeMin(String(def.formulaConfig.rangeMin ?? 5))
    setKpiRangeMax(String(def.formulaConfig.rangeMax ?? 15))
    setKpiWeight(def.weight !== null ? String(def.weight) : "")
    setKpiCap(def.capScorePercent)
    setKpiEffectiveFrom(def.effectiveFrom.slice(0, 10))
    setKpiChangeReason("")
    setShowKpiModal(true)
  }

  const handleSaveKpiDefinition = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_KPI_DEFINITION",
        payload: {
          id: editingKpi?.id,
          kpiCode,
          name: kpiName,
          purpose: kpiPurpose,
          unit: kpiUnit,
          targetScope: kpiScope,
          evaluationCycle: "MONTHLY",
          effectiveFrom: kpiEffectiveFrom,
          targetValue: kpiTarget,
          direction: kpiDirection,
          formulaType: kpiFormula,
          formulaConfig:
            kpiDirection === "WITHIN_RANGE"
              ? { rangeMin: Number(kpiRangeMin), rangeMax: Number(kpiRangeMax) }
              : undefined,
          passThreshold: kpiPass,
          warningThreshold: kpiWarn,
          failThreshold: kpiFail,
          weight: kpiWeight.trim() ? Number(kpiWeight) : null,
          capScorePercent: kpiCap,
          changeReason: kpiChangeReason,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success(
        editingKpi
          ? `Đã cập nhật KPI sang phiên bản v${json.versionNumber} (không ảnh hưởng kết quả đã chốt)`
          : "Đã tạo mới cấu hình chỉ số KPI"
      )
      setShowKpiModal(false)
      await loadKpis()
    } else {
      toast.error(json.error || "Không lưu được cấu hình KPI")
    }
  }

  const evaluations: WorkHubKpiEvaluationResult[] = data?.evaluations || []
  const definitions: WorkHubKpiDefinitionRecord[] = data?.definitions || []
  const scorecard = data?.scorecard
  const actor = data?.actor
  const canConfirm =
    actor?.isExecutive || actor?.isDepartmentHead || actor?.isCampusHead
  const canManageDefinitions = Boolean(actor?.canManageKpiDefinitions || canConfirm)

  return (
    <div className="space-y-4">
      {/* Thanh chuyển đổi chế độ: Đánh giá KPI & Thiết lập bộ chỉ số KPI */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("EVALUATION")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeSubTab === "EVALUATION"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Đánh giá &amp; xác nhận kết quả KPI
          </button>

          {canManageDefinitions && (
            <button
              type="button"
              onClick={() => setActiveSubTab("DEFINITIONS")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeSubTab === "DEFINITIONS"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A]"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Thiết lập &amp; phiên bản bộ chỉ số KPI ({definitions.length})
            </button>
          )}
        </div>

        {activeSubTab === "EVALUATION" && (
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <select
              value={targetScope}
              onChange={(e) => {
                setTargetScope(e.target.value as WorkHubKpiTargetScope)
                setTargetEntityId("")
              }}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-semibold text-[#003B3A]"
            >
              <option value="INDIVIDUAL">Đối tượng: Cá nhân Ban KT&amp;ĐBCL</option>
              <option value="DEPARTMENT">Đối tượng: Nhóm chuyên môn / Toàn Ban</option>
            </select>

            {targetScope === "INDIVIDUAL" && canConfirm && (
              <select
                value={targetEntityId}
                onChange={(e) => setTargetEntityId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 max-w-[200px]"
              >
                {(data?.users || []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            )}

            {targetScope === "DEPARTMENT" && (
              <select
                value={targetEntityId}
                onChange={(e) => setTargetEntityId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5"
              >
                {(data?.departments || []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeSubTab === "EVALUATION" ? (
        <>
          {/* Bảng điểm tổng hợp & Kiểm tra tổng trọng số */}
          {scorecard && scorecard.configuredKpiCount > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-2 tabular-nums">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Số chỉ số áp dụng:</span>
                  <div className="text-base font-bold text-[#003B3A]">
                    {scorecard.configuredKpiCount} chỉ số
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Tổng trọng số cấu hình:</span>
                  <div className="text-base font-bold text-slate-800">
                    {scorecard.weightedKpiCount > 0
                      ? `${scorecard.totalConfiguredWeight}%`
                      : "Không dùng trọng số"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Chỉ số chưa đủ dữ liệu:</span>
                  <div className="text-base font-bold text-slate-700">
                    {scorecard.insufficientDataCount} chỉ số
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Điểm tổng hợp (có trần):</span>
                  <div className="text-base font-bold text-[#00736E]">
                    {scorecard.aggregatedDisplay}
                  </div>
                </div>
              </div>

              {scorecard.weightValidationWarning && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-[#D97706] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {scorecard.weightValidationWarning}
                </div>
              )}
            </div>
          )}

          {/* Bảng Chỉ số KPI theo chuẩn Sky-Line Academic Ledger */}
          {loading && !data ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A] mx-auto mb-2" />
              Đang tính toán kết quả KPI từ dữ liệu công việc &amp; báo cáo...
            </div>
          ) : evaluations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
              <p className="text-sm font-bold text-[#003B3A]">
                Chưa có chỉ số KPI nào được thiết lập cho đối tượng này
              </p>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Bạn có thể khởi tạo nhanh các chỉ số chuẩn của Ban KT&amp;ĐBCL (Tỷ lệ công việc đúng hạn, Tỷ lệ nghiệm thu, Tỷ lệ báo cáo tuần đầy đủ...) tại tab Thiết lập bộ chỉ số KPI.
              </p>
              {canManageDefinitions && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab("DEFINITIONS")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thiết lập chỉ số KPI ngay
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Mã &amp; Tên chỉ số KPI
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Nguồn &amp; Chiều đánh giá
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                        Mục tiêu &amp; Trọng số
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                        Tử / Mẫu &amp; Kết quả thực tế
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                        Đánh giá ngưỡng
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {evaluations.map((ev) => {
                      const bMeta = BAND_META[ev.outcomeBand] || BAND_META.INSUFFICIENT_DATA
                      return (
                        <tr key={ev.kpiId} className="hover:bg-[#F8FAFC] align-middle">
                          <td className="py-3 px-3 min-w-[230px]">
                            <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                              {ev.kpiCode} • {ev.kpiName}
                              {ev.status === "CONFIRMED" && (
                                <span title="Đã chốt phiên bản">
                                  <Lock className="w-3 h-3 text-[#059669]" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Phiên bản công thức v{ev.kpiVersion} • {ev.purpose}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                ev.dataSourceType === "AUTO"
                                  ? "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                                  : "bg-amber-50 text-[#D97706] border-amber-200"
                              }`}
                            >
                              {ev.dataSourceType === "AUTO" ? "Tự động từ nguồn" : "Số liệu nhập tay"}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-1">
                              {DIRECTION_VI[ev.direction] || ev.direction}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {ev.direction === "WITHIN_RANGE"
                                ? `[${ev.formulaConfig.rangeMin ?? ev.passThreshold} – ${
                                    ev.formulaConfig.rangeMax ?? ev.warningThreshold
                                  }] ${ev.unit}`
                                : `${ev.targetValue}${ev.unit === "%" ? "%" : ` ${ev.unit}`}`}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {ev.weight
                                ? `Trọng số: ${ev.weight}% (Trần ${ev.capScorePercent}%)`
                                : "Theo dõi độc lập"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="font-bold text-[#003B3A] text-sm">{ev.actualDisplay}</div>
                            {ev.denominatorValue !== null && (
                              <div className="text-[11px] text-slate-500">
                                Tử số: {ev.numeratorValue ?? 0} / Mẫu số: {ev.denominatorValue}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${bMeta.cls}`}
                            >
                              {bMeta.label}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {ev.status === "CONFIRMED"
                                ? `Đã xác nhận bởi ${ev.confirmedByName}`
                                : "Tạm tính"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectItem(ev)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]"
                            >
                              Công thức &amp; Nguồn
                            </button>

                            {ev.dataSourceType === "MANUAL" && ev.status !== "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setManualInputItem(ev)
                                  setManualValue(
                                    ev.actualValue !== null ? String(ev.actualValue) : ""
                                  )
                                  setManualEvidence(ev.manualEvidenceNote || "")
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200"
                              >
                                Nhập tay
                              </button>
                            )}

                            {canConfirm &&
                              ev.status !== "CONFIRMED" &&
                              ev.outcomeBand !== "INSUFFICIENT_DATA" && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveManualOrConfirm(ev, "CONFIRM_RESULT")}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200"
                                >
                                  Xác nhận chốt
                                </button>
                              )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* TAB 2: THIẾT LẬP & PHIÊN BẢN BỘ CHỈ SỐ KPI BAN KT&ĐBCL */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="border-l-4 border-[#003B3A] pl-3">
              <h2 className="text-sm font-bold text-[#003B3A]">
                Thiết lập bộ chỉ số KPI Ban KT&amp;ĐBCL (Có quản lý phiên bản)
              </h2>
              <p className="text-xs text-slate-500">
                Mọi điều chỉnh mục tiêu, công thức hoặc trọng số sẽ tăng số phiên bản để giữ nguyên kết quả các kỳ đã chốt
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingKpi(null)
                setKpiCode("")
                setKpiName("")
                setKpiPurpose("")
                setShowKpiModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm chỉ số KPI tùy chỉnh
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Khởi tạo nhanh từ 5 mẫu chỉ số chuẩn của Ban KT&amp;ĐBCL:
            </span>
            <div className="flex flex-wrap gap-2">
              {KPI_PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.kpiCode}
                  type="button"
                  onClick={() => applyPreset(tpl)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100"
                >
                  + {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                      Mã &amp; Tên KPI
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                      Phạm vi áp dụng
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                      Công thức &amp; Chiều đánh giá
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                      Mục tiêu / Ngưỡng Đạt
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Phiên bản
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {definitions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                        Chưa có chỉ số KPI nào được khai báo. Nhấn vào một mẫu gợi ý phía trên để khởi tạo nhanh.
                      </td>
                    </tr>
                  ) : (
                    definitions.map((def) => (
                      <tr key={def.id} className="hover:bg-[#F8FAFC] align-middle">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#003B3A]">
                            {def.kpiCode} • {def.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{def.purpose}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {def.targetScope === "INDIVIDUAL"
                            ? "Cá nhân thành viên"
                            : "Nhóm chuyên môn / Toàn Ban"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-700">{def.formulaType}</div>
                          <div className="text-[11px] text-slate-500">{DIRECTION_VI[def.direction]}</div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-[#00736E]">
                            {def.targetValue} {def.unit}
                          </span>{" "}
                          (Đạt: {def.passThreshold})
                          {def.weight !== null && (
                            <div className="text-[11px] text-slate-500">Trọng số: {def.weight}%</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                            v{def.currentVersion}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditKpi(def)}
                            className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-[#003B3A]"
                          >
                            Điều chỉnh (Tạo v{def.currentVersion + 1})
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Minh bạch Công thức, Tử số, Mẫu số & Dữ liệu nguồn */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-3 text-xs tabular-nums">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Chi tiết công thức &amp; nguồn tính: {inspectItem.kpiCode} (v{inspectItem.kpiVersion})
              </h3>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#F0FDFA] border border-teal-200 p-3.5 space-y-1.5">
              <div>
                <strong>Tử số:</strong> {inspectItem.formulaConfig.numeratorDescription} (Giá trị:{" "}
                <strong>{inspectItem.numeratorValue ?? "Chưa có"}</strong>)
              </div>
              <div>
                <strong>Mẫu số:</strong> {inspectItem.formulaConfig.denominatorDescription} (Giá trị:{" "}
                <strong>{inspectItem.denominatorValue ?? "Không áp dụng"}</strong>)
              </div>
              <div>
                <strong>Chiều đánh giá:</strong> {DIRECTION_VI[inspectItem.direction]} • Ngưỡng Đạt:{" "}
                {inspectItem.passThreshold} • Ngưỡng Cảnh báo: {inspectItem.warningThreshold}
              </div>
              <div>
                <strong>Số bản ghi nguồn cấu thành:</strong> {inspectItem.sourceRecordIds.length} bản ghi
              </div>
              {inspectItem.manualEvidenceNote && (
                <div>
                  <strong>Minh chứng nhập tay:</strong> {inspectItem.manualEvidenceNote}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Quy tắc hệ thống: Không suy diễn chất lượng nhân sự chỉ từ số lượng đầu việc; khi mẫu số bằng 0 hoặc thiếu dữ liệu nhập tay, hệ thống hiển thị &quot;Chưa đủ dữ liệu&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Modal Nhập số liệu thủ công cho KPI loại MANUAL */}
      {manualInputItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Nhập số liệu thực tế: {manualInputItem.kpiCode}
              </h3>
              <button
                type="button"
                onClick={() => setManualInputItem(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Giá trị thực tế ({manualInputItem.unit}) *
              </label>
              <input
                type="number"
                step="0.01"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nguồn số liệu / Minh chứng đối chiếu *
              </label>
              <textarea
                rows={3}
                value={manualEvidence}
                onChange={(e) => setManualEvidence(e.target.value)}
                placeholder="Ghi rõ biên bản, báo cáo hoặc đường dẫn minh chứng..."
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualInputItem(null)}
                className="px-3.5 py-2 rounded-xl font-semibold border border-[#E2E8F0]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveManualOrConfirm(manualInputItem, "SAVE_MANUAL_VALUE")}
                className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
              >
                Lưu số liệu nhập tay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thiết lập / Cập nhật Phiên bản Chỉ số KPI */}
      {showKpiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-xl w-full p-5 space-y-4 text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#003B3A]">
                {editingKpi
                  ? `Điều chỉnh chỉ số ${editingKpi.kpiCode} (Tạo phiên bản v${editingKpi.currentVersion + 1})`
                  : "Thiết lập chỉ số KPI mới cho Ban KT&ĐBCL"}
              </h3>
              <button
                type="button"
                onClick={() => setShowKpiModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKpiDefinition} className="space-y-3 tabular-nums">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã KPI *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingKpi)}
                    value={kpiCode}
                    onChange={(e) => setKpiCode(e.target.value)}
                    placeholder="VD: KPI-QA-OTR"
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Tên chỉ số KPI *</label>
                  <input
                    type="text"
                    required
                    value={kpiName}
                    onChange={(e) => setKpiName(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục đích đánh giá *</label>
                <input
                  type="text"
                  required
                  value={kpiPurpose}
                  onChange={(e) => setKpiPurpose(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đối tượng áp dụng</label>
                  <select
                    value={kpiScope}
                    onChange={(e) => setKpiScope(e.target.value as WorkHubKpiTargetScope)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  >
                    <option value="INDIVIDUAL">Cá nhân thành viên</option>
                    <option value="DEPARTMENT">Nhóm chuyên môn / Toàn Ban</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Công thức nguồn</label>
                  <select
                    value={kpiFormula}
                    onChange={(e) => setKpiFormula(e.target.value as WorkHubKpiFormulaType)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  >
                    <option value="ON_TIME_TASK_RATE">Tỷ lệ công việc đúng hạn</option>
                    <option value="ACCEPTED_TASK_RATE">Tỷ lệ công việc được nghiệm thu</option>
                    <option value="ON_TIME_REPORT_RATE">Tỷ lệ báo cáo tuần gửi đầy đủ</option>
                    <option value="DELIVERABLE_PASS_RATE">Tỷ lệ sản phẩm đạt tiêu chí</option>
                    <option value="CONFIRMED_OUTPUT_COUNT">Số lượng sản phẩm đã xác nhận</option>
                    <option value="MANUAL_METRIC">Chỉ số nhập tay có minh chứng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chiều đánh giá</label>
                  <select
                    value={kpiDirection}
                    onChange={(e) => setKpiDirection(e.target.value as WorkHubKpiDirection)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  >
                    <option value="HIGHER_IS_BETTER">Càng cao càng tốt</option>
                    <option value="LOWER_IS_BETTER">Càng thấp càng tốt</option>
                    <option value="WITHIN_RANGE">Đạt trong khoảng [Min – Max]</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn vị đo</label>
                  <input
                    type="text"
                    value={kpiUnit}
                    onChange={(e) => setKpiUnit(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mục tiêu</label>
                  <input
                    type="number"
                    step="0.1"
                    value={kpiTarget}
                    onChange={(e) => setKpiTarget(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngưỡng Đạt</label>
                  <input
                    type="number"
                    step="0.1"
                    value={kpiPass}
                    onChange={(e) => setKpiPass(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngưỡng Cảnh báo</label>
                  <input
                    type="number"
                    step="0.1"
                    value={kpiWarn}
                    onChange={(e) => setKpiWarn(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
              </div>

              {kpiDirection === "WITHIN_RANGE" && (
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giá trị Min đạt chuẩn</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpiRangeMin}
                      onChange={(e) => setKpiRangeMin(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giá trị Max đạt chuẩn</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpiRangeMax}
                      onChange={(e) => setKpiRangeMax(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-1.5"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trọng số % (để trống nếu độc lập)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={kpiWeight}
                    onChange={(e) => setKpiWeight(e.target.value)}
                    placeholder="VD: 30"
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức trần điểm (%)</label>
                  <input
                    type="number"
                    value={kpiCap}
                    onChange={(e) => setKpiCap(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hiệu lực từ ngày</label>
                  <input
                    type="date"
                    value={kpiEffectiveFrom}
                    onChange={(e) => setKpiEffectiveFrom(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
              </div>

              {editingKpi && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lý do điều chỉnh phiên bản công thức / mục tiêu *
                  </label>
                  <input
                    type="text"
                    required
                    value={kpiChangeReason}
                    onChange={(e) => setKpiChangeReason(e.target.value)}
                    placeholder="Ghi rõ căn cứ điều chỉnh..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKpiModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-[#E2E8F0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
                >
                  Lưu cấu hình KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkHubKpisPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
          Đang tải dữ liệu Chỉ tiêu &amp; đánh giá KPI...
        </div>
      }
    >
      <WorkHubKpisInner />
    </Suspense>
  )
}
