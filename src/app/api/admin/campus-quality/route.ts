import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resolveDashboardContext } from "@/lib/campus-quality/baseContext"
import { getAcademicQualityTab } from "@/lib/campus-quality/engineAcademic"
import { getCampusQualityDrilldown } from "@/lib/campus-quality/engineDrilldown"
import {
  getAchievementsCertsTab,
  getAdmissionsMobilityTab,
  getObservationTab,
  getStudentSupportTab,
} from "@/lib/campus-quality/engineOperations"
import { getCampusQualityOverview } from "@/lib/campus-quality/engineOverview"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { CampusQualityFilterInput } from "@/lib/campus-quality/types"

export const dynamic = "force-dynamic"

function parseFilterInput(sp: URLSearchParams): CampusQualityFilterInput {
  return {
    academicYearId: sp.get("academicYearId") || undefined,
    campusId: sp.get("campusId") || undefined,
    level: sp.get("level") || "ALL",
    grade: sp.get("grade") || "ALL",
    classId: sp.get("classId") || "ALL",
    evaluationPeriod: sp.get("evaluationPeriod") || "GK1",
    month: sp.get("month") || undefined,
    subjectId: sp.get("subjectId") || "ALL",
    matchedCohortOnly: sp.get("matchedCohortOnly") === "true",
    publishedOnly: sp.get("publishedOnly") === "true",
    supportFilterMode: (sp.get("supportFilterMode") as any) || "BELOW_SKL",
    psychologyGroupBy: (sp.get("psychologyGroupBy") as any) || "CLASS",
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

    const sp = new URL(req.url).searchParams
    const view = sp.get("view") || "overview"
    const filterInput = parseFilterInput(sp)

    const userId = (session.user as any)?.id || ""
    const userRole = (session.user as any)?.role || ""
    const scope = await resolveCampusQualityScope(userId, userRole, filterInput.academicYearId)

    if (!scope.canViewReport) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản không có quyền truy cập Quản trị chất lượng theo cơ sở",
        },
        { status: 403 }
      )
    }

    const { context, forbiddenCampus } = await resolveDashboardContext(filterInput, scope)
    if (forbiddenCampus) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Bạn chỉ được phép xem dữ liệu thuộc cơ sở được phân quyền",
        },
        { status: 403 }
      )
    }

    const meta = {
      snapshotVersion: context.snapshotVersion,
      computedAt: context.computedAt,
      filters: {
        academicYearId: context.academicYearId,
        academicYearName: context.academicYearName,
        campusId: context.campusId,
        level: context.level,
        grade: context.grade,
        classId: context.classId,
        evaluationPeriod: context.evaluationPeriod,
        evaluationPeriodLabel: context.evaluationPeriodLabel,
        month: context.monthKey,
        monthLabel: context.monthLabel,
        subjectId: context.subjectId,
        publishedOnly: context.publishedOnly,
        matchedCohortOnly: context.matchedCohortOnly,
        supportFilterMode: context.supportFilterMode,
        psychologyGroupBy: context.psychologyGroupBy,
      },
      availableFilters: context.availableFilters,
      scope: {
        roleTier: scope.roleTier,
        roleDisplayLabel: scope.roleDisplayLabel,
        isCampusRestricted: scope.isCampusRestricted,
        canViewPsychology: scope.canViewPsychology,
        canExportExcel: scope.canExportExcel,
      },
    }

    if (view === "overview") {
      const data = await getCampusQualityOverview(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "academic") {
      const data = await getAcademicQualityTab(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "admissions") {
      const data = await getAdmissionsMobilityTab(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "achievements") {
      const data = await getAchievementsCertsTab(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "observation") {
      const data = await getObservationTab(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "support") {
      const data = await getStudentSupportTab(context, scope)
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    if (view === "drilldown") {
      const drilldownKey = sp.get("drilldownKey") || "ACADEMIC_BELOW_BENCHMARK"
      const extraClassId = sp.get("extraClassId") || undefined
      const extraSubjectId = sp.get("extraSubjectId") || undefined
      const data = await getCampusQualityDrilldown(context, scope, drilldownKey, {
        classId: extraClassId,
        subjectId: extraSubjectId,
      })
      return NextResponse.json({ success: true, view, ...meta, data })
    }

    return NextResponse.json({ success: false, error: `Invalid view: ${view}` }, { status: 400 })
  } catch (err: any) {
    console.error("[GET /api/admin/campus-quality]", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi hệ thống khi tổng hợp dữ liệu" },
      { status: 500 }
    )
  }
}
