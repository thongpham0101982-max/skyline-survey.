import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import {
  linkPeriodToSession,
  lockObservationTeachingPlanSnapshot,
  resolveObservationTeachingPlanView,
  saveObservationObjectiveEvidences,
} from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../_helpers"

export async function GET(req: NextRequest) {
  try {
    await getTeachingPlanAuthContext()
    const sp = req.nextUrl.searchParams
    const observationSlotId = sp.get("observationSlotId") || ""
    const evaluationId = sp.get("evaluationId") || undefined

    if (!observationSlotId) {
      throw new TeachingPlanAccessError("Thiếu mã tiết dự giờ (observationSlotId).", "VALIDATION_ERROR", 400)
    }

    const view = await resolveObservationTeachingPlanView(observationSlotId, evaluationId)
    return NextResponse.json({ success: true, view })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const body = await req.json()
    const action = String(body.action || "LINK").toUpperCase()

    if (action === "LOCK_SNAPSHOT") {
      const observationSlotId = String(body.observationSlotId || "")
      if (!observationSlotId) {
        throw new TeachingPlanAccessError("Thiếu observationSlotId.", "VALIDATION_ERROR", 400)
      }
      const view = await lockObservationTeachingPlanSnapshot(observationSlotId)
      return NextResponse.json({ success: true, view })
    }

    if (action === "SAVE_EVIDENCES") {
      const evaluationId = String(body.evaluationId || "")
      const observationSlotId = String(body.observationSlotId || "")
      if (!evaluationId || !observationSlotId) {
        throw new TeachingPlanAccessError(
          "Thiếu evaluationId hoặc observationSlotId.",
          "VALIDATION_ERROR",
          400
        )
      }
      const view = await saveObservationObjectiveEvidences({
        evaluationId,
        observationSlotId,
        evidences: Array.isArray(body.evidences) ? body.evidences : [],
      })
      return NextResponse.json({ success: true, view })
    }

    // Default: LINK
    const result = await linkPeriodToSession({
      timetableSlotId: body.timetableSlotId ? String(body.timetableSlotId) : null,
      observationSlotId: String(body.observationSlotId || ""),
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

    const view = await resolveObservationTeachingPlanView(String(body.observationSlotId || ""))
    return NextResponse.json({ success: true, ...result, view })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
