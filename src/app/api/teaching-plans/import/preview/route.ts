import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  assertCanManagePlan,
  getTeachingPlanAuthContext,
  TeachingPlanAccessError,
} from "@/lib/teaching-plan/rbac"
import { parseAndValidateTeachingPlanExcel } from "@/lib/teaching-plan/excelService"
import { getVersionDetail } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../_helpers"

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const versionId = String(formData.get("versionId") || "")
    const academicYearId = String(formData.get("academicYearId") || "")
    const grade = String(formData.get("grade") || "")
    const subjectId = String(formData.get("subjectId") || "")
    const programCode = String(formData.get("programCode") || "")
    const programName = String(formData.get("programName") || "")
    const scopeType = String(formData.get("scopeType") || "SYSTEM") === "CAMPUS" ? "CAMPUS" : "SYSTEM"
    const campusId = String(formData.get("campusId") || "") || null

    if (!file) {
      throw new TeachingPlanAccessError("Vui lòng chọn tệp Excel (.xlsx) để tải lên.", "VALIDATION_ERROR", 400)
    }

    assertCanManagePlan(ctx, scopeType, campusId)

    let existingLessons = undefined as any
    let resolvedYearId = academicYearId
    let resolvedGrade = grade
    let resolvedSubjectId = subjectId
    let resolvedProgramCode = programCode
    let resolvedProgramName = programName
    let resolvedScopeType: "SYSTEM" | "CAMPUS" = scopeType
    let resolvedCampusId = campusId

    if (versionId) {
      const detail = await getVersionDetail(versionId)
      assertCanManagePlan(ctx, detail.plan.scopeType, detail.plan.campusId)
      existingLessons = detail.lessons
      resolvedYearId = detail.plan.academicYearId
      resolvedGrade = detail.plan.grade
      resolvedSubjectId = detail.plan.subjectId
      resolvedProgramCode = detail.plan.programCode
      resolvedProgramName = detail.plan.programName
      resolvedScopeType = detail.plan.scopeType
      resolvedCampusId = detail.plan.campusId
    }

    const [year, subject, campus] = await Promise.all([
      resolvedYearId
        ? prisma.academicYear.findUnique({ where: { id: resolvedYearId } })
        : Promise.resolve(null),
      resolvedSubjectId
        ? prisma.subject.findUnique({ where: { id: resolvedSubjectId } })
        : Promise.resolve(null),
      resolvedCampusId
        ? prisma.campus.findUnique({ where: { id: resolvedCampusId } })
        : Promise.resolve(null),
    ])

    if (!year || !subject) {
      throw new TeachingPlanAccessError(
        "Thiếu thông tin Năm học hoặc Môn học hợp lệ để đối chiếu file Excel.",
        "VALIDATION_ERROR",
        400
      )
    }

    const arrayBuf = await file.arrayBuffer()
    const preview = parseAndValidateTeachingPlanExcel(Buffer.from(arrayBuf), {
      academicYearName: year.name,
      grade: resolvedGrade,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      programCode: resolvedProgramCode,
      programName: resolvedProgramName,
      scopeType: resolvedScopeType,
      campusCode: campus?.campusCode || null,
      campusName: campus?.campusName || null,
      existingLessons,
    })

    return NextResponse.json({ success: true, preview })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
