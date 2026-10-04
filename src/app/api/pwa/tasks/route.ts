import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { aggregateUserTasks } from "@/services/taskEngine"
import { SourceModule } from "@/services/taskEngine/types"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = (session.user as any)?.role || "TEACHER"

    const url = new URL(req.url)
    const filter = (url.searchParams.get("filter") || "ALL").toUpperCase()
    const moduleFilter = url.searchParams.get("module") as SourceModule | null
    const search = (url.searchParams.get("search") || "").toLowerCase().trim()

    const { tasks, counts } = await aggregateUserTasks(userId, userRole)

    let filtered = tasks

    // 1. Filter by Status/Time
    if (filter === "TODAY") {
      filtered = filtered.filter(t => t.deadline === "Hôm nay" || t.priority === "URGENT")
    } else if (filter === "OVERDUE") {
      filtered = filtered.filter(t => t.status === "OVERDUE" || t.priority === "URGENT")
    } else if (filter === "COMPLETED") {
      filtered = filtered.filter(t => t.status === "COMPLETED")
    }

    // 2. Filter by Module
    if (moduleFilter && moduleFilter !== ("ALL" as any)) {
      filtered = filtered.filter(t => t.sourceModule === moduleFilter)
    }

    // 3. Filter by Search Query
    if (search) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.description && t.description.toLowerCase().includes(search)) ||
        (t.metadata?.studentName && t.metadata.studentName.toLowerCase().includes(search)) ||
        (t.metadata?.className && t.metadata.className.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({
      success: true,
      tasks: filtered,
      counts
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate"
      }
    })
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

    // If it's a WorkTask, update in DB
    if (taskId.startsWith("work-task-")) {
      const realId = taskId.replace("work-task-", "")
      await prisma.workTask.updateMany({
        where: { id: realId, assignedToUserId: session.user.id },
        data: {
          progress: action === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          acceptanceStatus: action === "COMPLETE" ? "ACCEPTED" : "WAITING_CONFIRMATION"
        }
      })
      return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái nhiệm vụ" })
    }

    return NextResponse.json({ success: true, message: "Yêu cầu đã được ghi nhận" })
  } catch (error) {
    console.error("[API /api/pwa/tasks PATCH Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
