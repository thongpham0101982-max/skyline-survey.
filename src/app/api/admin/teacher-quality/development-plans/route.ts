import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"
import {
  classifyObservationRecord,
  getVietnamMonthKey,
} from "@/lib/teacher-quality/monthlyObservationEngine"
import { normalizeCoachingStatus } from "@/lib/teacher-quality/recognitionEngine"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    await ensureTeacherQualitySchema()

    const adminSession = await getAdminSession()
    const userId = (session.user as any)?.id || adminSession.userId
    const userName = (session.user as any)?.name || (session.user as any)?.email || "Quản trị"
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
    const observationEvaluationId = body.observationEvaluationId
      ? String(body.observationEvaluationId).trim()
      : null
    let observationSlotId = body.observationSlotId ? String(body.observationSlotId).trim() : null
    let improvementNeeds = String(body.improvementNeeds || "").trim()
    const activityType = body.activityType ? String(body.activityType).trim() : null
    const developmentActivity = String(body.developmentActivity || "").trim()
    const mentorTeacherId = body.mentorTeacherId ? String(body.mentorTeacherId).trim() : null
    let mentorName = body.mentorName ? String(body.mentorName).trim() : null
    const dueDateRaw = body.dueDate ? String(body.dueDate).trim() : null
    const applicationNotes = body.applicationNotes
      ? String(body.applicationNotes).trim()
      : body.postCoachingNotes
        ? String(body.postCoachingNotes).trim()
        : null
    const nextSupportNeeds = body.nextSupportNeeds ? String(body.nextSupportNeeds).trim() : null
    const followUpEvaluationId = body.followUpEvaluationId
      ? String(body.followUpEvaluationId).trim()
      : null
    let followUpSlotId = body.followUpSlotId ? String(body.followUpSlotId).trim() : null
    const outcomeRating = body.outcomeRating ? String(body.outcomeRating).trim() : null
    const status = normalizeCoachingStatus(body.status)
    let academicYearId = body.academicYearId ? String(body.academicYearId).trim() : null
    let sourceMonth = body.sourceMonth ? String(body.sourceMonth).trim() : null

    // Determine target teacher IDs (supports 1 or multiple teachers)
    let targetTeacherIds: string[] = Array.isArray(body.teacherIds)
      ? body.teacherIds.map((x: any) => String(x).trim()).filter(Boolean)
      : body.teacherId
        ? [String(body.teacherId).trim()]
        : []

    let requestSource: "OBSERVATION" | "TEACHER_PROPOSAL" | "DIRECT" =
      body.requestSource === "TEACHER_PROPOSAL"
        ? "TEACHER_PROPOSAL"
        : observationEvaluationId
          ? "OBSERVATION"
          : "DIRECT"

    // GV self-proposal check
    if (!isManager) {
      if (!scope.teacherId) {
        return NextResponse.json(
          { success: false, error: "Bạn không có quyền đề xuất hoặc tạo nội dung bồi dưỡng" },
          { status: 403 }
        )
      }
      requestSource = "TEACHER_PROPOSAL"
      targetTeacherIds = [scope.teacherId]
    }

    // If linked to an approved observation evaluation, verify and auto-fill
    if (observationEvaluationId) {
      const ev = await prisma.observationEvaluation.findUnique({
        where: { id: observationEvaluationId },
        include: { registration: { include: { slot: true } } },
      })
      if (!ev || !ev.registration?.slot) {
        return NextResponse.json({ success: false, error: "Không tìm thấy phiếu dự giờ gốc" }, { status: 404 })
      }
      const cls = classifyObservationRecord(ev.registration.slot, {
        isApproved: ev.registration.isApproved,
        evaluation: {
          id: ev.id,
          registrationId: ev.registrationId,
          slotId: ev.slotId,
          evaluatorId: ev.evaluatorId,
          overallRating: ev.overallRating,
          totalScore: ev.totalScore,
          strengths: ev.strengths,
          improvements: ev.improvements,
          generalComment: ev.generalComment,
          submittedAt: ev.submittedAt,
          reEvaluationStatus: ev.reEvaluationStatus,
          isSupplemental: ev.isSupplemental,
          supplementalStatus: ev.supplementalStatus,
          supplementalReviewedAt: ev.supplementalReviewedAt,
        },
      })
      if (!cls.isCountedOfficial) {
        return NextResponse.json(
          { success: false, error: "Chỉ tạo nội dung bồi dưỡng từ phiếu dự giờ đã duyệt chính thức" },
          { status: 400 }
        )
      }
      targetTeacherIds = [ev.registration.slot.teacherId]
      observationSlotId = ev.registration.slot.id
      academicYearId = academicYearId || ev.registration.slot.academicYearId || null
      sourceMonth = sourceMonth || getVietnamMonthKey(ev.registration.slot.date)
      if (!improvementNeeds && ev.improvements) {
        improvementNeeds = ev.improvements.trim()
      }
      requestSource = "OBSERVATION"
    }

    targetTeacherIds = Array.from(new Set(targetTeacherIds))
    if (targetTeacherIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn ít nhất một giáo viên" },
        { status: 400 }
      )
    }

    if (!improvementNeeds && !developmentActivity) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập nhu cầu bồi dưỡng hoặc hoạt động bồi dưỡng" },
        { status: 400 }
      )
    }

    const finalImprovementNeeds = improvementNeeds || developmentActivity
    const finalActivity =
      developmentActivity ||
      (requestSource === "TEACHER_PROPOSAL" ? "Chờ TTCM phân công hoạt động bồi dưỡng" : improvementNeeds)

    if (followUpEvaluationId && !followUpSlotId) {
      const fEv = await prisma.observationEvaluation.findUnique({
        where: { id: followUpEvaluationId },
        select: { slotId: true },
      })
      followUpSlotId = fEv?.slotId || null
    }

    if (mentorTeacherId && !mentorName) {
      const mentor = await prisma.teacher.findUnique({
        where: { id: mentorTeacherId },
        select: { teacherName: true },
      })
      mentorName = mentor?.teacherName || null
    }

    if (!academicYearId) {
      const activeAy = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      })
      academicYearId = activeAy?.id || null
    }

    const teachers = await prisma.teacher.findMany({
      where: { id: { in: targetTeacherIds } },
      select: { id: true, campusId: true, departmentId: true },
    })
    const teacherMap = new Map(teachers.map((t) => [t.id, t]))

    const batchGroupId =
      targetTeacherIds.length > 1 ? `batch_${crypto.randomBytes(6).toString("hex")}` : null
    const nowIso = new Date().toISOString()
    const dueDateIso = dueDateRaw ? new Date(dueDateRaw).toISOString() : null
    const completedAtIso = status === "COMPLETED" ? nowIso : null

    const createdIds: string[] = []
    for (const tid of targetTeacherIds) {
      const t = teacherMap.get(tid)
      if (!t) continue
      const id = `tdp_${crypto.randomBytes(10).toString("hex")}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "TeacherDevelopmentPlan" (
          "id", "teacherId", "academicYearId", "campusId", "departmentId",
          "observationSlotId", "observationEvaluationId", "sourceMonth",
          "requestSource", "batchGroupId", "activityType",
          "improvementNeeds", "developmentActivity", "mentorTeacherId", "mentorName",
          "dueDate", "status", "postCoachingNotes", "applicationNotes", "nextSupportNeeds",
          "followUpSlotId", "followUpEvaluationId", "outcomeRating", "completedAt",
          "createdById", "createdByName", "updatedById", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        t.id,
        academicYearId,
        t.campusId,
        t.departmentId,
        observationSlotId,
        observationEvaluationId,
        sourceMonth,
        requestSource,
        batchGroupId,
        activityType,
        finalImprovementNeeds,
        finalActivity,
        mentorTeacherId,
        mentorName,
        dueDateIso,
        status,
        applicationNotes,
        applicationNotes,
        nextSupportNeeds,
        followUpSlotId,
        followUpEvaluationId,
        outcomeRating,
        completedAtIso,
        userId || null,
        userName,
        userId || null,
        nowIso,
        nowIso
      )
      createdIds.push(id)
    }

    return NextResponse.json({
      success: true,
      ids: createdIds,
      message:
        createdIds.length > 1
          ? `Đã giao hoạt động bồi dưỡng cho ${createdIds.length} giáo viên`
          : requestSource === "TEACHER_PROPOSAL"
            ? "Đã gửi đề xuất nhu cầu bồi dưỡng"
            : "Đã lưu nội dung bồi dưỡng giáo viên",
    })
  } catch (err: any) {
    console.error("[POST /api/admin/teacher-quality/development-plans] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tạo nội dung bồi dưỡng giáo viên" },
      { status: 500 }
    )
  }
}
