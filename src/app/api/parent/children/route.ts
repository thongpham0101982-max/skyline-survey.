import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getParentChildren } from "@/lib/parentData"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId") || undefined

    const result = await getParentChildren(userId, academicYearId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET /api/parent/children error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
