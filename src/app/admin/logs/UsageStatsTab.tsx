"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  RefreshCw,
  Download,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  UserX,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

interface UsageStatsResponse {
  range: string
  summary: {
    totalEvents: number
    loginSuccess: number
    loginFailed: number
    dataActions: number
    activeUsersCount: number
    totalStaffUsers: number
    adoptionRate: number
    inactiveUsersCount: number
    loginSuccessRate: number
  }
  dailyTrend: Array<{
    date: string
    label: string
    logins: number
    failedLogins: number
    actions: number
    total: number
    uniqueUsers: number
  }>
  hourlyDistribution: Array<{
    hour: number
    label: string
    total: number
    logins: number
    actions: number
  }>
  byRole: Array<{
    roleCode: string
    roleName: string
    totalUsers: number
    activeUsers: number
    adoptionRate: number
    logins: number
    dataActions: number
    totalEvents: number
  }>
  byAction: Array<{
    action: string
    label: string
    count: number
    uniqueUsers: number
    share: number
  }>
  topUsers: Array<{
    userId: string
    email: string
    fullName: string
    roleCode: string
    roleName: string
    campusLabel: string
    logins: number
    failedLogins: number
    dataActions: number
    totalEvents: number
    lastActiveAt: string
  }>
  inactiveUsers: Array<{
    userId: string
    email: string
    fullName: string
    roleCode: string
    roleName: string
    campusLabel: string
  }>
  campuses: Array<{
    id: string
    campusCode: string
    campusName: string
  }>
  roles: Array<{
    code: string
    name: string
  }>
}

const RANGE_OPTIONS = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "all", label: "Tất cả" },
]

const PAGE_SIZE = 10

