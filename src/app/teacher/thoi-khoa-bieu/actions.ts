"use server"

import { auth } from "@/lib/auth"
import {
  getEffectiveClassWeekSchedule,
  getEffectiveTeacherWeekSchedule,
} from "@/lib/timetable/effectiveScheduleService"

export async function fetchTeacherPortalScheduleAction(params: {
  mode: "TEACHER" | "CLASS"
  targetId: string
  weekDate: string
}) {
  const session = await auth()
  if (!session?.user) {
    return { success: false as const, error: "Phiên đăng nhập hết hạn." }
  }

  const refDate = (params.weekDate || new Date().toISOString()).slice(0, 10)

  if (params.mode === "CLASS") {
    const classSchedule = await getEffectiveClassWeekSchedule({
      classId: params.targetId,
      referenceDateIso: refDate,
      strictPublishedOnly: true,
    })
    return {
      success: true as const,
      mode: "CLASS" as const,
      weekDate: refDate,
      classSchedule,
    }
  }

  const teacherSchedule = await getEffectiveTeacherWeekSchedule({
    teacherId: params.targetId,
    referenceDateIso: refDate,
  })

  return {
    success: true as const,
    mode: "TEACHER" as const,
    weekDate: refDate,
    teacherSchedule,
  }
}
