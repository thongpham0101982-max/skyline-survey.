"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  UserCheck,
  Eye,
  FileSpreadsheet,
  Sliders,
} from "lucide-react"
import type { WorkspaceCardConfig } from "@/lib/qa-workspace/types"

interface WorkspaceCardsViewProps {
  tasks: any[]
  taskGroups: any[]
  allStaffUsers: any[]
  sourceModules: any[]
  improvementActions: any[]
  canManage: boolean
  onAssignToCardGroup: (card: WorkspaceCardConfig, matchedGroupId?: string | null) => void
  onSelectGroupScope: (groupId: string) => void
  onSelectMember: (userId: string) => void
  onOpenAssistant: (initialPrompt?: string) => void
  onOpenGroupManager: () => void
  onOpenCapaModal: (actionToEdit?: any) => void
  onSyncSourceRecord: (moduleCode: string, item: any) => Promise<void>
  syncingRecordId: string | null
}

function getTaskStatus(t: any): string {
  return String(t?.qaMeta?.workflowStatus || t?.progress || "PENDING").toUpperCase()
}

function isTaskOverdue(t: any): boolean {
  const st = getTaskStatus(t)
  if (st === "COMPLETED" || st === "CANCELLED") return false
  return Boolean(t?.deadlineInfo?.isOverdue || t?.progress === "OVERDUE")
}

