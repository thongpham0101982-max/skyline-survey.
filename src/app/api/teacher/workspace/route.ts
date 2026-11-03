import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  aggregateTeacherTasks,
  resolveTeacherAssignmentProfile,
  calculateTeacherProgressAndKPI,
  evaluateAndDispatchTeacherReminders,
  getTeacherReminderHistory,
  answerTeacherTaskAssistantQuery,
} from "@/services/taskEngine"
import { SourceModule, TaskStatus } from "@/services/taskEngine/types"

export const dynamic = "force-dynamic"

// Cache ngắn hạn 15 giây trong bộ nhớ để tối ưu hiệu năng khi chuyển tab Dashboard / Sổ Giáo Viên
const workspaceCache = new Map<string, { expiresAt: number; payload: any }>()
const CACHE_TTL_MS = 15_000

const ADMIN_INSPECT_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "BAN_DHCM",
  "TB_DHCM",
  "KT_DBCL",
  "BGH",
  "GDCS",
  "GĐCS",
])

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionUserId = session.user.id
    const sessionRole = ((session.user as any)?.role || "TEACHER").toUpperCase().trim()

    const url = new URL(req.url)
    const requestedUserId = url.searchParams.get("teacherUserId")
    const forceRefresh = url.searchParams.get("refresh") === "true"

    // Kiểm soát RBAC chặt chẽ: Giáo viên chỉ được truy xuất dữ liệu thuộc phạm vi phân công của mình
    let targetUserId = sessionUserId
    if (requestedUserId && requestedUserId !== sessionUserId) {
      if (!ADMIN_INSPECT_ROLES.has(sessionRole)) {
        return NextResponse.json(
          { error: "Forbidden: Bạn không có quyền truy cập Sổ Giáo viên của nhân sự khác." },
          { status: 403 }
        )
      }
      targetUserId = requestedUserId
    }

    const cookieHeader = req.headers.get("cookie") || ""
    const cookieYearMatch = cookieHeader.match(/(?:^|;\s*)selectedAcademicYear=([^;]+)/)
    const cookieAcademicYearId = cookieYearMatch ? decodeURIComponent(cookieYearMatch[1]) : undefined

    const academicYearId = url.searchParams.get("academicYearId") || cookieAcademicYearId || undefined
    const campusId = url.searchParams.get("campusId") || "ALL"
    const classId = url.searchParams.get("classId") || "ALL"
    const subjectId = url.searchParams.get("subjectId") || "ALL"
    const moduleFilter = (url.searchParams.get("module") || "ALL") as SourceModule | "ALL"
    const statusFilter = (url.searchParams.get("status") || "ALL") as
      | TaskStatus
      | "ALL"
      | "TODAY"
      | "OVERDUE"
      | "WAITING"
      | "COMPLETED"
    const timeRange = (url.searchParams.get("timeRange") || "ALL") as
      | "TODAY"
      | "THIS_WEEK"
      | "THIS_MONTH"
      | "ALL"
    const search = (url.searchParams.get("search") || "").trim()

    const cacheKey = `${targetUserId}::${academicYearId || "active"}::${campusId}::${classId}::${subjectId}::${moduleFilter}::${statusFilter}::${timeRange}::${search}`

    if (!forceRefresh) {
      const cached = workspaceCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(cached.payload)
      }
    }

    const profile = await resolveTeacherAssignmentProfile(targetUserId, academicYearId)
    if (!profile) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ giáo viên tương ứng với tài khoản." },
        { status: 404 }
      )
    }

    const [{ tasks, counts }, allTasksResult, reminderHistory] = await Promise.all([
      aggregateTeacherTasks(profile.userId, {
        academicYearId: profile.academicYearId,
        campusId,
        classId,
        subjectId,
        module: moduleFilter,
        status: statusFilter,
        timeRange,
        search,
        includeCompleted: statusFilter === "COMPLETED",
      }),
      aggregateTeacherTasks(profile.userId, {
        academicYearId: profile.academicYearId,
        includeCompleted: true,
      }),
      getTeacherReminderHistory(profile.userId, 10),
    ])

    const progressAndKPI = await calculateTeacherProgressAndKPI(profile, allTasksResult.tasks)

    // Tự động kích hoạt kiểm tra nhắc việc nền (với chống trùng lặp 12h) nếu có việc quá hạn
    if (counts.overdue > 0) {
      evaluateAndDispatchTeacherReminders(profile.userId, {
        enableEmailChannel: false,
        cooldownHours: 12,
      }).catch(() => null)
    }

    const priorityIssues = allTasksResult.tasks
      .filter((t) => t.status === "OVERDUE" || t.priority === "URGENT" || t.priority === "HIGH")
      .slice(0, 6)

    const payload = {
      success: true,
      updatedAt: new Date().toISOString(),
      profile,
      counts,
      tasks,
      allTasks: allTasksResult.tasks,
      priorityIssues,
      progressAndKPI,
      reminderHistory,
      filterOptions: {
        campuses: profile.campuses,
        classes: [
          ...profile.homeroomClasses.map((c) => ({
            id: c.id,
            name: `${c.className} (Chủ nhiệm)`,
            campusId: c.campusId,
          })),
          ...profile.teachingAssignments.map((a) => ({
            id: a.classId,
            name: `${a.className} (${a.subjectName})`,
            campusId: a.campusId,
          })),
          ...profile.ctqtAssignments.map((c) => ({
            id: c.classId,
            name: `${c.className} (${c.subjectName} - CTQT)`,
            campusId: c.campusId,
          })),
          ...profile.specialAssignments.map((s) => ({
            id: s.classId,
            name: `${s.className} (${s.subjectName})`,
            campusId: s.campusId,
          })),
        ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
        subjects: [
          ...profile.teachingAssignments.map((a) => ({ id: a.subjectId, name: a.subjectName })),
          ...profile.ctqtAssignments.map((c) => ({ id: c.subjectId, name: `${c.subjectName} (CTQT)` })),
          ...profile.specialAssignments.map((s) => ({ id: s.subjectCode, name: s.subjectName })),
        ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
      },
    }

    workspaceCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    })

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: any) {
    console.error("[API /api/teacher/workspace GET Error]:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || "RUN_REMINDER_CHECK"

    if (action === "RUN_REMINDER_CHECK") {
      const result = await evaluateAndDispatchTeacherReminders(session.user.id, {
        enableEmailChannel: Boolean(body.enableEmailChannel),
        forceDispatch: Boolean(body.forceDispatch),
      })
      workspaceCache.clear()
      return NextResponse.json({
        success: true,
        result,
      })
    }

    if (action === "ASK_ASSISTANT") {
      const query = String(body.query || body.question || "Hôm nay tôi cần làm gì?").trim()
      const answer = await answerTeacherTaskAssistantQuery(session.user.id, query, {
        fallbackToGeneral: true,
      })
      return NextResponse.json({
        success: true,
        answer,
      })
    }

    if (action === "MARK_REMINDER_READ" && body.notificationId) {
      await prisma.notification.updateMany({
        where: { id: body.notificationId, userId: session.user.id },
        data: { isRead: true },
      })
      workspaceCache.clear()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (error: any) {
    console.error("[API /api/teacher/workspace POST Error]:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
