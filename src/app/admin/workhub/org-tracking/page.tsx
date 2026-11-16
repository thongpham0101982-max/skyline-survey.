"use client"

import React, { useCallback, useEffect, useState } from "react"
import { AlertCircle, Building2, RefreshCw, Users } from "lucide-react"
import { SourceDrilldownDrawer } from "../components/SourceDrilldownDrawer"

export default function WorkHubOrgTrackingPage() {
  const now = new Date()
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)
  const [drillTitle, setDrillTitle] = useState<string>("")
  const [drillTaskIds, setDrillTaskIds] = useState<string[] | null>(null)

  const loadOrgData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/workhub?resource=org-tracking&periodType=MONTHLY&month=${month}&year=${year}`
      )
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error || "Bạn không có quyền truy cập dữ liệu theo dõi đơn vị.")
      } else {
        setData(json.data)
      }
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ.")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadOrgData()
  }, [loadOrgData])

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A] mx-auto mb-2" />
        Đang tải bảng theo dõi Phòng ban & Cơ sở...
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

  const drillTasks = drillTaskIds
    ? (data?.drilldownCatalog?.tasks || []).filter((t: any) => drillTaskIds.includes(t.id))
    : []

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">
            Theo dõi tiến độ & báo cáo theo Phòng ban / Cơ sở
          </h2>
          <p className="text-xs text-slate-500">
            Tổng hợp công việc không tính trùng và rà soát rõ các đơn vị / cá nhân chưa gửi báo cáo kỳ Tháng {month}/{year}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs tabular-nums">
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
      </div>

      {/* 1. Ma trận Cơ sở */}
      {(data?.campusBreakdown || []).length > 0 && (
        <div className="space-y-2.5">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#00A19A]" />
              Tổng hợp theo Cơ sở ({data.campusBreakdown.length})
            </h3>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                      Cơ sở
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Hoàn thành / Tổng việc lá
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                      Tỷ lệ đúng hạn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Tồn đọng quá hạn
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                      Báo cáo Đã gửi / Chưa gửi
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {data.campusBreakdown.map((c: any) => (
                    <tr key={c.campusId} className="hover:bg-[#F8FAFC] align-middle">
                      <td className="py-3 px-3 font-semibold text-[#003B3A]">{c.campusName}</td>
                      <td className="py-3 px-3 text-center">
                        {c.completedTasks}/{c.totalTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                        {c.onTimeRateDisplay}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={c.overdueTasks > 0 ? "font-bold text-[#E11D48]" : "text-slate-500"}>
                          {c.overdueTasks}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[#059669] font-semibold">{c.submittedReportsCount} đã gửi</span> /{" "}
                        <span className="text-[#D97706]">{c.missingReportsCount} chưa gửi</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setDrillTitle(`Công việc tại ${c.campusName}`)
                            setDrillTaskIds(c.taskIds)
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                        >
                          Mở nguồn việc
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Ma trận Phòng ban / Tổ chuyên môn */}
      <div className="space-y-2.5">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#00A19A]" />
            Tổng hợp theo Phòng ban / Tổ chuyên môn ({(data?.departmentBreakdown || []).length})
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Phòng ban / Tổ chuyên môn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Hoàn thành / Tổng việc
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tỷ lệ đúng hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Quá hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Phát sinh
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Báo cáo Đã gửi / Chưa gửi
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {(data?.departmentBreakdown || []).map((d: any) => (
                  <tr key={d.departmentId} className="hover:bg-[#F8FAFC] align-middle">
                    <td className="py-3 px-3 font-semibold text-[#003B3A]">{d.departmentName}</td>
                    <td className="py-3 px-3 text-center">
                      {d.completedTasks}/{d.totalTasks}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                      {d.onTimeRateDisplay}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={d.overdueTasks > 0 ? "font-bold text-[#E11D48]" : "text-slate-500"}>
                        {d.overdueTasks}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{d.adhocTasks}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[#059669] font-semibold">{d.submittedReportsCount} đã gửi</span> /{" "}
                      <span className="text-[#D97706]">{d.missingReportsCount} chưa gửi</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDrillTitle(`Công việc thuộc ${d.departmentName}`)
                          setDrillTaskIds(d.taskIds)
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                      >
                        Mở nguồn việc
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Danh sách cá nhân chưa gửi báo cáo kỳ hiện tại */}
      {(data?.unsubmittedStaff || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2 text-xs">
          <div className="font-bold text-[#003B3A]">
            Danh sách nhân sự chưa gửi báo cáo kỳ {data.period?.periodLabel} ({data.unsubmittedStaff.length})
          </div>
          <p className="text-[11px] text-slate-500">
            Hệ thống tách riêng danh sách chưa gửi để đôn đốc, tuyệt đối không coi báo cáo chưa gửi là kết quả công việc bằng 0.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.unsubmittedStaff.map((u: any) => (
              <span
                key={u.userId}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-medium"
              >
                {u.fullName} ({u.position})
              </span>
            ))}
          </div>
        </div>
      )}

      <SourceDrilldownDrawer
        open={Boolean(drillTaskIds)}
        onClose={() => setDrillTaskIds(null)}
        title={drillTitle}
        displayValue={`${drillTasks.length} công việc lá`}
        formulaDescription="Danh sách công việc nguồn thuộc đơn vị đang kiểm tra (đã tự động khử trùng công việc cha–con và cộng tác viên)."
        sourceType="TASKS"
        tasks={drillTasks}
      />
    </div>
  )
}
