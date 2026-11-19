import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureTeachingPlanSchema } from "@/lib/teaching-plan/schemaInit"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import { createTeachingPlan, listTeachingPlans } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "./_helpers"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    await ensureTeachingPlanSchema()
    const sp = req.nextUrl.searchParams
    const listAll = sp.get("listAll") === "1"
    const academicYearId = sp.get("academicYearId") || ""
    const level = sp.get("level") || ""
    const grade = sp.get("grade") || ""
    const subjectId = sp.get("subjectId") || ""
    const programCode = sp.get("programCode") ?? undefined
    const scopeType = (sp.get("scopeType") as "SYSTEM" | "CAMPUS" | null) || undefined
    const campusId = sp.get("campusId") || undefined

    if (listAll) {
      const conditions: string[] = [`p."status" = 'ACTIVE'`]
      const args: any[] = []
      if (academicYearId) {
        conditions.push(`p."academicYearId" = ?`)
        args.push(academicYearId)
      }
      if (level) {
        conditions.push(`p."level" = ?`)
        args.push(level)
      }
      if (grade) {
        conditions.push(`p."grade" = ?`)
        args.push(grade)
      }
      if (subjectId) {
        conditions.push(`p."subjectId" = ?`)
        args.push(subjectId)
      }

      const rows = (await prisma.$queryRawUnsafe(
        `SELECT p.*,
                (SELECT v."versionNumber" FROM "teaching_plan_versions" v WHERE v."planId" = p."id" ORDER BY v."versionNumber" DESC LIMIT 1) as "latestVersionNumber",
                (SELECT v."status" FROM "teaching_plan_versions" v WHERE v."planId" = p."id" ORDER BY v."versionNumber" DESC LIMIT 1) as "latestVersionStatus",
                (SELECT v."id" FROM "teaching_plan_versions" v WHERE v."planId" = p."id" ORDER BY v."versionNumber" DESC LIMIT 1) as "latestVersionId",
                (SELECT COUNT(*) FROM "teaching_plan_lessons" l WHERE l."versionId" = COALESCE(p."activePublishedVersionId", (SELECT v2."id" FROM "teaching_plan_versions" v2 WHERE v2."planId" = p."id" ORDER BY v2."versionNumber" DESC LIMIT 1))) as "lessonCount",
                (SELECT COUNT(*) FROM "teaching_plan_periods" pr WHERE pr."versionId" = COALESCE(p."activePublishedVersionId", (SELECT v3."id" FROM "teaching_plan_versions" v3 WHERE v3."planId" = p."id" ORDER BY v3."versionNumber" DESC LIMIT 1))) as "periodCount"
         FROM "teaching_plans" p
         WHERE ${conditions.join(" AND ")}
         ORDER BY p."subjectName" ASC, p."level" ASC, CAST(p."grade" AS INTEGER) ASC, p."grade" ASC, p."updatedAt" DESC`,
        ...args
      )) as any[]

      let items = rows.map((r) => ({
        id: String(r.id),
        academicYearId: String(r.academicYearId),
        level: String(r.level),
        grade: String(r.grade),
        subjectId: String(r.subjectId),
        subjectCode: r.subjectCode ? String(r.subjectCode) : null,
        subjectName: String(r.subjectName),
        programCode: String(r.programCode || ""),
        programName: String(r.programName || ""),
        scopeType: r.scopeType === "CAMPUS" ? "CAMPUS" : "SYSTEM",
        campusId: r.campusId ? String(r.campusId) : null,
        campusCode: r.campusCode ? String(r.campusCode) : null,
        title: String(r.title),
        activePublishedVersionId: r.activePublishedVersionId ? String(r.activePublishedVersionId) : null,
        syncToObservation: Boolean(Number(r.syncToObservation || 0)),
        syncedToObservationAt: r.syncedToObservationAt ? String(r.syncedToObservationAt) : null,
        syncedToObservationByName: r.syncedToObservationByName ? String(r.syncedToObservationByName) : null,
        latestVersionId: r.latestVersionId ? String(r.latestVersionId) : null,
        latestVersionNumber: Number(r.latestVersionNumber || 1),
        latestVersionStatus: String(r.latestVersionStatus || "DRAFT"),
        lessonCount: Number(r.lessonCount || 0),
        periodCount: Number(r.periodCount || 0),
        updatedAt: r.updatedAt ? String(r.updatedAt) : "",
      }))

      if (ctx.isTeacherOnly) {
        items = items.filter(
          (p) =>
            Boolean(p.activePublishedVersionId) &&
            (p.scopeType === "SYSTEM" ||
              (p.campusId && ctx.allowedCampusIds.includes(p.campusId)))
        )
      }

      return NextResponse.json({ success: true, items })
    }

    if (!academicYearId || !level || !grade || !subjectId) {
      throw new TeachingPlanAccessError(
        "Vui lòng chọn đầy đủ Năm học, Bậc học, Khối và Môn học.",
        "VALIDATION_ERROR",
        400
      )
    }

    const result = await listTeachingPlans({
      academicYearId,
      level,
      grade,
      subjectId,
      programCode,
      scopeType,
      campusId,
      ctx,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const body = await req.json()
    const result = await createTeachingPlan({
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

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
