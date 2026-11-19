import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import { commitExcelImportToDraft, createTeachingPlan } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../_helpers"

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const body = await req.json()

    let targetVersionId = String(body.versionId || "")
    let expectedRevision =
      body.expectedRevision !== undefined ? Number(body.expectedRevision) : undefined

    if (!targetVersionId) {
      // Create plan + v1 draft first if importing directly on an empty slot
      const created = await createTeachingPlan({
        academicYearId: String(body.academicYearId || ""),
        level: String(body.level || ""),
        grade: String(body.grade || ""),
        subjectId: String(body.subjectId || ""),
        programCode: body.programCode ? String(body.programCode) : "",
        programName: body.programName ? String(body.programName) : "",
        scopeType: body.scopeType === "CAMPUS" ? "CAMPUS" : "SYSTEM",
        campusId: body.campusId ? String(body.campusId) : null,
        title: body.title ? String(body.title) : undefined,
        ctx,
      })
      targetVersionId = created.version.id
      expectedRevision = created.version.revision
    }

    if (!Array.isArray(body.lessons) || body.lessons.length === 0) {
      throw new TeachingPlanAccessError(
        "Không có dữ liệu bài dạy hợp lệ để lưu vào bản nháp.",
        "VALIDATION_ERROR",
        400
      )
    }

    const updated = await commitExcelImportToDraft({
      versionId: targetVersionId,
      expectedRevision,
      lessons: body.lessons,
      periods: Array.isArray(body.periods) ? body.periods : [],
      ctx,
    })

    return NextResponse.json({ success: true, ...updated })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