export function WorkspaceCardsView({
  tasks,
  taskGroups,
  allStaffUsers,
  sourceModules,
  canManage,
  onAssignToCardGroup,
  onSelectGroupScope,
  onSelectMember,
  onOpenAssistant,
  onOpenGroupManager,
  onSyncSourceRecord,
  syncingRecordId,
}: WorkspaceCardsViewProps) {
  const [memberGroupFilter, setMemberGroupFilter] = useState<string>("ALL")
  const [showSourcePanel, setShowSourcePanel] = useState(false)

  const userMap = useMemo(
    () => new Map((allStaffUsers || []).map((u) => [u.id, u])),
    [allStaffUsers]
  )

  // 1. Chỉ số tổng hợp toàn phạm vi (Unified Ledger Strip)
  const summary = useMemo(() => {
    const total = tasks.length
    let completed = 0
    let pendingReview = 0
    let inProgress = 0
    let overdue = 0
    for (const t of tasks) {
      const st = getTaskStatus(t)
      if (st === "COMPLETED") completed++
      else if (st === "PENDING_REVIEW") pendingReview++
      else if (st === "IN_PROGRESS" || st === "NEEDS_REVISION" || st === "ASSIGNED") inProgress++
      if (isTaskOverdue(t)) overdue++
    }
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, pendingReview, inProgress, overdue, rate }
  }, [tasks])

  // 2. Ma trận tiến độ theo từng Nhóm chuyên môn thực tế (không còn thẻ giả 0 nhiệm vụ)
  const groupRows = useMemo(() => {
    const rows = (taskGroups || []).map((g) => {
      const gTasks = tasks.filter(
        (t) => t.taskGroupId === g.id || t.taskGroup?.id === g.id || t.taskGroup?.name === g.name
      )
      const total = gTasks.length
      const completed = gTasks.filter((t) => getTaskStatus(t) === "COMPLETED").length
      const pendingReview = gTasks.filter((t) => getTaskStatus(t) === "PENDING_REVIEW").length
      const inProgress = gTasks.filter((t) =>
        ["IN_PROGRESS", "NEEDS_REVISION", "ASSIGNED", "PENDING"].includes(getTaskStatus(t))
      ).length
      const overdue = gTasks.filter((t) => isTaskOverdue(t)).length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0
      const leader = g.leaderUserId ? userMap.get(g.leaderUserId) : null
      const memberCount = Array.isArray(g.members) ? g.members.length : 0

      return {
        id: g.id,
        name: g.name,
        code: g.code || "",
        leaderName: leader?.fullName || g.leader?.fullName || "Chưa gán",
        memberCount,
        total,
        inProgress,
        pendingReview,
        overdue,
        completed,
        rate,
      }
    })

    // Các việc chưa gắn nhóm (nếu có)
    const unassignedTasks = tasks.filter((t) => !t.taskGroupId && !t.taskGroup?.id)
    if (unassignedTasks.length > 0) {
      const completed = unassignedTasks.filter((t) => getTaskStatus(t) === "COMPLETED").length
      const pendingReview = unassignedTasks.filter((t) => getTaskStatus(t) === "PENDING_REVIEW").length
      const overdue = unassignedTasks.filter((t) => isTaskOverdue(t)).length
      const inProgress = unassignedTasks.length - completed - pendingReview
      rows.push({
        id: "__UNASSIGNED__",
        name: "Chưa phân nhóm",
        code: "KHAC",
        leaderName: "—",
        memberCount: 0,
        total: unassignedTasks.length,
        inProgress: Math.max(0, inProgress),
        pendingReview,
        overdue,
        completed,
        rate: Math.round((completed / unassignedTasks.length) * 100),
      })
    }

    return rows.sort((a, b) => b.overdue - a.overdue || b.total - a.total)
  }, [taskGroups, tasks, userMap])

  // 3. Ma trận tiến độ từng Cá nhân trong Ban
  const memberRows = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string
        fullName: string
        email: string
        groupNames: Set<string>
        groupIds: Set<string>
        total: number
        inProgress: number
        pendingReview: number
        overdue: number
        completed: number
      }
    >()

    const ensureMember = (uid: string, fallbackName?: string) => {
      if (!map.has(uid)) {
        const u = userMap.get(uid)
        map.set(uid, {
          userId: uid,
          fullName: u?.fullName || fallbackName || "Chuyên viên",
          email: u?.email || "",
          groupNames: new Set<string>(),
          groupIds: new Set<string>(),
          total: 0,
          inProgress: 0,
          pendingReview: 0,
          overdue: 0,
          completed: 0,
        })
      }
      return map.get(uid)!
    }

    // Thêm thành viên từ các nhóm chuyên môn thực tế
    for (const g of taskGroups || []) {
      if (g.leaderUserId && userMap.has(g.leaderUserId)) {
        const entry = ensureMember(g.leaderUserId)
        entry.groupNames.add(g.name)
        entry.groupIds.add(g.id)
      }
      for (const m of g.members || []) {
        const uid = m.userId || m.id
        if (uid) {
          const entry = ensureMember(uid, m.user?.fullName || m.fullName)
          entry.groupNames.add(g.name)
          entry.groupIds.add(g.id)
        }
      }
    }

    // Cộng dồn thống kê đầu việc được gán cho từng cá nhân
    for (const t of tasks) {
      const uid = t.assignedToUserId || t.assignedToUser?.id
      if (!uid) continue
      const entry = ensureMember(uid, t.assignedToUser?.fullName)
      if (t.taskGroup?.name) entry.groupNames.add(t.taskGroup.name)
      if (t.taskGroupId) entry.groupIds.add(t.taskGroupId)

      const st = getTaskStatus(t)
      entry.total++
      if (st === "COMPLETED") entry.completed++
      else if (st === "PENDING_REVIEW") entry.pendingReview++
      else entry.inProgress++
      if (isTaskOverdue(t)) entry.overdue++
    }

    return Array.from(map.values())
      .filter((row) => {
        if (memberGroupFilter === "ALL") return true
        return row.groupIds.has(memberGroupFilter)
      })
      .map((row) => ({
        ...row,
        groupsLabel: Array.from(row.groupNames).join(", ") || "Ban KT&ĐBCL",
        rate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || b.total - a.total || a.fullName.localeCompare(b.fullName, "vi"))
  }, [taskGroups, tasks, userMap, memberGroupFilter])

  const sourceItemsCount = useMemo(
    () => (sourceModules || []).reduce((acc, m) => acc + (m.items?.length || 0), 0),
    [sourceModules]
  )

  return (
    <div className="space-y-5">
      {/* 1. UNIFIED LEDGER STRIP — Chỉ số tiến độ cốt lõi */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Tổng đầu việc</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">{summary.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{taskGroups.length} nhóm chuyên môn</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Đã nghiệm thu</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">{summary.completed}</span>
              <span className="text-xs font-semibold text-[#059669]">({summary.rate}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-[#059669] rounded-full" style={{ width: `${summary.rate}%` }} />
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Đang thực hiện</div>
            <div className="mt-1 text-2xl font-bold text-[#00736E]">{summary.inProgress}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Đang xử lý &amp; cập nhật</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Chờ duyệt nghiệm thu</div>
            <div className="mt-1 text-2xl font-bold text-[#D97706]">{summary.pendingReview}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cần xác nhận hoàn thành</div>
          </div>
          <div className="p-4 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-500">Quá hạn xử lý</div>
            <div className={`mt-1 text-2xl font-bold ${summary.overdue > 0 ? "text-[#E11D48]" : "text-slate-700"}`}>
              {summary.overdue}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summary.overdue > 0 ? "Cần đôn đốc ngay" : "Đúng tiến độ"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. BẢNG TIẾN ĐỘ CÔNG VIỆC THEO NHÓM CHUYÊN MÔN */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h2 className="text-sm font-bold text-[#003B3A]">Tiến độ công việc theo nhóm chuyên môn</h2>
            <p className="text-xs text-slate-500">
              Theo dõi trực tiếp khối lượng, tỷ lệ nghiệm thu và cảnh báo quá hạn của từng nhóm thuộc Ban KT&amp;ĐBCL.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAssistant()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-[#F0FDFA] hover:bg-teal-100/70 text-[#003B3A] text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#008B85]" />
              Trợ lý gợi ý việc từ SSM
            </button>
            {canManage && (
              <button
                type="button"
                onClick={onOpenGroupManager}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Cơ cấu nhóm
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white">Nhóm chuyên môn</th>
                <th className="py-3 px-3 text-teal-100">Điều phối viên</th>
                <th className="py-3 px-3 text-teal-100 text-center">Tổng việc</th>
                <th className="py-3 px-3 text-teal-100 text-center">Đang làm</th>
                <th className="py-3 px-3 text-teal-100 text-center">Chờ duyệt</th>
                <th className="py-3 px-3 text-teal-100 text-center">Quá hạn</th>
                <th className="py-3 px-3 text-[#5EEAD4]">Tỷ lệ nghiệm thu</th>
                <th className="py-3 px-3 text-white text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {groupRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có nhóm chuyên môn nào được cấu hình.
                  </td>
                </tr>
              ) : (
                groupRows.map((g) => (
                  <tr key={g.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-semibold text-[#003B3A]">
                      <div>{g.name}</div>
                      {g.memberCount > 0 && (
                        <div className="text-[11px] font-normal text-slate-500">{g.memberCount} thành viên</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{g.leaderName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{g.total}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#00736E]">{g.inProgress}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#D97706]">{g.pendingReview}</td>
                    <td className="py-3 px-3 text-center">
                      {g.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {g.overdue}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#00A19A] rounded-full transition-all"
                            style={{ width: `${g.rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 w-10 text-right">{g.rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {g.id !== "__UNASSIGNED__" && (
                          <button
                            type="button"
                            onClick={() =>
                              onAssignToCardGroup(
                                {
                                  key: "KHAO_THI",
                                  title: g.name,
                                  badge: g.code || "KT&ĐBCL",
                                  description: "",
                                  accentColor: "#003B3A",
                                  surfaceBg: "#FFFFFF",
                                  illustrationType: "TEAM_HUB",
                                  quickLinks: [],
                                },
                                g.id
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Giao việc
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectGroupScope(g.id === "__UNASSIGNED__" ? "ALL" : g.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Xem việc
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. BẢNG THEO DÕI TIẾN ĐỘ TỪNG CÁ NHÂN */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="border-l-4 border-[#00A19A] pl-3">
            <h2 className="text-sm font-bold text-[#003B3A]">Tiến độ công việc từng cá nhân</h2>
            <p className="text-xs text-slate-500">
              Kiểm soát tải công việc, đầu việc chờ duyệt và quá hạn của từng chuyên viên để phân bổ và hỗ trợ kịp thời.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={memberGroupFilter}
              onChange={(e) => setMemberGroupFilter(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">Tất cả nhóm ({memberRows.length} nhân sự)</option>
              {(taskGroups || []).map((g) => (
                <option key={g.id} value={g.id}>
                  Nhóm: {g.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/weekly-reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#003B3A] text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#008B85]" />
              Báo cáo tuần &amp; tháng
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white">Chuyên viên</th>
                <th className="py-3 px-3 text-teal-100">Nhóm chuyên môn</th>
                <th className="py-3 px-3 text-teal-100 text-center">Tổng việc</th>
                <th className="py-3 px-3 text-teal-100 text-center">Đang làm</th>
                <th className="py-3 px-3 text-teal-100 text-center">Chờ duyệt</th>
                <th className="py-3 px-3 text-teal-100 text-center">Quá hạn</th>
                <th className="py-3 px-3 text-[#5EEAD4]">Tiến độ nghiệm thu</th>
                <th className="py-3 px-3 text-white text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {memberRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có nhân sự nào được phân công đầu việc trong phạm vi lọc.
                  </td>
                </tr>
              ) : (
                memberRows.map((m) => (
                  <tr key={m.userId} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#003B3A]">{m.fullName}</div>
                      {m.email && <div className="text-[11px] text-slate-500">{m.email}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{m.groupsLabel}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{m.total}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#00736E]">{m.inProgress}</td>
                    <td className="py-3 px-3 text-center font-semibold text-[#D97706]">{m.pendingReview}</td>
                    <td className="py-3 px-3 text-center">
                      {m.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200 font-semibold">
                          {m.overdue}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.overdue > 0 ? "bg-[#D97706]" : "bg-[#059669]"
                            }`}
                            style={{ width: `${m.rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 w-10 text-right">{m.rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectMember(m.userId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F0FDFA] hover:border-[#00A19A] text-[#003B3A] text-[11px] font-semibold cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3 text-[#008B85]" />
                        Hồ sơ việc
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. LIÊN THÔNG DỮ LIỆU NGUỒN SSM (Thu gọn, chỉ mở khi cần đồng bộ đầu việc từ hệ thống) */}
      {sourceItemsCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between gap-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#003B3A]">
              <Clock className="w-4 h-4 text-[#008B85]" />
              <span>Dữ liệu nghiệp vụ SSM cần theo dõi ({sourceItemsCount} mục đang mở)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSourcePanel((v) => !v)}
              className="text-xs font-semibold text-[#00736E] hover:underline cursor-pointer"
            >
              {showSourcePanel ? "Thu gọn" : "Mở danh sách đồng bộ"}
            </button>
          </div>
          {showSourcePanel && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(sourceModules || [])
                .filter((m) => (m.items || []).length > 0)
                .map((mod) => (
                  <div
                    key={mod.moduleCode}
                    className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-[#003B3A]">{mod.moduleName}</div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#00736E] tabular-nums">
                        {mod.items.length} mục
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {mod.items.slice(0, 6).map((item: any) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={syncingRecordId === item.id}
                            onClick={() => onSyncSourceRecord(mod.moduleCode, item)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {syncingRecordId === item.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            Tạo việc
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
