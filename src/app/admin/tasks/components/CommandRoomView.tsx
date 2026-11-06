"use client"

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react"
import {
  RotateCcw,
  Plus,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Monitor,
  LayoutList,
  Box,
  ZoomIn,
  ZoomOut,
  Compass,
  Users,
  Eye,
} from "lucide-react"

interface CommandRoomViewProps {
  tasks: any[]
  taskGroups: any[]
  allStaffUsers: any[]
  selectedGroupId: string
  selectedDepartment?: string
  defaultDepartment?: string
  departments?: any[]
  onChangeDepartment?: (deptCode: string) => void
  onSetDefaultDepartment?: (deptCode: string) => void
  onSelectMember: (userId: string) => void
  onQuickAssignMember: (userId: string, groupId?: string | null) => void
  onQuickAssignGroup: (groupId: string) => void
  onSelectTask: (task: any) => void
}

interface SeatMember {
  userId: string
  fullName: string
  email: string
  roleLabel: string
  groupName: string
  groupId: string | null
  isCoordinator: boolean
  activeCount: number
  pendingReviewCount: number
  overdueCount: number
  completedCount: number
  totalCount: number
  // 3D world coordinates around the long conference table
  worldX: number
  worldY: number
  worldZ: number
  avatarColor: string
}

const AVATAR_PALETTE = [
  "#6D28D9", // SSM Violet
  "#0D9488", // SSM Teal
  "#2563EB", // Royal Blue
  "#D97706", // Amber
  "#059669", // Emerald
  "#DB2777", // Pink
  "#00736E", // Indigo
  "#DC2626", // Crimson
]