export function UsageStatsTab({ roles }: { roles: Array<{ code: string; name: string }> }) {
  const [range, setRange] = useState<string>("30d")
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [campusFilter, setCampusFilter] = useState<string>("")
  const [data, setData] = useState<UsageStatsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Account table view state
  const [userTab, setUserTab] = useState<"active" | "inactive">("active")
  const [userSearch, setUserSearch] = useState<string>("")
  const [userPage, setUserPage] = useState<number>(1)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("range", range)
      if (roleFilter) params.set("role", roleFilter)
      if (campusFilter) params.set("campusId", campusFilter)

      const res = await fetch(`/api/admin/audit-logs/usage-stats?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Không thể tải dữ liệu thống kê")
      }
      setData(json)
      setUserPage(1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi kết nối máy chủ"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [range, roleFilter, campusFilter])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const filteredActiveUsers = useMemo(() => {
    if (!data) return []
    const q = userSearch.trim().toLowerCase()
    if (!q) return data.topUsers
    return data.topUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q) ||
        u.campusLabel.toLowerCase().includes(q)
    )
  }, [data, userSearch])

  const filteredInactiveUsers = useMemo(() => {
    if (!data) return []
    const q = userSearch.trim().toLowerCase()
    if (!q) return data.inactiveUsers
    return data.inactiveUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q) ||
        u.campusLabel.toLowerCase().includes(q)
    )
  }, [data, userSearch])

  const currentList = userTab === "active" ? filteredActiveUsers : filteredInactiveUsers
  const totalUserPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE))
  const paginatedUsers = currentList.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE)

  const peakHour = useMemo(() => {
    if (!data || data.hourlyDistribution.length === 0) return null
    return data.hourlyDistribution.reduce((best, cur) => (cur.total > best.total ? cur : best), data.hourlyDistribution[0])
  }, [data])

  const handleExportExcel = () => {
    if (!data) return
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Nhóm quyền
      const roleRows = data.byRole.map((r, i) => ({
        STT: i + 1,
        "Nhóm quyền": r.roleName,
        "Mã nhóm": r.roleCode,
        "Tổng TK hoạt động": r.totalUsers,
        "TK đã truy cập": r.activeUsers,
        "Tỷ lệ sử dụng (%)": r.adoptionRate,
        "Lượt đăng nhập": r.logins,
        "Thao tác nghiệp vụ": r.dataActions,
        "Tổng sự kiện": r.totalEvents,
      }))
      const wsRole = XLSX.utils.json_to_sheet(roleRows)
      XLSX.utils.book_append_sheet(wb, wsRole, "TheoNhomQuyen")

      // Sheet 2: Tài khoản tích cực
      const activeRows = data.topUsers.map((u, i) => ({
        STT: i + 1,
        "Tài khoản": u.email,
        "Họ và tên": u.fullName,
        "Nhóm quyền": u.roleName,
        "Cơ sở": u.campusLabel,
        "Lượt đăng nhập": u.logins,
        "Đăng nhập lỗi": u.failedLogins,
        "Thao tác nghiệp vụ": u.dataActions,
        "Tổng lượt": u.totalEvents,
        "Truy cập gần nhất": new Date(u.lastActiveAt).toLocaleString("vi-VN"),
      }))
      const wsActive = XLSX.utils.json_to_sheet(activeRows)
      XLSX.utils.book_append_sheet(wb, wsActive, "HoatDongTichCuc")

      // Sheet 3: Tài khoản chưa truy cập trong kỳ
      const inactiveRows = data.inactiveUsers.map((u, i) => ({
        STT: i + 1,
        "Tài khoản": u.email,
        "Họ và tên": u.fullName,
        "Nhóm quyền": u.roleName,
        "Cơ sở": u.campusLabel,
      }))
      const wsInactive = XLSX.utils.json_to_sheet(inactiveRows)
      XLSX.utils.book_append_sheet(wb, wsInactive, "ChuaTruyCapTrongKy")

      const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.value || range
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `ThongKeSuDung_SSM_${rangeLabel}_${dateStr}.xlsx`)
      toast.success("Đã xuất báo cáo thống kê sử dụng (.xlsx)")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định"
      toast.error("Không thể xuất file Excel: " + message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Time range segmented control */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                range === opt.value
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Scope filters & actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/10 outline-none cursor-pointer"
          >
            <option value="">Tất cả nhóm quyền</option>
            {(data?.roles || roles).map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/10 outline-none cursor-pointer"
          >
            <option value="">Tất cả cơ sở</option>
            {(data?.campuses || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.campusCode} - {c.campusName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#00A19A]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || !data}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#002B2A] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Loading / Error State */}
      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#00A19A]" />
          <p className="text-xs font-medium">Đang tổng hợp dữ liệu sử dụng hệ thống...</p>
        </div>
      ) : error && !data ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-[#E11D48] mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <button
            type="button"
            onClick={fetchStats}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#002B2A] cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : data ? (
        <>
          {/* Unified Academic Ledger KPI Strip */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden tabular-nums">
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
              <div className="p-4">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
                  <span>Tổng lượt ghi nhận</span>
                  <Activity className="w-4 h-4 text-[#00A19A]" />
                </div>
                <div className="text-2xl font-bold text-[#003B3A]">
                  {data.summary.totalEvents.toLocaleString("vi-VN")}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.summary.dataActions.toLocaleString("vi-VN")} thao tác dữ liệu
                </p>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
                  <span>Người dùng hoạt động</span>
                  <Users className="w-4 h-4 text-[#00A19A]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#003B3A]">
                    {data.summary.activeUsersCount.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs font-semibold text-[#008B85]">
                    / {data.summary.totalStaffUsers.toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tỷ lệ sử dụng: <span className="font-semibold text-[#059669]">{data.summary.adoptionRate}%</span>
                </p>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
                  <span>Đăng nhập thành công</span>
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                </div>
                <div className="text-2xl font-bold text-[#059669]">
                  {data.summary.loginSuccess.toLocaleString("vi-VN")}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tỷ lệ thành công: <span className="font-semibold text-slate-700">{data.summary.loginSuccessRate}%</span>
                </p>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
                  <span>Đăng nhập thất bại</span>
                  <ShieldCheck
                    className={`w-4 h-4 ${data.summary.loginFailed > 0 ? "text-[#E11D48]" : "text-slate-400"}`}
                  />
                </div>
                <div
                  className={`text-2xl font-bold ${
                    data.summary.loginFailed > 0 ? "text-[#E11D48]" : "text-slate-700"
                  }`}
                >
                  {data.summary.loginFailed.toLocaleString("vi-VN")}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Sai mật khẩu / tài khoản khóa</p>
              </div>

              <div className="p-4 col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
                  <span>Chưa truy cập trong kỳ</span>
                  <UserX
                    className={`w-4 h-4 ${data.summary.inactiveUsersCount > 0 ? "text-[#D97706]" : "text-slate-400"}`}
                  />
                </div>
                <div
                  className={`text-2xl font-bold ${
                    data.summary.inactiveUsersCount > 0 ? "text-[#D97706]" : "text-[#059669]"
                  }`}
                >
                  {data.summary.inactiveUsersCount.toLocaleString("vi-VN")}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Tài khoản nhân sự / GV đang mở</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-[#003B3A]">Xu hướng sử dụng theo ngày</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lượt đăng nhập, thao tác dữ liệu và số người dùng hoạt động mỗi ngày (giờ Việt Nam)
                  </p>
                </div>
              </div>

              {data.dailyTrend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  Chưa có dữ liệu hoạt động trong khoảng thời gian đã chọn.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.dailyTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="loginTealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00A19A" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#00A19A" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={{ stroke: "#E2E8F0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E2E8F0",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                        }}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload
                          return item ? `Ngày ${item.date.split("-").reverse().join("/")}` : ""
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                      <Area
                        type="monotone"
                        dataKey="logins"
                        name="Đăng nhập thành công"
                        stroke="#00A19A"
                        strokeWidth={2}
                        fill="url(#loginTealGrad)"
                      />
                      <Bar
                        dataKey="actions"
                        name="Thao tác dữ liệu"
                        fill="#003B3A"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                      />
                      <Line
                        type="monotone"
                        dataKey="uniqueUsers"
                        name="Người dùng hoạt động"
                        stroke="#D97706"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: "#D97706" }}
                        activeDot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Hourly Peak Chart */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-[#003B3A]">Phân bổ theo khung giờ</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {peakHour && peakHour.total > 0 ? (
                    <>
                      Cao điểm lúc{" "}
                      <span className="font-semibold text-[#003B3A] tabular-nums">
                        {peakHour.label}–{String((peakHour.hour + 1) % 24).padStart(2, "0")}h
                      </span>{" "}
                      ({peakHour.total.toLocaleString("vi-VN")} lượt)
                    </>
                  ) : (
                    "Tần suất truy cập theo 24 giờ trong ngày"
                  )}
                </p>
              </div>

              <div className="h-72 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyDistribution} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                    <Bar dataKey="total" name="Tổng lượt hoạt động" fill="#00A19A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Role & Action Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Role Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-bold text-[#003B3A]">Mức độ sử dụng theo nhóm quyền</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  So sánh tỷ lệ tài khoản đã truy cập trên tổng số tài khoản đang hoạt động của từng nhóm
                </p>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">Nhóm quyền</th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Đã truy cập
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                        Tỷ lệ sử dụng
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Đăng nhập
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {data.byRole.map((r) => (
                      <tr key={r.roleCode} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-semibold text-slate-800">{r.roleName}</td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          <span className="font-semibold text-[#003B3A]">{r.activeUsers}</span>
                          {r.totalUsers > 0 && <span className="text-slate-400"> / {r.totalUsers}</span>}
                        </td>
                        <td className="py-3 px-3 min-w-[130px]">
                          {r.totalUsers > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${r.adoptionRate}%`,
                                    backgroundColor:
                                      r.adoptionRate >= 70
                                        ? "#059669"
                                        : r.adoptionRate >= 40
                                        ? "#00A19A"
                                        : "#D97706",
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 w-10 text-right">
                                {r.adoptionRate}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {r.logins.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#003B3A]">
                          {r.dataActions.toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                    {data.byRole.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 px-3 text-center text-slate-400">
                          Không có dữ liệu nhóm quyền trong kỳ này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Action Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-bold text-[#003B3A]">Tần suất theo loại hoạt động</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các thao tác phát sinh nhiều nhất trên hệ thống trong kỳ báo cáo
                </p>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Loại hoạt động
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Số lượt
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Số tài khoản
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-right">
                        Tỷ trọng
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {data.byAction.slice(0, 12).map((act) => {
                      const isFailed = act.action.includes("FAILED") || act.action.includes("RATE_LIMITED")
                      const isSuccess = act.action.includes("SUCCESS")
                      return (
                        <tr key={act.action} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{act.label}</div>
                            {act.label !== act.action && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">{act.action}</div>
                            )}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-semibold ${
                              isFailed ? "text-[#E11D48]" : isSuccess ? "text-[#059669]" : "text-[#003B3A]"
                            }`}
                          >
                            {act.count.toLocaleString("vi-VN")}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {act.uniqueUsers.toLocaleString("vi-VN")}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-700">{act.share}%</td>
                        </tr>
                      )
                    })}
                    {data.byAction.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 px-3 text-center text-slate-400">
                          Không có hoạt động nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Account Detail Table: Active vs Inactive */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setUserTab("active")
                    setUserPage(1)
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                    userTab === "active"
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  Hoạt động tích cực ({filteredActiveUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserTab("inactive")
                    setUserPage(1)
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                    userTab === "inactive"
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  Chưa truy cập trong kỳ ({filteredInactiveUsers.length})
                </button>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(1)
                  }}
                  placeholder="Tìm theo tên, tài khoản, cơ sở..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/10 outline-none bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {userTab === "active" ? (
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-12 text-center">
                        STT
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Tài khoản
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Họ và tên
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Nhóm quyền
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Cơ sở
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Đăng nhập
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                        Thao tác DL
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-right">
                        Tổng lượt
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Truy cập gần nhất
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {(paginatedUsers as UsageStatsResponse["topUsers"]).map((u, idx) => (
                      <tr key={u.userId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 text-center text-slate-400">
                          {(userPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{u.email}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-3 text-slate-600">{u.roleName}</td>
                        <td className="py-3 px-3 text-slate-600">{u.campusLabel}</td>
                        <td className="py-3 px-3 text-right text-[#059669] font-semibold">
                          {u.logins.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {u.dataActions.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#003B3A]">
                          {u.totalEvents.toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(u.lastActiveAt).toLocaleString("vi-VN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 px-3 text-center text-slate-400">
                          Không có tài khoản nào khớp điều kiện tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-12 text-center">
                        STT
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Tài khoản
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                        Họ và tên
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Nhóm quyền
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                        Cơ sở
                      </th>
                      <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                        Trạng thái trong kỳ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {(paginatedUsers as UsageStatsResponse["inactiveUsers"]).map((u, idx) => (
                      <tr key={u.userId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 text-center text-slate-400">
                          {(userPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{u.email}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-3 text-slate-600">{u.roleName}</td>
                        <td className="py-3 px-3 text-slate-600">{u.campusLabel}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-[#D97706] border border-amber-200">
                            Chưa có lượt truy cập
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 px-3 text-center text-slate-400">
                          Tất cả tài khoản nhân sự trong phạm vi lọc đều đã truy cập hệ thống.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalUserPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC]/60 tabular-nums">
                <p className="text-xs text-slate-500">
                  Hiển thị {(userPage - 1) * PAGE_SIZE + 1} - {Math.min(userPage * PAGE_SIZE, currentList.length)} trên{" "}
                  <span className="font-semibold text-slate-700">{currentList.length}</span> tài khoản
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-700 bg-white hover:bg-[#F8FAFC] disabled:opacity-40 cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-2.5 text-xs font-semibold text-slate-600">
                    {userPage} / {totalUserPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    disabled={userPage === totalUserPages}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-700 bg-white hover:bg-[#F8FAFC] disabled:opacity-40 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
