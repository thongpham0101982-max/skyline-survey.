"use client"

import React, { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import {
  AlertCircle,
  Bell,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react"
import type {
  WorkHubKpiDefinitionRecord,
  WorkHubKpiDirection,
  WorkHubKpiFormulaType,
  WorkHubKpiTargetScope,
} from "@/lib/workhub/types"

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
    kpiCode: "KPI-WH-OTR",
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
    kpiCode: "KPI-WH-ACR",
    name: "Tỷ lệ công việc được nghiệm thu",
    purpose: "Đo tỷ lệ đầu việc đến hạn/gửi duyệt được cấp thẩm quyền nghiệm thu hoàn thành",
    unit: "%",
    formulaType: "ACCEPTED_TASK_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 90,
    passThreshold: 85,
    warningThreshold: 70,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-WH-RPR",
    name: "Tỷ lệ báo cáo gửi đúng hạn",
    purpose: "Đánh giá kỷ luật gửi báo cáo định kỳ đúng mốc chốt dữ liệu",
    unit: "%",
    formulaType: "ON_TIME_REPORT_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 100,
    passThreshold: 90,
    warningThreshold: 75,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-WH-DPR",
    name: "Tỷ lệ sản phẩm đáp ứng tiêu chí nghiệm thu",
    purpose: "Đo lường chất lượng đầu ra thực chất theo tiêu chí nghiệm thu đã giao",
    unit: "%",
    formulaType: "DELIVERABLE_PASS_RATE",
    direction: "HIGHER_IS_BETTER",
    targetValue: 90,
    passThreshold: 85,
    warningThreshold: 70,
    failThreshold: 50,
  },
  {
    kpiCode: "KPI-WH-OUT",
    name: "Số lượng sản phẩm chuyên môn đã được xác nhận",
    purpose: "Ghi nhận số lượng sản phẩm chuyên môn hoàn chỉnh được xác nhận đạt chuẩn (không chia mẫu số)",
    unit: "sản phẩm",
    formulaType: "CONFIRMED_OUTPUT_COUNT",
    direction: "HIGHER_IS_BETTER",
    targetValue: 5,
    passThreshold: 5,
    warningThreshold: 3,
    failThreshold: 1,
  },
]