export function CommandRoomView({
  tasks,
  taskGroups,
  allStaffUsers,
  selectedGroupId,
  selectedDepartment = "KT&ĐBCL",
  defaultDepartment = "KT&ĐBCL",
  departments = [],
  onChangeDepartment,
  onSetDefaultDepartment,
  onSelectMember,
  onQuickAssignMember,
  onQuickAssignGroup,
  onSelectTask,
}: CommandRoomViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Camera state for 3D projection: yaw (horizontal rotation), pitch (vertical tilt), zoom
  const DEFAULT_CAMERA = { yaw: 0, pitch: 0.42, zoom: 1.0 }
  const [camera, setCamera] = useState(DEFAULT_CAMERA)
  // Detect Canvas/3D support lazily on client without synchronous setState in useEffect
  const [webglSupported] = useState<boolean>(() => {
    if (typeof document === "undefined") return true
    try {
      const testCanvas = document.createElement("canvas")
      return Boolean(testCanvas.getContext("2d"))
    } catch {
      return false
    }
  })
  const [renderMode, setRenderMode] = useState<"3D" | "2D">(() => (webglSupported ? "3D" : "2D"))
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [projectedSeats, setProjectedSeats] = useState<
    Array<SeatMember & { screenX: number; screenY: number; scale: number; depth: number }>
  >([])

  const dragRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    startYaw: number
    startPitch: number
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0.42,
  })

  // Helper kiểm tra nhân sự thuộc Tổ chuyên môn đang chọn
  const isUserMatchingDepartment = useCallback((u: any, deptCode: string) => {
    if (!deptCode || deptCode === "ALL") return true
    const dRel = u?.teacher?.departmentRel
    const uDeptName = dRel?.name || ""
    const uDeptCode = dRel?.code || ""
    const uDivCode = dRel?.divisionCode || ""

    if (
      deptCode === "KT&ĐBCL" ||
      deptCode === "KT-ĐBCL" ||
      deptCode === "KT_DBCL" ||
      deptCode === "BAN_KT_DBCL"
    ) {
      return (
        uDeptName === "KT&ĐBCL" ||
        uDeptCode === "KT-ĐBCL" ||
        uDeptCode === "KT&ĐBCL" ||
        uDivCode === "BAN_KT_DBCL"
      )
    }
    return (
      uDeptName === deptCode ||
      uDeptCode === deptCode ||
      uDivCode === deptCode
    )
  }, [])

  // Build real member seats from actual TaskGroups and real User accounts in the selected Tổ chuyên môn (no fake online status!)
  const seatMembers: SeatMember[] = useMemo(() => {
    const userMap = new Map(allStaffUsers.map(u => [u.id, u]))
    const memberEntryMap = new Map<
      string,
      {
        user: any
        groupName: string
        groupId: string | null
        isCoordinator: boolean
      }
    >()

    const groupsToInclude =
      selectedGroupId && selectedGroupId !== "ALL" && selectedGroupId !== "MY_TASKS"
        ? taskGroups.filter(g => g.id === selectedGroupId)
        : taskGroups.filter(g => {
            if (!selectedDepartment || selectedDepartment === "ALL") return true
            if (!g.department) return selectedDepartment === "KT&ĐBCL"
            return (
              g.department === selectedDepartment ||
              (selectedDepartment === "KT&ĐBCL" &&
                (g.department === "KT-ĐBCL" || g.department === "KT_DBCL"))
            )
          })

    for (const grp of groupsToInclude) {
      if (grp.leaderUserId && userMap.has(grp.leaderUserId)) {
        const leaderUser = userMap.get(grp.leaderUserId)
        if (
          !selectedDepartment ||
          selectedDepartment === "ALL" ||
          isUserMatchingDepartment(leaderUser, selectedDepartment) ||
          selectedGroupId === grp.id
        ) {
          memberEntryMap.set(grp.leaderUserId, {
            user: leaderUser,
            groupName: grp.name,
            groupId: grp.id,
            isCoordinator: true,
          })
        }
      }
      let mIds: string[] = []
      try {
        mIds = grp.memberUserIds ? JSON.parse(grp.memberUserIds) : []
      } catch {
        mIds = []
      }
      for (const uid of mIds) {
        if (userMap.has(uid) && !memberEntryMap.has(uid)) {
          memberEntryMap.set(uid, {
            user: userMap.get(uid),
            groupName: grp.name,
            groupId: grp.id,
            isCoordinator: grp.leaderUserId === uid,
          })
        }
      }
    }

    // Luôn bổ sung đầy đủ các thành viên thực thuộc Tổ chuyên môn đang chọn (VD: Tổ KT&ĐBCL mặc định)
    if (!selectedGroupId || selectedGroupId === "ALL") {
      const deptUsers = allStaffUsers.filter(u =>
        isUserMatchingDepartment(u, selectedDepartment)
      )
      for (const u of deptUsers) {
        if (!memberEntryMap.has(u.id)) {
          memberEntryMap.set(u.id, {
            user: u,
            groupName:
              u.teacher?.departmentRel?.name ||
              (selectedDepartment !== "ALL" ? selectedDepartment : "Ban KT&ĐBCL"),
            groupId: null,
            isCoordinator: u.role === "ADMIN",
          })
        }
      }
    }

    // Bổ sung nhân sự có công việc thực tế được giao trong phạm vi đang lọc
    for (const t of tasks) {
      if (t.assignedToUserId && userMap.has(t.assignedToUserId) && !memberEntryMap.has(t.assignedToUserId)) {
        const assigneeUser = userMap.get(t.assignedToUserId)
        if (
          !selectedDepartment ||
          selectedDepartment === "ALL" ||
          isUserMatchingDepartment(assigneeUser, selectedDepartment) ||
          t.department === selectedDepartment
        ) {
          const grp = taskGroups.find(g => g.id === t.taskGroupId)
          memberEntryMap.set(t.assignedToUserId, {
            user: assigneeUser,
            groupName: grp?.name || t.department || "Ban KT&ĐBCL",
            groupId: grp?.id || null,
            isCoordinator: grp?.leaderUserId === t.assignedToUserId,
          })
        }
      }
    }

    // Nếu Tổ chuyên môn đang chọn chưa có nhân sự được gán trong hồ sơ Giáo viên, ưu tiên lấy nhân sự KT&ĐBCL trước
    if (memberEntryMap.size === 0) {
      const ktFallback = allStaffUsers.filter(u =>
        isUserMatchingDepartment(u, "KT&ĐBCL")
      )
      const fallbackPool = ktFallback.length > 0 ? ktFallback : allStaffUsers.slice(0, 8)
      for (const u of fallbackPool.slice(0, 10)) {
        memberEntryMap.set(u.id, {
          user: u,
          groupName: u.teacher?.departmentRel?.name || "Ban KT&ĐBCL",
          groupId: null,
          isCoordinator: u.role === "ADMIN",
        })
      }
    }

    const entries = Array.from(memberEntryMap.values()).slice(0, 14)
    const count = entries.length

    return entries.map((entry, idx) => {
      const uid = entry.user.id
      const userTasks = tasks.filter(t => t.assignedToUserId === uid)
      const activeCount = userTasks.filter(
        t => (t.qaMeta?.workflowStatus || t.progress) === "IN_PROGRESS" || (t.qaMeta?.workflowStatus || t.progress) === "ASSIGNED"
      ).length
      const pendingReviewCount = userTasks.filter(
        t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
      ).length
      const overdueCount = userTasks.filter(t =>
        Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
      ).length
      const completedCount = userTasks.filter(
        t => (t.qaMeta?.workflowStatus || t.progress) === "COMPLETED"
      ).length

      // Position seats around a long oval/rectangular conference table with wide spacing so cards never overlap
      let worldX = 0
      let worldZ = 0
      if (idx === 0) {
        // Head of table (left coordinator seat)
        worldX = -295
        worldZ = 0
      } else {
        const remaining = Math.max(1, count - 1)
        const topRowCount = Math.ceil(remaining / 2)
        const bottomRowCount = remaining - topRowCount
        if (idx <= topRowCount) {
          const posIdx = idx - 1
          const span = 450
          worldX =
            topRowCount === 1
              ? 0
              : -200 + (posIdx / (topRowCount - 1)) * span
          worldZ = -140
        } else {
          const posIdx = idx - 1 - topRowCount
          const span = 450
          worldX =
            bottomRowCount <= 1
              ? 0
              : -200 + (posIdx / Math.max(1, bottomRowCount - 1)) * span
          worldZ = 140
        }
      }

      const roleLabel = entry.isCoordinator
        ? "Điều phối nhóm"
        : entry.user.role === "ADMIN"
        ? "Ban Điều hành"
        : entry.user.teacher?.mainSubjectRel?.subjectName || "Chuyên viên KT&ĐBCL"

      return {
        userId: uid,
        fullName: entry.user.fullName || entry.user.email,
        email: entry.user.email || "",
        roleLabel,
        groupName: entry.groupName,
        groupId: entry.groupId,
        isCoordinator: entry.isCoordinator,
        activeCount,
        pendingReviewCount,
        overdueCount,
        completedCount,
        totalCount: userTasks.length,
        worldX,
        worldY: 0,
        worldZ,
        avatarColor: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
      }
    })
  }, [allStaffUsers, taskGroups, tasks, selectedGroupId, selectedDepartment, isUserMatchingDepartment])

  // Real-time task metrics for the Shared Conference Screen
  const sharedScreenMetrics = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(
      t => (t.qaMeta?.workflowStatus || t.progress) === "COMPLETED"
    ).length
    const inProgress = tasks.filter(
      t => (t.qaMeta?.workflowStatus || t.progress) === "IN_PROGRESS"
    ).length
    const pendingReview = tasks.filter(
      t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
    ).length
    const overdueExecution = tasks.filter(
      t => t.deadlineInfo?.code === "OVERDUE_EXECUTION" || (t.progress === "OVERDUE" && !t.deadlineInfo)
    ).length
    const overdueReview = tasks.filter(
      t => t.deadlineInfo?.code === "OVERDUE_REVIEW"
    ).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return {
      total,
      completed,
      inProgress,
      pendingReview,
      overdueExecution,
      overdueReview,
      completionRate,
    }
  }, [tasks])

  // 3D Point projection helper
  const projectPoint = useCallback(
    (x: number, y: number, z: number, width: number, height: number) => {
      const cosY = Math.cos(camera.yaw)
      const sinY = Math.sin(camera.yaw)
      const cosP = Math.cos(camera.pitch)
      const sinP = Math.sin(camera.pitch)

      // Rotate around Y axis (yaw)
      const rx = x * cosY - z * sinY
      const rz = x * sinY + z * cosY

      // Rotate around X axis (pitch)
      const ry = y * cosP - rz * sinP
      const rz2 = y * sinP + rz * cosP

      const fov = 720 * camera.zoom
      const distance = 680
      const scale = fov / Math.max(180, distance + rz2)

      return {
        screenX: width / 2 + rx * scale,
        screenY: height / 2 + 35 + ry * scale,
        scale,
        depth: rz2,
      }
    },
    [camera]
  )

  // Draw 3D Conference Room on Canvas & cleanup resources on unmount
  useEffect(() => {
    if (renderMode !== "3D") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number | null = null

    const renderScene = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      // 1. Room Floor & Ambient Grid
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      bgGrad.addColorStop(0, "#0F172A")
      bgGrad.addColorStop(0.45, "#1E293B")
      bgGrad.addColorStop(1, "#0F172A")
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Draw 3D floor carpet polygon
      const floorCorners = [
        projectPoint(-420, 42, -260, width, height),
        projectPoint(420, 42, -260, width, height),
        projectPoint(420, 42, 260, width, height),
        projectPoint(-420, 42, 260, width, height),
      ]
      ctx.beginPath()
      ctx.moveTo(floorCorners[0].screenX, floorCorners[0].screenY)
      for (let i = 1; i < floorCorners.length; i++) {
        ctx.lineTo(floorCorners[i].screenX, floorCorners[i].screenY)
      }
      ctx.closePath()
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)"
      ctx.fill()
      ctx.strokeStyle = "rgba(139, 92, 246, 0.35)"
      ctx.lineWidth = 2
      ctx.stroke()

      // 2. Decorative Indoor Plants in the 4 corners of the room
      const plantCoords = [
        { x: -370, z: -215 },
        { x: 370, z: -215 },
        { x: -370, z: 215 },
        { x: 370, z: 215 },
      ]
      for (const pc of plantCoords) {
        const base = projectPoint(pc.x, 32, pc.z, width, height)
        const r = 18 * base.scale
        // Pot
        ctx.fillStyle = "#475569"
        ctx.beginPath()
        ctx.arc(base.screenX, base.screenY, r * 0.7, 0, Math.PI * 2)
        ctx.fill()
        // Green leaves
        ctx.fillStyle = "#10B981"
        for (let a = 0; a < 5; a++) {
          const ang = (a * Math.PI * 2) / 5
          ctx.beginPath()
          ctx.ellipse(
            base.screenX + Math.cos(ang) * r * 0.55,
            base.screenY - 8 * base.scale + Math.sin(ang) * r * 0.4,
            r * 0.65,
            r * 0.35,
            ang,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }

      // 3. Long Conference Table (3D extruded boardroom table)
      const tableTop = [
        projectPoint(-225, 0, -78, width, height),
        projectPoint(225, 0, -78, width, height),
        projectPoint(225, 0, 78, width, height),
        projectPoint(-225, 0, 78, width, height),
      ]
      const tableBottom = [
        projectPoint(-225, 16, -78, width, height),
        projectPoint(225, 16, -78, width, height),
        projectPoint(225, 16, 78, width, height),
        projectPoint(-225, 16, 78, width, height),
      ]

      // Table edge thickness
      ctx.beginPath()
      ctx.moveTo(tableBottom[0].screenX, tableBottom[0].screenY)
      for (let i = 1; i < 4; i++) ctx.lineTo(tableBottom[i].screenX, tableBottom[i].screenY)
      ctx.closePath()
      ctx.fillStyle = "#334155"
      ctx.fill()

      // Table top surface
      ctx.beginPath()
      ctx.moveTo(tableTop[0].screenX, tableTop[0].screenY)
      for (let i = 1; i < 4; i++) ctx.lineTo(tableTop[i].screenX, tableTop[i].screenY)
      ctx.closePath()
      const tableGrad = ctx.createLinearGradient(
        tableTop[0].screenX,
        tableTop[0].screenY,
        tableTop[2].screenX,
        tableTop[2].screenY
      )
      tableGrad.addColorStop(0, "#F8FAFC")
      tableGrad.addColorStop(0.5, "#E2E8F0")
      tableGrad.addColorStop(1, "#CBD5E1")
      ctx.fillStyle = tableGrad
      ctx.fill()
      ctx.strokeStyle = "#6D28D9"
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Center inlay strip on conference table
      const inlay = [
        projectPoint(-165, -1, -22, width, height),
        projectPoint(165, -1, -22, width, height),
        projectPoint(165, -1, 22, width, height),
        projectPoint(-165, -1, 22, width, height),
      ]
      ctx.beginPath()
      ctx.moveTo(inlay[0].screenX, inlay[0].screenY)
      for (let i = 1; i < 4; i++) ctx.lineTo(inlay[i].screenX, inlay[i].screenY)
      ctx.closePath()
      ctx.fillStyle = "rgba(109, 40, 217, 0.14)"
      ctx.fill()
      ctx.strokeStyle = "rgba(109, 40, 217, 0.35)"
      ctx.lineWidth = 1
      ctx.stroke()

      // 4. Project seats & sort back-to-front by depth
      const projected = seatMembers
        .map(m => {
          const p = projectPoint(m.worldX, m.worldY, m.worldZ, width, height)
          return { ...m, ...p }
        })
        .sort((a, b) => b.depth - a.depth)

      // Draw chairs & laptop on table in front of each seat
      for (const seat of projected) {
        const chairRadius = 22 * seat.scale
        const isHovered = hoveredUserId === seat.userId

        // Chair base glow
        ctx.beginPath()
        ctx.arc(seat.screenX, seat.screenY + 8 * seat.scale, chairRadius * 1.15, 0, Math.PI * 2)
        ctx.fillStyle = isHovered
          ? "rgba(109, 40, 217, 0.45)"
          : seat.overdueCount > 0
          ? "rgba(225, 29, 72, 0.28)"
          : "rgba(15, 23, 42, 0.55)"
        ctx.fill()

        // Avatar torso
        ctx.beginPath()
        ctx.arc(seat.screenX, seat.screenY, chairRadius * 0.85, 0, Math.PI * 2)
        ctx.fillStyle = seat.avatarColor
        ctx.fill()
        ctx.strokeStyle = isHovered ? "#FACC15" : "#FFFFFF"
        ctx.lineWidth = isHovered ? 3 : 2
        ctx.stroke()

        // Avatar head
        ctx.beginPath()
        ctx.arc(
          seat.screenX,
          seat.screenY - 14 * seat.scale,
          chairRadius * 0.52,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = "#FDE68A"
        ctx.fill()
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      setProjectedSeats(projected)
    }

    animationFrameId = window.requestAnimationFrame(renderScene)

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [renderMode, camera, seatMembers, hoveredUserId, projectPoint])

  // Pointer drag handlers for 3D orbit rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (renderMode !== "3D") return
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startYaw: camera.yaw,
      startPitch: camera.pitch,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || renderMode !== "3D") return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const nextYaw = dragRef.current.startYaw + dx * 0.0065
    const nextPitch = Math.max(
      0.18,
      Math.min(0.85, dragRef.current.startPitch + dy * 0.004)
    )
    setCamera(prev => ({ ...prev, yaw: nextYaw, pitch: nextPitch }))
  }

  const handleMouseUp = () => {
    dragRef.current.isDragging = false
  }

  return (
    <div className="space-y-5">
      {/* Thanh điều khiển Phòng điều hành & Màn hình chung hiển thị tiến độ thực tế */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-600/30 text-teal-700 border border-teal-500/40">
                <Monitor className="w-3.5 h-3.5" />
                PHÒNG ĐIỀU HÀNH TRỰC QUAN — {selectedDepartment === "ALL" ? "TOÀN TRƯỜNG" : selectedDepartment}
              </span>
              {selectedDepartment === defaultDepartment && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ★ Tổ chuyên môn mặc định
                </span>
              )}
              <span className="text-xs text-slate-400">
                Dữ liệu thời gian thực từ CSDL (không giả lập trạng thái online)
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-1">
              Màn hình Điều hành Chung & Bàn họp Thành viên ({seatMembers.length} nhân sự{" "}
              {selectedDepartment === "ALL" ? "toàn trường" : `thuộc Tổ ${selectedDepartment}`})
            </h2>
          </div>

          {/* Bộ nút chọn Tổ chuyên môn, điều khiển góc nhìn 3D & Chuyển đổi chế độ 2D */}
          <div className="flex flex-wrap items-center gap-2">
            {departments.length > 0 && onChangeDepartment && (
              <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-400">Tổ CM:</span>
                <select
                  value={selectedDepartment}
                  onChange={e => onChangeDepartment(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-teal-700 outline-none cursor-pointer"
                >
                  {departments.map((d: any) => (
                    <option key={d.code} value={d.code} className="bg-slate-900 text-white">
                      {d.name} {d.code === defaultDepartment ? "(Mặc định)" : ""}
                    </option>
                  ))}
                  <option value="ALL" className="bg-slate-900 text-white">
                    Tất cả Tổ chuyên môn
                  </option>
                </select>
                {onSetDefaultDepartment &&
                  selectedDepartment !== "ALL" &&
                  selectedDepartment !== defaultDepartment && (
                    <button
                      type="button"
                      onClick={() => onSetDefaultDepartment(selectedDepartment)}
                      className="px-2 py-0.5 rounded-lg bg-teal-500 hover:bg-teal-500 text-[10px] font-bold text-white cursor-pointer"
                      title="Lưu làm Tổ chuyên môn mặc định khi mở QA Workspace"
                    >
                      Đặt mặc định
                    </button>
                  )}
              </div>
            )}
            {webglSupported && (
              <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setRenderMode("3D")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    renderMode === "3D"
                      ? "bg-teal-500 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  Phòng họp 3D
                </button>
                <button
                  type="button"
                  onClick={() => setRenderMode("2D")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    renderMode === "2D"
                      ? "bg-teal-500 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Chế độ 2D / Danh sách
                </button>
              </div>
            )}

            {renderMode === "3D" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setCamera(prev => ({ ...prev, yaw: prev.yaw - 0.35 }))
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  title="Xoay trái"
                >
                  <Compass className="w-3.5 h-3.5" /> Xoay góc
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCamera(prev => ({
                      ...prev,
                      zoom: Math.min(1.35, prev.zoom + 0.1),
                    }))
                  }
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCamera(prev => ({
                      ...prev,
                      zoom: Math.max(0.75, prev.zoom - 0.1),
                    }))
                  }
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCamera(DEFAULT_CAMERA)}
                  className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-500 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Góc nhìn ban đầu
                </button>
              </>
            )}
          </div>
        </div>

        {/* MÀN HÌNH CHUNG HIỂN THỊ TIẾN ĐỘ NHIỆM VỤ THỰC TẾ */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-semibold">Tổng nhiệm vụ</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {sharedScreenMetrics.total}
            </div>
            <div className="text-[10px] text-teal-400 mt-0.5">
              Hoàn thành: {sharedScreenMetrics.completionRate}%
            </div>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-semibold">Đang thực hiện</div>
            <div className="text-2xl font-black text-sky-400 mt-0.5">
              {sharedScreenMetrics.inProgress}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Đang triển khai</div>
          </div>
          <div className="bg-slate-800/90 border border-teal-500/40 rounded-xl p-3">
            <div className="text-[11px] text-teal-700 font-semibold">Chờ duyệt</div>
            <div className="text-2xl font-black text-teal-700 mt-0.5">
              {sharedScreenMetrics.pendingReview}
            </div>
            <div className="text-[10px] text-teal-700 mt-0.5">
              Tách biệt khỏi Hoàn thành
            </div>
          </div>
          <div className="bg-slate-800/90 border border-rose-500/40 rounded-xl p-3">
            <div className="text-[11px] text-rose-300 font-semibold">Chậm thực hiện</div>
            <div className="text-2xl font-black text-rose-400 mt-0.5">
              {sharedScreenMetrics.overdueExecution}
            </div>
            <div className="text-[10px] text-rose-300 mt-0.5">Quá hạn thực hiện</div>
          </div>
          <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl p-3">
            <div className="text-[11px] text-amber-300 font-semibold">Chậm duyệt</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {sharedScreenMetrics.overdueReview}
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5">Quá hạn người duyệt</div>
          </div>
          <div className="bg-slate-800/90 border border-emerald-500/40 rounded-xl p-3">
            <div className="text-[11px] text-emerald-300 font-semibold">Đã nghiệm thu</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {sharedScreenMetrics.completed}
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">Hoàn thành chính thức</div>
          </div>
        </div>
      </div>

      {/* KHÔNG GIAN PHÒNG HỌP 3D HOẶC CHẾ ĐỘ 2D THAY THẾ */}
      {renderMode === "3D" && webglSupported ? (
        <div
          className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl select-none cursor-grab active:cursor-grabbing"
          style={{ height: 540 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={1160}
            height={540}
            className="w-full h-full block"
          />

          {/* Màn hình trình chiếu lớn phía đầu bàn họp */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-teal-500/60 rounded-xl px-5 py-2.5 shadow-lg backdrop-blur-xs pointer-events-none text-center max-w-md">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
              MÀN HÌNH TRUNG TÂM — BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG
            </div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              Tiến độ chung: {sharedScreenMetrics.completed}/{sharedScreenMetrics.total} hoàn thành ({sharedScreenMetrics.completionRate}%) • {sharedScreenMetrics.pendingReview} chờ duyệt
            </div>
          </div>

          {/* Bảng tên & nút tương tác của từng nhân vật quanh bàn họp */}
          {projectedSeats.map(seat => {
            const leftPct = (seat.screenX / 1160) * 100
            const topPct = (seat.screenY / 540) * 100
            const isTopSide = seat.worldZ < -20
            return (
              <div
                key={seat.userId}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex:
                    hoveredUserId === seat.userId
                      ? 2000
                      : Math.round(1000 - seat.depth),
                }}
                onMouseEnter={() => setHoveredUserId(seat.userId)}
                onMouseLeave={() => setHoveredUserId(null)}
                className="absolute group"
              >
                {/* Vùng click nhân vật */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onSelectMember(seat.userId)
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center focus:outline-none cursor-pointer"
                  title={`Xem hồ sơ & công việc của ${seat.fullName}`}
                >
                  <span className="sr-only">{seat.fullName}</span>
                </button>

                {/* Bảng tên (Nameplate): Hàng ghế trên đặt bảng tên phía trên đầu, hàng ghế dưới đặt phía dưới để không chồng lấp */}
                <div
                  className={`${
                    isTopSide
                      ? "bottom-full mb-2"
                      : "top-full mt-1"
                  } absolute left-1/2 -translate-x-1/2 bg-slate-900/95 hover:bg-teal-950/95 border border-slate-700 group-hover:border-teal-200 rounded-xl px-2.5 py-1.5 shadow-md text-center min-w-[148px] transition-all`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {seat.isCoordinator && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Điều phối nhóm" />
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onSelectMember(seat.userId)
                      }}
                      className="text-[11px] font-extrabold text-white hover:text-teal-700 truncate max-w-[120px] cursor-pointer"
                    >
                      {seat.fullName}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate">
                    {seat.roleLabel} • {seat.groupName}
                  </div>

                  {/* Chỉ số công việc thực tế từ DB */}
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold">
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                      {seat.activeCount} đang làm
                    </span>
                    {seat.overdueCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300">
                        {seat.overdueCount} trễ
                      </span>
                    )}
                  </div>

                  {/* Thao tác nhanh khi rê chuột hoặc chọn */}
                  <div className="mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onSelectMember(seat.userId)
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 cursor-pointer"
                    >
                      Hồ sơ
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onQuickAssignMember(seat.userId, seat.groupId)
                      }}
                      className="px-2 py-0.5 rounded bg-teal-500 hover:bg-teal-500 text-[10px] font-bold text-white cursor-pointer"
                    >
                      + Giao việc
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            Mẹo: Kéo chuột trên mặt sàn để xoay góc nhìn 3D • Nhấn vào nhân vật để mở Bảng thông tin thành viên & công việc.
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 2D / DANH SÁCH THAY THẾ */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-800" />
                Sơ đồ Bàn họp 2D & Danh sách Thành viên Điều hành ({seatMembers.length})
              </h3>
              <p className="text-xs text-slate-500">
                Chế độ 2D / Danh sách thay thế tối ưu tốc độ — chọn thành viên để mở chi tiết hoặc giao việc ngay.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seatMembers.map(seat => (
              <div
                key={seat.userId}
                className="rounded-xl border border-slate-200 p-4 hover:border-teal-200 transition-all bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full text-white font-black text-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: seat.avatarColor }}
                    >
                      {seat.fullName.trim().split(" ").pop()?.slice(0, 1) || "U"}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                        {seat.fullName}
                        {seat.isCoordinator && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Điều phối
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {seat.roleLabel} • {seat.groupName}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-slate-200/60">
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <div className="text-xs font-extrabold text-slate-800">{seat.totalCount}</div>
                    <div className="text-[10px] text-slate-500">Tổng</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <div className="text-xs font-extrabold text-sky-700">{seat.activeCount}</div>
                    <div className="text-[10px] text-slate-500">Đang làm</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <div className="text-xs font-extrabold text-teal-800">{seat.pendingReviewCount}</div>
                    <div className="text-[10px] text-slate-500">Chờ duyệt</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <div className="text-xs font-extrabold text-rose-700">{seat.overdueCount}</div>
                    <div className="text-[10px] text-slate-500">Quá hạn</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => onSelectMember(seat.userId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem hồ sơ & việc
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAssignMember(seat.userId, seat.groupId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-500 text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Giao việc ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
