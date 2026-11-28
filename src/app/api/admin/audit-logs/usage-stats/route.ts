import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"

const EXCLUDED_USER_ROLES = ["PARENT", "STUDENT", "HOC_SINH", "PHU_HUYNH"]

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILED: "Đăng nhập thất bại",
  LOGIN_RATE_LIMITED: "Tạm khóa do thử sai nhiều lần",
  LOGOUT: "Đăng xuất hệ thống",
  SCORE_UPDATE: "Cập nhật điểm / Đánh giá",
  DELETE_AUDIT_LOGS: "Dọn dẹp nhật ký hệ thống",
  OBSERVATION_ASSIGNED_CREATE: "Phân công dự giờ",
  STUDENT_TRANSFER: "Chuyển lớp / Chuyển cơ sở HS",
  USER_CREATE: "Tạo tài khoản nhân sự",
  USER_UPDATE: "Cập nhật tài khoản nhân sự",
  USER_DELETE: "Xóa tài khoản nhân sự",
  PASSWORD_RESET: "Đặt lại mật khẩu",
  PASSWORD_CHANGE: "Đổi mật khẩu",
}

function getVnDateKey(date: Date): string {
  // Convert to UTC+7
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const y = vn.getUTCFullYear()
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0")
  const d = String(vn.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getVnHour(date: Date): number {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return vn.getUTCHours()
}

function getRangeStartDate(range: string): Date | null {
  const now = new Date()
  if (range === "all") return null

  if (range === "today") {
    // Start of today in UTC+7
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const startVnUtc = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) - 7 * 60 * 60 * 1000
    return new Date(startVnUtc)
  }

  const daysMap: Record<string, number> = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "90d": 90,
  }
  const days = daysMap[range] || 30
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  // Normalize to start of that day in VN time
  const vnCutoff = new Date(cutoff.getTime() + 7 * 60 * 60 * 1000)
  const startVnUtc = Date.UTC(vnCutoff.getUTCFullYear(), vnCutoff.getUTCMonth(), vnCutoff.getUTCDate()) - 7 * 60 * 60 * 1000
  return new Date(startVnUtc)
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session.userId) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để tiếp tục" }, { status: 401 })
  }

  const upperRole = (session.role || "").toUpperCase().trim()
  if (EXCLUDED_USER_ROLES.includes(upperRole)) {
    return NextResponse.json({ error: "Không có quyền truy cập thống kê hệ thống" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30d"
    const roleFilter = searchParams.get("role") || ""
    const campusFilter = searchParams.get("campusId") || ""

    const startDate = getRangeStartDate(range)

    // Fetch reference data in parallel
    const [roles, campuses, activeUsers] = await Promise.all([
      prisma.role.findMany({
        select: { code: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.campus.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, campusCode: true, campusName: true },
        orderBy: { campusCode: "asc" },
      }),
      prisma.user.findMany({
        where: {
          status: "ACTIVE",
          role: { notIn: EXCLUDED_USER_ROLES },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          teacher: {
            select: {
              campusId: true,
              teacherCode: true,
            },
          },
          campusAssignments: {
            select: {
              campusId: true,
            },
          },
        },
      }),
    ])

    const roleMap = new Map<string, string>(roles.map((r) => [r.code, r.name]))
    const campusMap = new Map<string, { code: string; name: string }>(
      campuses.map((c) => [c.id, { code: c.campusCode, name: c.campusName }])
    )

    // Build user lookup maps and apply role/campus filters to eligible users
    const userById = new Map<
      string,
      {
        id: string
        email: string
        fullName: string
        role: string
        campusIds: string[]
        campusLabel: string
      }
    >()
    const userByEmail = new Map<string, string>()

    const filteredUsers: Array<{
      id: string
      email: string
      fullName: string
      role: string
      campusIds: string[]
      campusLabel: string
    }> = []

    for (const u of activeUsers) {
      const cIds = new Set<string>()
      if (u.teacher?.campusId) cIds.add(u.teacher.campusId)
      for (const ca of u.campusAssignments) {
        if (ca.campusId) cIds.add(ca.campusId)
      }
      const campusIdArr = Array.from(cIds)
      const campusNames = campusIdArr
        .map((id) => campusMap.get(id)?.code || campusMap.get(id)?.name)
        .filter(Boolean)

      const entry = {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        campusIds: campusIdArr,
        campusLabel: campusNames.length > 0 ? campusNames.join(", ") : "Toàn hệ thống",
      }

      userById.set(u.id, entry)
      if (u.email) userByEmail.set(u.email.toLowerCase(), u.id)

      if (roleFilter && u.role !== roleFilter) continue
      if (campusFilter && !campusIdArr.includes(campusFilter)) continue
      filteredUsers.push(entry)
    }

    const filteredUserIds = new Set(filteredUsers.map((u) => u.id))
    const filteredUserEmails = new Set(filteredUsers.map((u) => u.email.toLowerCase()))

    // Query AuditLogs within date range
    const logWhere: {
      createdAt?: { gte: Date }
      OR?: Array<{ userId?: { in: string[] }; userEmail?: { in: string[] } }>
    } = {}
    if (startDate) {
      logWhere.createdAt = { gte: startDate }
    }

    if (roleFilter || campusFilter) {
      const idArr = Array.from(filteredUserIds)
      const emailArr = Array.from(filteredUserEmails)
      if (idArr.length === 0 && emailArr.length === 0) {
        return NextResponse.json({
          range,
          summary: {
            totalEvents: 0,
            loginSuccess: 0,
            loginFailed: 0,
            dataActions: 0,
            activeUsersCount: 0,
            totalStaffUsers: 0,
            adoptionRate: 0,
            inactiveUsersCount: 0,
            loginSuccessRate: 0,
          },
          dailyTrend: [],
          hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            label: `${String(h).padStart(2, "0")}h`,
            total: 0,
            logins: 0,
            actions: 0,
          })),
          byRole: [],
          byAction: [],
          topUsers: [],
          inactiveUsers: [],
          campuses,
          roles,
        })
      }
      logWhere.OR = [
        ...(idArr.length > 0 ? [{ userId: { in: idArr } }] : []),
        ...(emailArr.length > 0 ? [{ userEmail: { in: emailArr } }] : []),
      ]
    }

    const logs = await prisma.auditLog.findMany({
      where: logWhere,
      select: {
        id: true,
        userId: true,
        userEmail: true,
        action: true,
        targetTable: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Aggregation structures
    let totalEvents = 0
    let loginSuccess = 0
    let loginFailed = 0
    let dataActions = 0

    const activeUserIdSet = new Set<string>()
    const dailyMap = new Map<
      string,
      {
        date: string
        logins: number
        failedLogins: number
        actions: number
        total: number
        uniqueUsers: Set<string>
      }
    >()

    // Pre-fill daily buckets for finite ranges (7d, 14d, 30d, 90d, today)
    if (startDate) {
      const todayKey = getVnDateKey(new Date())
      const cursor = new Date(startDate)
      let guard = 0
      while (guard < 120) {
        const key = getVnDateKey(cursor)
        dailyMap.set(key, {
          date: key,
          logins: 0,
          failedLogins: 0,
          actions: 0,
          total: 0,
          uniqueUsers: new Set<string>(),
        })
        if (key >= todayKey) break
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        guard++
      }
    }

    const hourlyBuckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, "0")}h`,
      total: 0,
      logins: 0,
      actions: 0,
    }))

    const roleStatsMap = new Map<
      string,
      {
        roleCode: string
        roleName: string
        totalUsers: number
        activeUserIds: Set<string>
        logins: number
        dataActions: number
        totalEvents: number
      }
    >()

    // Seed role stats with total eligible users per role
    for (const u of filteredUsers) {
      const existing = roleStatsMap.get(u.role)
      if (existing) {
        existing.totalUsers += 1
      } else {
        roleStatsMap.set(u.role, {
          roleCode: u.role,
          roleName: roleMap.get(u.role) || u.role,
          totalUsers: 1,
          activeUserIds: new Set<string>(),
          logins: 0,
          dataActions: 0,
          totalEvents: 0,
        })
      }
    }

    const actionStatsMap = new Map<
      string,
      {
        action: string
        label: string
        count: number
        uniqueUsers: Set<string>
      }
    >()

    const userStatsMap = new Map<
      string,
      {
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
      }
    >()

    for (const log of logs) {
      totalEvents += 1
      const action = log.action || "UNKNOWN"
      const isLoginSuccess = action === "LOGIN_SUCCESS"
      const isLoginFailed = action === "LOGIN_FAILED" || action === "LOGIN_RATE_LIMITED"
      const isLogout = action === "LOGOUT"
      const isDataAction = !isLoginSuccess && !isLoginFailed && !isLogout

      if (isLoginSuccess) loginSuccess += 1
      else if (isLoginFailed) loginFailed += 1
      else if (isDataAction) dataActions += 1

      // Resolve user
      let resolvedUser = log.userId && log.userId !== "N/A" && log.userId !== "SYSTEM" ? userById.get(log.userId) : undefined
      if (!resolvedUser && log.userEmail) {
        const mappedId = userByEmail.get(log.userEmail.toLowerCase())
        if (mappedId) resolvedUser = userById.get(mappedId)
      }

      const effectiveUserId = resolvedUser?.id || (log.userId && log.userId !== "N/A" && log.userId !== "SYSTEM" ? log.userId : "")
      const effectiveRoleCode = resolvedUser?.role || (log.userEmail === "admin@skyline.edu" ? "ADMIN" : "SYSTEM")
      const effectiveRoleName =
        effectiveRoleCode === "SYSTEM"
          ? "Hệ thống / Khách"
          : roleMap.get(effectiveRoleCode) || effectiveRoleCode

      if (effectiveUserId && !isLoginFailed) {
        activeUserIdSet.add(effectiveUserId)
      }

      // Daily bucket
      const dateKey = getVnDateKey(log.createdAt)
      let dayBucket = dailyMap.get(dateKey)
      if (!dayBucket) {
        dayBucket = {
          date: dateKey,
          logins: 0,
          failedLogins: 0,
          actions: 0,
          total: 0,
          uniqueUsers: new Set<string>(),
        }
        dailyMap.set(dateKey, dayBucket)
      }
      dayBucket.total += 1
      if (isLoginSuccess) dayBucket.logins += 1
      else if (isLoginFailed) dayBucket.failedLogins += 1
      else if (isDataAction) dayBucket.actions += 1
      if (effectiveUserId && !isLoginFailed) dayBucket.uniqueUsers.add(effectiveUserId)

      // Hourly bucket
      const hour = getVnHour(log.createdAt)
      hourlyBuckets[hour].total += 1
      if (isLoginSuccess) hourlyBuckets[hour].logins += 1
      else if (isDataAction) hourlyBuckets[hour].actions += 1

      // Role stats
      let rStat = roleStatsMap.get(effectiveRoleCode)
      if (!rStat) {
        rStat = {
          roleCode: effectiveRoleCode,
          roleName: effectiveRoleName,
          totalUsers: 0,
          activeUserIds: new Set<string>(),
          logins: 0,
          dataActions: 0,
          totalEvents: 0,
        }
        roleStatsMap.set(effectiveRoleCode, rStat)
      }
      rStat.totalEvents += 1
      if (isLoginSuccess) rStat.logins += 1
      if (isDataAction) rStat.dataActions += 1
      if (effectiveUserId && !isLoginFailed) rStat.activeUserIds.add(effectiveUserId)

      // Action stats
      let aStat = actionStatsMap.get(action)
      if (!aStat) {
        aStat = {
          action,
          label: ACTION_LABELS[action] || action,
          count: 0,
          uniqueUsers: new Set<string>(),
        }
        actionStatsMap.set(action, aStat)
      }
      aStat.count += 1
      if (effectiveUserId) aStat.uniqueUsers.add(effectiveUserId)

      // Per-user stats (only for identifiable accounts)
      if (effectiveUserId) {
        const existingUserStat = userStatsMap.get(effectiveUserId)
        if (!existingUserStat) {
          userStatsMap.set(effectiveUserId, {
            userId: effectiveUserId,
            email: resolvedUser?.email || log.userEmail || "—",
            fullName: resolvedUser?.fullName || (log.userEmail === "admin@skyline.edu" ? "System Admin" : "—"),
            roleCode: effectiveRoleCode,
            roleName: effectiveRoleName,
            campusLabel: resolvedUser?.campusLabel || "Toàn hệ thống",
            logins: isLoginSuccess ? 1 : 0,
            failedLogins: isLoginFailed ? 1 : 0,
            dataActions: isDataAction ? 1 : 0,
            totalEvents: 1,
            lastActiveAt: log.createdAt.toISOString(),
          })
        } else {
          existingUserStat.totalEvents += 1
          if (isLoginSuccess) existingUserStat.logins += 1
          if (isLoginFailed) existingUserStat.failedLogins += 1
          if (isDataAction) existingUserStat.dataActions += 1
          // logs are ordered desc, so first seen is latest
        }
      }
    }

    // Active staff users (intersection with filteredUsers so adoptionRate never exceeds 100%)
    const activeFilteredStaffCount = filteredUsers.filter((u) => activeUserIdSet.has(u.id)).length
    const totalStaffUsers = filteredUsers.length
    const adoptionRate = totalStaffUsers > 0 ? Math.round((activeFilteredStaffCount / totalStaffUsers) * 1000) / 10 : 0

    const inactiveUsers = filteredUsers
      .filter((u) => !activeUserIdSet.has(u.id))
      .map((u) => ({
        userId: u.id,
        email: u.email,
        fullName: u.fullName,
        roleCode: u.role,
        roleName: roleMap.get(u.role) || u.role,
        campusLabel: u.campusLabel,
      }))
      .sort((a, b) => a.roleName.localeCompare(b.roleName, "vi") || a.fullName.localeCompare(b.fullName, "vi"))

    const dailyTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
        logins: d.logins,
        failedLogins: d.failedLogins,
        actions: d.actions,
        total: d.total,
        uniqueUsers: d.uniqueUsers.size,
      }))

    const byRole = Array.from(roleStatsMap.values())
      .map((r) => ({
        roleCode: r.roleCode,
        roleName: r.roleName,
        totalUsers: r.totalUsers,
        activeUsers: r.activeUserIds.size,
        adoptionRate: r.totalUsers > 0 ? Math.min(100, Math.round((r.activeUserIds.size / r.totalUsers) * 1000) / 10) : 0,
        logins: r.logins,
        dataActions: r.dataActions,
        totalEvents: r.totalEvents,
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents || b.totalUsers - a.totalUsers)

    const byAction = Array.from(actionStatsMap.values())
      .map((a) => ({
        action: a.action,
        label: a.label,
        count: a.count,
        uniqueUsers: a.uniqueUsers.size,
        share: totalEvents > 0 ? Math.round((a.count / totalEvents) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const topUsers = Array.from(userStatsMap.values()).sort(
      (a, b) => b.totalEvents - a.totalEvents || b.logins - a.logins
    )

    const totalLoginAttempts = loginSuccess + loginFailed
    const loginSuccessRate =
      totalLoginAttempts > 0 ? Math.round((loginSuccess / totalLoginAttempts) * 1000) / 10 : 100

    return NextResponse.json({
      range,
      summary: {
        totalEvents,
        loginSuccess,
        loginFailed,
        dataActions,
        activeUsersCount: activeFilteredStaffCount,
        totalStaffUsers,
        adoptionRate,
        inactiveUsersCount: inactiveUsers.length,
        loginSuccessRate,
      },
      dailyTrend,
      hourlyDistribution: hourlyBuckets,
      byRole,
      byAction,
      topUsers,
      inactiveUsers,
      campuses,
      roles,
    })
  } catch (error: unknown) {
    console.error("Error computing audit log usage stats:", error)
    const message = error instanceof Error ? error.message : "Lỗi không xác định"
    return NextResponse.json(
      { error: "Không thể tổng hợp thống kê sử dụng: " + message },
      { status: 500 }
    )
  }
}
