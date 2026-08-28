import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAdminMetrics } from "@/services/dashboard"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    const allowedCampusIds = user?.campusIds || []

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")
    const academicYearId = searchParams.get("academicYearId") || undefined
    const campusId = searchParams.get("campusId") || undefined

    let effectiveCampusIds = allowedCampusIds
    if (campusId && campusId !== "ALL") {
      if (allowedCampusIds.length === 0 || allowedCampusIds.includes(campusId)) {
        effectiveCampusIds = [campusId]
      }
    }

    if (action === "getMetrics") {
      const metrics = await getAdminMetrics(academicYearId, effectiveCampusIds)
      return NextResponse.json(metrics)
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    console.error("Error in check-he-thong API:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
