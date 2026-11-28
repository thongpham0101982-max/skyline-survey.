// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resolveThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"
import {
  filterStudentsForDrilldown,
  generatePeriodicTestReport,
  ThkqGroupByMode,
  ThkqPeriodicFilterInput,
  ThkqRateMode,
  ThkqScoreScaleMode,
} from "@/lib/ktdbcl/thkqPeriodicReportEngine"

export const dynamic = "force-dynamic"

function extractFilterInputFromSearchParams(sp: URLSearchParams): ThkqPeriodicFilterInput {
  return {
    academicYearId: sp.get("academicYearId") || "",
    level: sp.get("level") || "TIEU_HOC",
    evaluationPeriod: sp.get("evaluationPeriod") || "GK1",
    subjectId: sp.get("subjectId") || "",
    testColumnKey: sp.get("testColumnKey") || "OFFICIAL",
    campusId: sp.get("campusId") || "ALL",
    educationSystem: sp.get("educationSystem") || "ALL",
    grade: sp.get("grade") || "ALL",
    classId: sp.get("classId") || "ALL",
    ethnicity: sp.get("ethnicity") || "ALL",
    groupBy: (sp.get("groupBy") as ThkqGroupByMode) || "GRADE_CLASS",
    rateMode: (sp.get("rateMode") as ThkqRateMode) || "SSM_ANALYSIS",
    scoreScaleMode: (sp.get("scoreScaleMode") as ThkqScoreScaleMode) || "AUTO",
    includeZeroScore: sp.get("includeZeroScore") === "true",
    thresholdScore: sp.get("thresholdScore") ? Number(sp.get("thresholdScore")) : 5.0,
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const sp = url.searchParams
    const filters = extractFilterInputFromSearchParams(sp)

    if (!filters.academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      })
      filters.academicYearId = activeYear?.id || ""
    }

    if (!filters.academicYearId) {
      return NextResponse.json(
        { success: false, error: "Thiếu tham số Năm học (academicYearId)" },
        { status: 400 }
      )
    }

    const userId = (session.user as any)?.id || ""
    const userRole = (session.user as any)?.role || ""
    const accessScope = await resolveThkqAccessScope(userId, userRole, filters.academicYearId)

    if (!accessScope.canViewReport) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản của bạn không có quyền xem Báo cáo Phân tích THKQ",
        },
        { status: 403 }
      )
    }

    const report = await generatePeriodicTestReport(filters, accessScope)

    // Nếu truy vấn danh sách học sinh cấu thành chỉ tiêu (Drill-down)
    const drilldownRowKey = sp.get("drilldownRowKey")
    const drilldownMetric = sp.get("drilldownMetric") as any
    const drilldownBucketId = sp.get("drilldownBucketId") || undefined
    const expectedSnapshotVersion = sp.get("expectedSnapshotVersion") || ""

    if (drilldownRowKey && drilldownMetric) {
      if (!accessScope.canViewDetail) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Tài khoản không có quyền xem danh sách học sinh chi tiết.",
          },
          { status: 403 }
        )
      }

      if (expectedSnapshotVersion && expectedSnapshotVersion !== report.snapshotVersion) {
        return NextResponse.json(
          {
            success: false,
            staleSnapshot: true,
            currentSnapshotVersion: report.snapshotVersion,
            error:
              "Dữ liệu báo cáo đã thay đổi kể từ lần xem trước. Vui lòng tải lại báo cáo để xem danh sách học sinh khớp phiên bản mới nhất.",
          },
          { status: 409 }
        )
      }

      const matchedStudents = filterStudentsForDrilldown({
        students: report._reconciledStudents || [],
        rowKey: drilldownRowKey,
        metricType: drilldownMetric,
        bucketId: drilldownBucketId,
      })

      return NextResponse.json({
        success: true,
        snapshotVersion: report.snapshotVersion,
        rowKey: drilldownRowKey,
        metricType: drilldownMetric,
        bucketId: drilldownBucketId || null,
        totalMatched: matchedStudents.length,
        students: matchedStudents,
      })
    }

    const { _reconciledStudents, ...publicReportData } = report

    return NextResponse.json({
      success: true,
      data: publicReportData,
    })
  } catch (error: any) {
    console.error("Lỗi API GET /api/admin/ktdbcl/thkq-periodic-report:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      filters: rawFilters = {},
      expectedSnapshotVersion = "",
      includeStudentDetails = false,
      includeProgressColumns = false,
    } = body

    const filters: ThkqPeriodicFilterInput = {
      academicYearId: rawFilters.academicYearId || "",
      level: rawFilters.level || "TIEU_HOC",
      evaluationPeriod: rawFilters.evaluationPeriod || "GK1",
      subjectId: rawFilters.subjectId || "",
      testColumnKey: rawFilters.testColumnKey || "OFFICIAL",
      campusId: rawFilters.campusId || "ALL",
      educationSystem: rawFilters.educationSystem || "ALL",
      grade: rawFilters.grade || "ALL",
      classId: rawFilters.classId || "ALL",
      ethnicity: rawFilters.ethnicity || "ALL",
      groupBy: rawFilters.groupBy || "GRADE_CLASS",
      rateMode: rawFilters.rateMode || "SSM_ANALYSIS",
      scoreScaleMode: rawFilters.scoreScaleMode || "AUTO",
      includeZeroScore: Boolean(rawFilters.includeZeroScore),
      thresholdScore: rawFilters.thresholdScore ? Number(rawFilters.thresholdScore) : 5.0,
    }

    const userId = (session.user as any)?.id || ""
    const userEmail = (session.user as any)?.email || "user@skylineschool.edu.vn"
    const userRole = (session.user as any)?.role || ""

    const accessScope = await resolveThkqAccessScope(userId, userRole, filters.academicYearId)
    if (!accessScope.canExportSummary) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản của bạn không có quyền xuất Excel báo cáo này.",
        },
        { status: 403 }
      )
    }

    if (includeStudentDetails && !accessScope.canExportDetail) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản của bạn không có quyền xuất danh sách học sinh chi tiết.",
        },
        { status: 403 }
      )
    }

    const report = await generatePeriodicTestReport(filters, accessScope)

    // Kiểm tra đồng bộ phiên bản dữ liệu giữa màn hình đã xem và dữ liệu hiện tại trước khi xuất
    if (expectedSnapshotVersion && expectedSnapshotVersion !== report.snapshotVersion) {
      return NextResponse.json(
        {
          success: false,
          staleSnapshot: true,
          currentSnapshotVersion: report.snapshotVersion,
          error:
            "Dữ liệu điểm hoặc sĩ số đã thay đổi sau khi xem và không thể xuất phiên bản cũ. Vui lòng nhấn 'Xem báo cáo' để tải lại dữ liệu mới nhất trước khi xuất Excel.",
        },
        { status: 409 }
      )
    }

    // Ghi nhật ký xuất báo cáo vào AuditLog theo cơ chế sẵn có của SSM
    if (prisma.auditLog?.create) {
      await prisma.auditLog
        .create({
          data: {
            userId: userId || "SYSTEM",
            userEmail,
            action: "EXPORT_THKQ_PERIODIC_REPORT",
            targetTable: "SubjectGradeEntry",
            targetId: `${filters.academicYearId}_${filters.evaluationPeriod}_${report.appliedFilters.subjectId}`,
            oldValues: null,
            newValues: JSON.stringify({
              snapshotVersion: report.snapshotVersion,
              appliedFilters: report.appliedFilters,
              includeStudentDetails: Boolean(includeStudentDetails && accessScope.canExportDetail),
              includeProgressColumns: Boolean(includeProgressColumns),
              totalStudents: report.totalRow.tshs,
              testedStudents: report.totalRow.tshsKt,
            }),
          },
        })
        .catch(() => null)
    }

    const { _reconciledStudents, ...publicReportData } = report

    return NextResponse.json({
      success: true,
      data: publicReportData,
      detailedStudents:
        includeStudentDetails && accessScope.canExportDetail ? _reconciledStudents : [],
    })
  } catch (error: any) {
    console.error("Lỗi API POST /api/admin/ktdbcl/thkq-periodic-report:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ khi chuẩn bị xuất Excel" },
      { status: 500 }
    )
  }
}
