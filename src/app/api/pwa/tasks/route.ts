import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { aggregateTeacherTasks, resolveTeacherAssignmentProfile } from "@/services/taskEngine"
import { SourceModule, TaskStatus } from "@/services/taskEngine/types"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(req.url)

    const filter = (url.searchParams.get("filter") || url.searchParams.get("status") || "ALL").toUpperCase()
    const moduleFilter = (url.searchParams.get("module") || "ALL") as SourceModule | "ALL"
    const campusId = url.searchParams.get("campusId") || "ALL"
    const classId = url.searchParams.get("classId") || "ALL"
    const subjectId = url.searchParams.get("subjectId") || "ALL"
    const timeRange = (url.searchParams.get("timeRange") || "ALL") as "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL"
    const search = (url.searchParams.get("search") || "").trim()

    const [profile, { tasks, counts }] = await Promise.all([
      resolveTeacherAssignmentProfile(userId),
      aggregateTeacherTasks(userId, {
        campusId,
        classId,
        subjectId,
        module: moduleFilter,
        status: filter as TaskStatus | "ALL" | "TODAY" | "OVERDUE" | "WAITING" | "COMPLETED",
        timeRange,
        search,
        includeCompleted: filter === "COMPLETED",
      }),
    ])

    return NextResponse.json(
      {
        success: true,
        updatedAt: new Date().toISOString(),
        tasks,
        counts,
        filterOptions: profile
          ? {
              campuses: profile.campuses,
              classes: [
                ...profile.homeroomClasses.map((c) => ({ id: c.id, name: `${c.className} (Chủ nhiệm)` })),
                ...profile.teachingAssignments.map((a) => ({ id: a.classId, name: `${a.className} (${a.subjectName})` })),
              ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
              subjects: [
                ...profile.teachingAssignments.map((a) => ({ id: a.subjectId, name: a.subjectName })),
                ...profile.ctqtAssignments.map((c) => ({ id: c.subjectId, name: `${c.subjectName} (CTQT)` })),
                ...profile.specialAssignments.map((s) => ({ id: s.subjectCode, name: s.subjectName })),
              ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
            }
          : { campuses: [], classes: [], subjects: [] },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("[API /api/pwa/tasks GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { taskId, action } = body

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 })
    }

    if (taskId.startsWith("work-")) {
      const realId = taskId.replace(/^work-(task-)?/, "")
      await prisma.workTask.updateMany({
        where: { id: realId, assigneeId: session.user.id },
        data: {
          status: action === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          completedAt: action === "COMPLETE" ? new Date() : null,
        },
      })
      return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái nhiệm vụ" })
    }

    return NextResponse.json({ success: true, message: "Yêu cầu đã được ghi nhận" })
  } catch (error) {
    console.error("[API /api/pwa/tasks PATCH Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
