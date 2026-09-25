// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getThkqAnalyticsData } from "@/lib/ktdbcl/thkqStatisticalEngine"

const ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KHAO_THI",
  "TB_DHCM",
  "GDCS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "TO_TRUONG",
  "TEACHER"
]

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }

    const userRole = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ALLOWED_ROLES.includes(userRole)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền truy cập dữ liệu phân tích THKQ" }, { status: 403 })
    }

    const url = new URL(req.url)
    const academicYearId = url.searchParams.get("academicYearId") || ""
    const evaluationPeriod = url.searchParams.get("evaluationPeriod") || "ALL"
    const level = url.searchParams.get("level") || "ALL"
    const grade = url.searchParams.get("grade") || "ALL"
    const subjectId = url.searchParams.get("subjectId") || "ALL"
    const campusId = url.searchParams.get("campusId") || "ALL"
    const scoreRange = url.searchParams.get("scoreRange") || "ALL"
    const targetType = url.searchParams.get("targetType") || "ALL"
    const searchKeyword = url.searchParams.get("searchKeyword") || ""

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu tham số academicYearId" }, { status: 400 })
    }

    const result = await getThkqAnalyticsData({
      academicYearId,
      evaluationPeriod,
      level,
      grade,
      subjectId,
      campusId,
      scoreRange,
      targetType,
      searchKeyword
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error("Lỗi API thkq-analytics:", error)
    return NextResponse.json({ success: false, error: error.message || "Lỗi máy chủ nội bộ" }, { status: 500 })
  }
}