export default function WorkHubSettingsPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  // KPI Modal State
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

  // Reminder Settings State
  const [dueSoonHours, setDueSoonHours] = useState<number>(48)
  const [enableDueSoon, setEnableDueSoon] = useState<boolean>(true)
  const [enableOverdue, setEnableOverdue] = useState<boolean>(true)
  const [enablePendingReview, setEnablePendingReview] = useState<boolean>(true)
  const [enableReportDeadline, setEnableReportDeadline] = useState<boolean>(true)
  const [digestFrequency, setDigestFrequency] = useState<string>("DAILY_DIGEST")
  const [sendEmailDigest, setSendEmailDigest] = useState<boolean>(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/workhub?resource=settings")
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error || "Không có quyền truy cập cấu hình WorkHub.")
      } else {
        setData(json)
        if (json.reminderSettings) {
          const rs = json.reminderSettings
          setDueSoonHours(rs.dueSoonHours)
          setEnableDueSoon(rs.enableDueSoon)
          setEnableOverdue(rs.enableOverdue)
          setEnablePendingReview(rs.enablePendingReview)
          setEnableReportDeadline(rs.enableReportDeadline)
          setDigestFrequency(rs.digestFrequency)
          setSendEmailDigest(rs.sendEmailDigest)
        }
      }
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

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

  const handleSaveKpi = async (e: React.FormEvent) => {
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
      await loadSettings()
    } else {
      toast.error(json.error || "Không lưu được cấu hình KPI")
    }
  }

  const handleSaveReminderConfig = async () => {
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_REMINDER_SETTINGS",
        payload: {
          dueSoonHours,
          enableDueSoon,
          enableOverdue,
          enablePendingReview,
          enableReportDeadline,
          digestFrequency,
          sendEmailDigest,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success("Đã lưu cấu hình gộp thông báo & nhắc việc")
    } else {
      toast.error(json.error || "Lỗi lưu cấu hình nhắc việc")
    }
  }

  const handleTriggerDigestNow = async () => {
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TRIGGER_DIGEST_REMINDERS" }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success(
        `Đã xử lý nhắc việc gộp: gửi ${json.notificationsSent} thông báo, bỏ qua ${json.duplicatesSkipped} thông báo trùng chu kỳ`
      )
    } else {
      toast.error(json.error || "Lỗi chạy nhắc việc")
    }
  }

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A] mx-auto mb-2" />
        Đang tải trang Cấu hình WorkHub...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-8 text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-[#E11D48] mx-auto" />
        <p className="text-xs font-semibold text-[#E11D48]">{errorMsg}</p>
      </div>
    )
  }

  const definitions: WorkHubKpiDefinitionRecord[] = data?.definitions || []

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Cấu hình Danh mục KPI & Phiên bản Công thức */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h2 className="text-sm font-bold text-[#003B3A]">
              1. Cấu hình danh mục chỉ số KPI & Phiên bản công thức
            </h2>
            <p className="text-xs text-slate-500">
              Thay đổi công thức, mục tiêu hoặc trọng số sẽ tự động sinh phiên bản mới, bảo toàn nguyên vẹn kết quả các kỳ đã chốt
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo chỉ số KPI mới
          </button>
        </div>

        {/* Mẫu khởi tạo nhanh 5 chỉ số chuẩn */}
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-2">
          <div className="font-semibold text-slate-700">
            Mẫu gợi ý khởi tạo nhanh (Nhấn để mở biểu mẫu cấu hình):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KPI_PRESET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.kpiCode}
                type="button"
                onClick={() => applyPreset(tpl)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#00A19A] font-medium text-[#003B3A]"
              >
                + {tpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng KPI đã cấu hình */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Mã KPI
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-teal-100">
                    Tên & Công thức nguồn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Đối tượng & Chiều
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-[#5EEAD4] text-center whitespace-nowrap">
                    Mục tiêu / Trọng số
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 text-center whitespace-nowrap">
                    Phiên bản
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-white text-right whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white tabular-nums">
                {definitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                      Chưa có chỉ số KPI nào được cấu hình. Chọn một mẫu gợi ý phía trên hoặc nhấn &quot;Tạo chỉ số KPI mới&quot;.
                    </td>
                  </tr>
                ) : (
                  definitions.map((d) => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC] align-middle">
                      <td className="py-3 px-3 font-bold text-[#003B3A] whitespace-nowrap">
                        {d.kpiCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{d.name}</div>
                        <div className="text-[11px] text-slate-500">{d.formulaType}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                        {d.targetScope} • {d.direction}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <strong>
                          {d.targetValue} {d.unit}
                        </strong>{" "}
                        {d.weight ? `• TS ${d.weight}%` : ""}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 font-semibold">
                          v{d.currentVersion}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditKpi(d)}
                          className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold text-[#003B3A]"
                        >
                          Điều chỉnh phiên bản
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

      {/* 2. Cấu hình Nhắc việc Gộp & Chống gửi trùng */}
      {data?.actor?.canManageSettings && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h2 className="text-sm font-bold text-[#003B3A]">
              2. Cấu hình nhắc việc gộp (Digest) & chống gửi trùng
            </h2>
            <p className="text-xs text-slate-500">
              Tái sử dụng hệ thống thông báo hiện có, gộp nhiều việc của cùng một nhân sự thành 1 thông báo tổng hợp gọn gàng theo tần suất cấu hình
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ngưỡng cảnh báo sắp đến hạn (giờ)
              </label>
              <input
                type="number"
                min={12}
                max={168}
                value={dueSoonHours}
                onChange={(e) => setDueSoonHours(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tần suất gộp thông báo (chống gửi trùng)
              </label>
              <select
                value={digestFrequency}
                onChange={(e) => setDigestFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
              >
                <option value="DAILY_DIGEST">Gộp mỗi ngày 1 lần (Daily Digest)</option>
                <option value="TWICE_WEEKLY">Gộp 2 lần / tuần</option>
                <option value="IMMEDIATE">Theo sự kiện phát sinh</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 w-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailDigest}
                  onChange={(e) => setSendEmailDigest(e.target.checked)}
                  className="rounded text-[#00A19A]"
                />
                <span className="font-medium text-slate-700">
                  Đồng thời gửi bản gộp qua Email
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Nhắc việc sắp đến hạn", val: enableDueSoon, set: setEnableDueSoon },
              { label: "Nhắc việc quá hạn", val: enableOverdue, set: setEnableOverdue },
              {
                label: "Nhắc việc chờ nghiệm thu",
                val: enablePendingReview,
                set: setEnablePendingReview,
              },
              {
                label: "Nhắc hạn gửi báo cáo",
                val: enableReportDeadline,
                set: setEnableReportDeadline,
              },
            ].map((opt, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] p-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={opt.val}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="rounded text-[#00A19A]"
                />
                <span className="font-medium text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleTriggerDigestNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
            >
              <Bell className="w-3.5 h-3.5" />
              Chạy gộp thông báo nhắc việc ngay
            </button>

            <button
              type="button"
              onClick={handleSaveReminderConfig}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu cấu hình nhắc việc
            </button>
          </div>
        </div>
      )}

      {/* Modal Cấu hình KPI */}
      {showKpiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveKpi}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full p-5 space-y-3.5 text-xs my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                {editingKpi
                  ? `Cập nhật phiên bản KPI ${editingKpi.kpiCode} (v${editingKpi.currentVersion} → v${
                      editingKpi.currentVersion + 1
                    })`
                  : "Thiết lập chỉ số KPI mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowKpiModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingKpi && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                <div className="font-bold text-[#D97706]">
                  Bắt buộc ghi lý do thay đổi công thức / mục tiêu / trọng số:
                </div>
                <input
                  required
                  type="text"
                  value={kpiChangeReason}
                  onChange={(e) => setKpiChangeReason(e.target.value)}
                  placeholder="VD: Điều chỉnh mục tiêu áp dụng từ học kỳ II..."
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã KPI *</label>
                <input
                  required
                  disabled={Boolean(editingKpi)}
                  type="text"
                  value={kpiCode}
                  onChange={(e) => setKpiCode(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 disabled:bg-slate-100"
                  placeholder="VD: KPI-WH-OTR"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đơn vị đo *</label>
                <input
                  required
                  type="text"
                  value={kpiUnit}
                  onChange={(e) => setKpiUnit(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  placeholder="%, sản phẩm, điểm..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tên chỉ số KPI *</label>
                <input
                  required
                  type="text"
                  value={kpiName}
                  onChange={(e) => setKpiName(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mục đích đánh giá *</label>
                <input
                  required
                  type="text"
                  value={kpiPurpose}
                  onChange={(e) => setKpiPurpose(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đối tượng áp dụng</label>
                <select
                  value={kpiScope}
                  onChange={(e) => setKpiScope(e.target.value as WorkHubKpiTargetScope)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="INDIVIDUAL">Cá nhân</option>
                  <option value="DEPARTMENT">Phòng ban / Tổ CM</option>
                  <option value="CAMPUS">Cơ sở</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Công thức & Nguồn dữ liệu</label>
                <select
                  value={kpiFormula}
                  onChange={(e) => setKpiFormula(e.target.value as WorkHubKpiFormulaType)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="ON_TIME_TASK_RATE">Tỷ lệ công việc hoàn thành đúng hạn (Tự động)</option>
                  <option value="ACCEPTED_TASK_RATE">Tỷ lệ công việc được nghiệm thu (Tự động)</option>
                  <option value="ON_TIME_REPORT_RATE">Tỷ lệ báo cáo gửi đúng hạn (Tự động)</option>
                  <option value="DELIVERABLE_PASS_RATE">Tỷ lệ sản phẩm đạt tiêu chí nghiệm thu (Tự động)</option>
                  <option value="CONFIRMED_OUTPUT_COUNT">Số lượng sản phẩm chuyên môn đã xác nhận (Đếm thực tế)</option>
                  <option value="MANUAL_METRIC">Chỉ số nhập số liệu thủ công có minh chứng (Nhập tay)</option>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu chuẩn</label>
                <input
                  type="number"
                  step="0.1"
                  value={kpiTarget}
                  onChange={(e) => setKpiTarget(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              {kpiDirection === "WITHIN_RANGE" ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giới hạn dưới (Min)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpiRangeMin}
                      onChange={(e) => setKpiRangeMin(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giới hạn trên (Max)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kpiRangeMax}
                      onChange={(e) => setKpiRangeMax(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trọng số % (để trống nếu không tổng hợp điểm)
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
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowKpiModal(false)}
                className="px-3.5 py-2 rounded-xl font-semibold border border-[#E2E8F0]"
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
      )}
    </div>
  )
}
