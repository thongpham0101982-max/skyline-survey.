"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Edit3,
  Lock,
  RefreshCw,
  Settings,
  X,
} from "lucide-react"
import type { WorkHubKpiEvaluationResult, WorkHubKpiTargetScope } from "@/lib/workhub/types"

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

export default function WorkHubKpisPage() {
  const now = new Date()
  const [targetScope, setTargetScope] = useState<WorkHubKpiTargetScope>("INDIVIDUAL")
  const [targetEntityId, setTargetEntityId] = useState<string>("")
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())

  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any | null>(null)

  const [inspectItem, setInspectItem] = useState<WorkHubKpiEvaluationResult | null>(null)
  const [manualInputItem, setManualInputItem] = useState<WorkHubKpiEvaluationResult | null>(null)
  const [manualValue, setManualValue] = useState<string>("")
  const [manualEvidence, setManualEvidence] = useState<string>("")

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
            setTargetEntityId(json.actor.primaryDepartmentId || json.departments?.[0]?.id || "")
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

  const evaluations: WorkHubKpiEvaluationResult[] = data?.evaluations || []
  const scorecard = data?.scorecard
  const actor = data?.actor
  const canConfirm =
    actor?.isExecutive || actor?.isDepartmentHead || actor?.isCampusHead

  return (
    <div className="space-y-4">
      {/* Bộ lọc đối tượng & kỳ đánh giá KPI */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">Chỉ tiêu & Đánh giá KPI theo cấu hình</h2>
          <p className="text-xs text-slate-500">
            Hiển thị tường minh tử số, mẫu số, chiều đánh giá; mẫu số = 0 hoặc thiếu dữ liệu trả về &quot;Chưa đủ dữ liệu&quot; (không quy về 0 hay 100%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
          <select
            value={targetScope}
            onChange={(e) => {
              setTargetScope(e.target.value as WorkHubKpiTargetScope)
              setTargetEntityId("")
            }}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-semibold text-[#003B3A]"
          >
            <option value="INDIVIDUAL">Đối tượng: Cá nhân</option>
            {actor?.canViewOrgTracking && (
              <>
                <option value="DEPARTMENT">Đối tượng: Phòng ban / Tổ CM</option>
                <option value="CAMPUS">Đối tượng: Cơ sở</option>
              </>
            )}
          </select>

          {targetScope === "INDIVIDUAL" && canConfirm && (
            <select
              value={targetEntityId}
              onChange={(e) => setTargetEntityId(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 max-w-[190px]"
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

          {targetScope === "CAMPUS" && (
            <select
              value={targetEntityId}
              onChange={(e) => setTargetEntityId(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5"
            >
              {(data?.campuses || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
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

          {actor?.canManageKpiDefinitions && (
            <Link
              href="/admin/workhub/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-[#003B3A] text-white"
            >
              <Settings className="w-3.5 h-3.5" />
              Cấu hình KPI
            </Link>
          )}
        </div>
      </div>

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
                {scorecard.weightedKpiCount > 0 ? `${scorecard.totalConfiguredWeight}%` : "Không dùng trọng số"}
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
          Đang tính toán kết quả KPI từ dữ liệu nguồn...
        </div>
      ) : evaluations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
          <p className="text-sm font-bold text-[#003B3A]">
            Chưa cấu hình chỉ số KPI cho đối tượng này
          </p>
          <p className="text-xs text-slate-500">
            KPI trên WorkHub là tùy chọn theo nhu cầu quản lý, không bắt buộc mọi nhân sự hoặc mọi công việc phải có KPI.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Mã & Tên chỉ số KPI
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Nguồn & Chiều đánh giá
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Mục tiêu & Trọng số
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tử / Mẫu & Kết quả thực tế
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
                          {ev.weight ? `Trọng số: ${ev.weight}% (Trần ${ev.capScorePercent}%)` : "Theo dõi độc lập"}
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
                          Công thức & Nguồn
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

      {/* Modal Minh bạch Công thức, Tử số, Mẫu số & Dữ liệu nguồn */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-3 text-xs tabular-nums">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Chi tiết công thức & nguồn tính: {inspectItem.kpiCode} (v{inspectItem.kpiVersion})
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
    </div>
  )
}
