import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"

export const dynamic = "force-dynamic"

const MANUAL_GROUPS = new Set(["DEPT_AWARD", "SYSTEM_AWARD", "STUDENT_COMPETITION", "AI_TECH"])

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    await ensureTeacherQualitySchema()

    const adminSession = await getAdminSession()
    const userId = (session.user as any)?.id || adminSession.userId
    const userName = (session.user as any)?.name || (session.user as any)?.email || "Người dùng"
    const roleCode = (session.user as any)?.role || adminSession.role || ""
    const scope = await resolveCampusQualityScope(userId, roleCode)

    const isManager = Boolean(
      adminSession.isSuperAdmin ||
        adminSession.isHeadOfAcademic ||
        adminSession.isTBP ||
        adminSession.isTTCM ||
        adminSession.isGDCS ||
        scope.roleTier === "SYSTEM_QA_EXEC" ||
        scope.roleTier === "CAMPUS_MANAGER" ||
        scope.roleTier === "DEPARTMENT_HEAD"
    )

    const body = await req.json()
    const groupType = String(body.groupType || "").trim()
    const academicYearId = String(body.academicYearId || "").trim()
    const title = String(body.title || "").trim()

    if (!MANUAL_GROUPS.has(groupType)) {
      return NextResponse.json({ success: false, error: "Nhóm ghi nhận không hợp lệ" }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tiêu đề / danh hiệu" }, { status: 400 })
    }

    // Support single teacherId or multi-teacher array (for co-coaching student competitions)
    const rawEntries: Array<{ teacherId: string; teacherRole?: string }> = Array.isArray(body.teacherEntries)
      ? body.teacherEntries
      : body.teacherId
        ? [{ teacherId: String(body.teacherId), teacherRole: body.teacherRole }]
        : []

    if (rawEntries.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất một giáo viên" }, { status: 400 })
    }

    // Permission check: GV can only add own AI_TECH
    if (!isManager) {
      const onlySelfAiTech =
        groupType === "AI_TECH" &&
        scope.teacherId &&
        rawEntries.every((e) => e.teacherId === scope.teacherId)
      if (!onlySelfAiTech) {
        return NextResponse.json(
          { success: false, error: "Bạn không có quyền thêm bản ghi ở nhóm này" },
          { status: 403 }
        )
      }
    }

    let resolvedAyId = academicYearId
    if (!resolvedAyId) {
      const ay = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      })
      resolvedAyId = ay?.id || ""
    }
    if (!resolvedAyId) {
      return NextResponse.json({ success: false, error: "Thiếu năm học" }, { status: 400 })
    }

    const teacherIds = Array.from(new Set(rawEntries.map((e) => e.teacherId)))
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, campusId: true, departmentId: true },
    })
    const teacherMap = new Map(teachers.map((t) => [t.id, t]))

    // Shared dedupKey when multiple teachers co-coach the same student competition result
    const sharedDedupKey =
      body.dedupKey
        ? String(body.dedupKey).trim()
        : groupType === "STUDENT_COMPETITION" && rawEntries.length > 1
          ? `COMP_${crypto.randomBytes(6).toString("hex")}`
          : null

    const nowIso = new Date().toISOString()
    const createdIds: string[] = []

    for (const entry of rawEntries) {
      const t = teacherMap.get(entry.teacherId)
      if (!t) continue
      const id = `trec_${crypto.randomBytes(10).toString("hex")}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "TeacherRecognition" (
          "id", "teacherId", "academicYearId", "campusId", "departmentId",
          "groupType", "title", "issuingAuthority", "awardScope", "eventBatch",
          "teacherRole", "participantCount", "resultSummary", "recordedDate",
          "dedupKey", "notes", "createdById", "createdByName", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        t.id,
        resolvedAyId,
        t.campusId,
        t.departmentId,
        groupType,
        title,
        body.issuingAuthority ? String(body.issuingAuthority).trim() : null,
        body.awardScope ? String(body.awardScope).trim() : null,
        body.eventBatch ? String(body.eventBatch).trim() : null,
        entry.teacherRole
          ? String(entry.teacherRole).trim()
          : body.teacherRole
            ? String(body.teacherRole).trim()
            : null,
        body.participantCount !== undefined && body.participantCount !== null && body.participantCount !== ""
          ? Number(body.participantCount)
          : null,
        body.resultSummary ? String(body.resultSummary).trim() : null,
        body.recordedDate ? String(body.recordedDate).trim() : null,
        sharedDedupKey,
        body.notes ? String(body.notes).trim() : null,
        userId || null,
        userName,
        nowIso,
        nowIso
      )
      createdIds.push(id)
    }

    return NextResponse.json({
      success: true,
      ids: createdIds,
      message: "Đã lưu ghi nhận trực tiếp thành công",
    })
  } catch (err: any) {
    console.error("[POST /api/admin/teacher-quality/recognitions] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi lưu ghi nhận" },
      { status: 500 }
    )
  }
}
