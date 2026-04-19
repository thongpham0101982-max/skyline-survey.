import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const pAny = prisma as any
    if (typeof pAny.assessmentConfig?.findMany !== "function") {
      return NextResponse.json({ categories: [] })
    }
    const categories = await pAny.assessmentConfig.findMany({
      orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
    })
    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error("GET /api/admin/input-assessments/categories error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, code, type, description, sortOrder, status, academicYearId } = body

    if (!name || !code) {
      return NextResponse.json({ error: "Mã và Tên là bắt buộc." }, { status: 400 })
    }

    const pAny = prisma as any
    if (typeof pAny.assessmentConfig?.create !== "function") {
      return NextResponse.json({ error: "AssessmentConfig model không khả dụng." }, { status: 500 })
    }

    const category = await pAny.assessmentConfig.create({
      data: {
        name,
        code,
        categoryType: type || "ACADEMIC",
        sortOrder: sortOrder ?? 0,
        status: status || "ACTIVE",
        ...(academicYearId ? { academicYearId } : {}),
      }
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/input-assessments/categories error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Mã danh mục đã tồn tại trong loại này." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
