import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureTeachingPlanSchema } from "@/lib/teaching-plan/schemaInit"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import {
  estimateAcademicWeekFromDate,
  getVersionDetail,
  linkPeriodToSession,
  resolveApplicablePlansForClass,
} from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../_helpers"

function normalizeLevel(raw?: string | null): string {
  const s = (raw || "").trim()
  const norm = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
  if (norm.includes("tieu hoc") || norm === "primary") return "Tiểu học"
  if (norm.includes("thcs") || norm === "middle") return "THCS"
  if (norm.includes("thpt") || norm === "high") return "THPT"
  if (norm.includes("mam non") || norm === "preschool") return "Mầm non"
  return s
}

function normalizeGrade(raw?: string | null): string {
  return (raw || "")
    .trim()
    .replace(/^khối\s*/i, "")
    .replace(/^khoi\s*/i, "")
    .replace(/^k\s*/i, "")
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    await getTeachingPlanAuthContext()
    await ensureTeachingPlanSchema()

    const sp = req.nextUrl.searchParams
    const classId = sp.get("classId") || ""
    const subjectId = sp.get("subjectId") || ""
    const academicYearId = sp.get("academicYearId") || undefined
    const level = sp.get("level") || ""
    const grade = sp.get("grade") || ""
    const campusId = sp.get("campusId") || ""
    const sessionDate = sp.get("sessionDate") || ""
    const selectedPlanId = sp.get("planId") || ""
    const timetableSlotId = sp.get("timetableSlotId") || ""

    if (!subjectId || (!classId && (!level || !grade))) {
      throw new TeachingPlanAccessError(
        "Cần chọn môn học kèm theo lớp học hoặc bậc/khối để tra cứu kế hoạch dạy học.",
        "VALIDATION_ERROR",
        400
      )
    }

    let classInfo: any = null
    let candidates: any[] = []
    let recommendedPlan: any = null
    let requiresSelection = false
    let resolvedYearId = academicYearId || ""

    if (classId && classId !== "other") {
      const resolution = await resolveApplicablePlansForClass({
        classId,
        subjectId,
        academicYearId,
      })
      classInfo = resolution.classInfo
      candidates = resolution.candidates
      recommendedPlan = resolution.recommendedPlan
      requiresSelection = resolution.requiresSelection
      resolvedYearId = academicYearId || resolution.classInfo.academicYearId
    } else {
      // Grade-level resolution before a specific class is selected
      if (!resolvedYearId) {
        const activeYear = await prisma.academicYear.findFirst({
          where: { status: "ACTIVE" },
          select: { id: true },
        })
        resolvedYearId = activeYear?.id || ""
      }
      const normLevel = normalizeLevel(level)
      const normGrade = normalizeGrade(grade)
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "teaching_plans"
         WHERE "academicYearId" = ? AND "level" = ? AND "grade" = ? AND "subjectId" = ?
           AND "status" = 'ACTIVE' AND "activePublishedVersionId" IS NOT NULL
           AND COALESCE("syncToObservation", 0) = 1
         ORDER BY "scopeType" ASC, "createdAt" DESC`,
        resolvedYearId,
        normLevel,
        normGrade,
        subjectId
      )) as any[]

      const mapped = rows.map((r) => ({
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
      }))

      const campusMatch = campusId
        ? mapped.filter((p) => p.scopeType === "CAMPUS" && p.campusId === campusId)
        : []
      const systemMatch = mapped.filter((p) => p.scopeType === "SYSTEM")
      candidates =
        campusMatch.length > 0 ? campusMatch : systemMatch.length > 0 ? systemMatch : mapped
      recommendedPlan = candidates.length === 1 ? candidates[0] : null
      requiresSelection = candidates.length > 1
    }

    // Fetch class timetable slots when classId is selected
    const timetableSlots =
      classId && classId !== "other"
        ? await prisma.timetableSlot.findMany({
            where: {
              classId,
              subjectId,
              status: "ACTIVE",
            },
            orderBy: [{ dayOfWeek: "asc" }, { session: "asc" }, { periodNumber: "asc" }],
            select: {
              id: true,
              classId: true,
              className: true,
              campusId: true,
              subjectId: true,
              subjectName: true,
              teacherId: true,
              teacherName: true,
              dayOfWeek: true,
              session: true,
              periodNumber: true,
              roomName: true,
            },
            take: 60,
          })
        : []

    // Check existing timetable link if timetableSlotId supplied
    let existingLink: any = null
    if (timetableSlotId) {
      const dateKey = sessionDate.slice(0, 10)
      const linkRows = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "timetable_teaching_plan_links"
         WHERE "timetableSlotId" = ? AND ("sessionDate" = ? OR "sessionDate" = '')
         ORDER BY CASE WHEN "sessionDate" = ? THEN 0 ELSE 1 END
         LIMIT 1`,
        timetableSlotId,
        dateKey,
        dateKey
      )) as any[]
      existingLink = linkRows[0] || null
    }

    // Determine which published plan's periods to return
    const activePlan =
      (selectedPlanId && candidates.find((c) => c.id === selectedPlanId)) ||
      (existingLink?.planId &&
        candidates.find((c) => c.id === String(existingLink.planId))) ||
      recommendedPlan ||
      candidates[0] ||
      null

    let activeVersionDetail = null
    if (activePlan?.activePublishedVersionId) {
      activeVersionDetail = await getVersionDetail(activePlan.activePublishedVersionId)
    }

    let suggestedWeek: number | null = null
    if (sessionDate && resolvedYearId) {
      const yearObj = await prisma.academicYear.findUnique({
        where: { id: resolvedYearId },
        select: { startDate: true },
      })
      suggestedWeek = estimateAcademicWeekFromDate(sessionDate, yearObj?.startDate)
    }

    return NextResponse.json({
      success: true,
      classInfo,
      candidates,
      recommendedPlan,
      requiresSelection: requiresSelection && !selectedPlanId,
      activePlan,
      activeVersion: activeVersionDetail?.version || null,
      lessons: activeVersionDetail?.lessons || [],
      timetableSlots,
      existingLink,
      suggestedWeek,
    })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const body = await req.json()

    const result = await linkPeriodToSession({
      timetableSlotId: body.timetableSlotId ? String(body.timetableSlotId) : null,
      observationSlotId: body.observationSlotId ? String(body.observationSlotId) : null,
      classId: String(body.classId || ""),
      subjectId: String(body.subjectId || ""),
      academicYearId: body.academicYearId ? String(body.academicYearId) : undefined,
      sessionDate: body.sessionDate ? String(body.sessionDate) : undefined,
      timetablePeriodNumber:
        body.timetablePeriodNumber !== undefined && body.timetablePeriodNumber !== null
          ? Number(body.timetablePeriodNumber)
          : null,
      timetableSession: body.timetableSession ? String(body.timetableSession) : null,
      planId: String(body.planId || ""),
      stablePeriodId: String(body.stablePeriodId || ""),
      ctx,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
