"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getTimetableMatrixData(campusId?: string, level: string = "TIEU_HOC") {
  try {
    const campuses = await prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" }
    })

    const selectedCampusId = campusId || (campuses[0]?.id || "")

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })

    let levelGradeFilter: any = {}
    if (level === "TIEU_HOC") {
      levelGradeFilter = { level: { in: ["Tiểu học", "Mầm non"] } }
    } else if (level === "TRUNG_HOC") {
      levelGradeFilter = { level: { in: ["THCS", "THPT"] } }
    } else {
      levelGradeFilter = {}
    }

    const yearFilter = activeYear ? { academicYearId: activeYear.id } : {}

    let rawClasses = await prisma.class.findMany({
      where: {
        status: "ACTIVE",
        ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
        ...levelGradeFilter,
        ...yearFilter
      },
      select: {
        id: true,
        className: true,
        level: true,
        grade: true,
        homeroomTeacherId: true,
        campusId: true,
        academicYearId: true
      },
      orderBy: [
        { grade: "asc" },
        { className: "asc" }
      ]
    })

    if (rawClasses.length === 0 && selectedCampusId) {
      rawClasses = await prisma.class.findMany({
        where: {
          status: "ACTIVE",
          campusId: selectedCampusId,
          ...yearFilter
        },
        select: {
          id: true,
          className: true,
          level: true,
          grade: true,
          homeroomTeacherId: true,
          campusId: true,
          academicYearId: true
        },
        orderBy: [
          { grade: "asc" },
          { className: "asc" }
        ]
      })
    }

    if (rawClasses.length === 0) {
      rawClasses = await prisma.class.findMany({
        where: { status: "ACTIVE", ...yearFilter },
        select: {
          id: true,
          className: true,
          level: true,
          grade: true,
          homeroomTeacherId: true,
          campusId: true,
          academicYearId: true
        },
        orderBy: [
          { grade: "asc" },
          { className: "asc" }
        ],
        take: 15
      })
    }

    // Deduplicate classes by className to ensure no class appears twice
    const seenClassNames = new Set()
    const classes = rawClasses.filter(c => {
      if (seenClassNames.has(c.className)) return false
      seenClassNames.add(c.className)
      return true
    })

    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })

    const teachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        campusId: true,
        departmentId: true,
        departmentRel: {
          select: { name: true, blockCM: true }
        }
      },
      orderBy: { teacherName: "asc" }
    })

    let timetableSlots: any[] = []
    try {
      timetableSlots = await prisma.timetableSlot.findMany({
        where: {
          ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
          level: level
        }
      })
    } catch (e) {
      console.error("Error fetching timetableSlots:", e)
    }

    let teachingAssignments: any[] = []
    try {
      teachingAssignments = await prisma.teachingAssignment.findMany({
        include: {
          teacher: { select: { id: true, teacherName: true, teacherCode: true, departmentId: true } },
          subject: { select: { id: true, subjectName: true, subjectCode: true } },
          class: { select: { id: true, className: true, level: true, grade: true } }
        }
      })
    } catch (e) {
      console.error("Error fetching teachingAssignments:", e)
    }

    return {
      success: true,
      campuses: campuses || [],
      selectedCampusId,
      classes: classes || [],
      subjects: subjects || [],
      teachers: teachers || [],
      timetableSlots: timetableSlots || [],
      teachingAssignments: teachingAssignments || [],
      academicYear: activeYear
    }
  } catch (e: any) {
    console.error("getTimetableMatrixData error:", e)
    return {
      success: false,
      error: e.message,
      campuses: [],
      selectedCampusId: "",
      classes: [],
      subjects: [],
      teachers: [],
      timetableSlots: []
    }
  }
}

export async function saveTimetableSlot(data: {
  campusId: string
  level: string
  classId: string
  className: string
  dayOfWeek: string
  session: string
  periodNumber: number
  subjectId?: string
  subjectName?: string
  teacherId?: string
  teacherName?: string
  weekType?: string
  altSubjectName?: string
  altTeacherName?: string
  colorCode?: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    let conflictNotice = null
    if (data.teacherName && data.teacherName.trim() !== "") {
      const conflictingSlot = await prisma.timetableSlot.findFirst({
        where: {
          dayOfWeek: data.dayOfWeek,
          session: data.session,
          periodNumber: data.periodNumber,
          teacherName: data.teacherName,
          NOT: {
            classId: data.classId
          }
        }
      })

      if (conflictingSlot) {
        const dayText = conflictingSlot.dayOfWeek === "MONDAY" ? "Thứ 2" : conflictingSlot.dayOfWeek === "TUESDAY" ? "Thứ 3" : conflictingSlot.dayOfWeek === "WEDNESDAY" ? "Thứ 4" : conflictingSlot.dayOfWeek === "THURSDAY" ? "Thứ 5" : "Thứ 6";
        conflictNotice = `Cảnh báo: GV ${data.teacherName} đã bị phân công trùng tiết tại Lớp ${conflictingSlot.className} (${dayText} - Tiết ${conflictingSlot.periodNumber})!`
      }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    const yearId = activeYear?.id || null

    let subId = data.subjectId || null
    if (!subId && data.subjectName) {
      const s = await prisma.subject.findFirst({ where: { subjectName: data.subjectName } })
      if (s) subId = s.id
    }

    let tId = data.teacherId || null
    if (!tId && data.teacherName) {
      const t = await prisma.teacher.findFirst({ where: { teacherName: data.teacherName } })
      if (t) tId = t.id
    }

    const existingSlot = await prisma.timetableSlot.findFirst({
      where: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        session: data.session,
        periodNumber: data.periodNumber
      }
    })

    let savedSlot: any
    if (existingSlot) {
      savedSlot = await prisma.timetableSlot.update({
        where: { id: existingSlot.id },
        data: {
          campusId: data.campusId || existingSlot.campusId,
          level: data.level || existingSlot.level,
          academicYearId: yearId || existingSlot.academicYearId,
          subjectId: subId,
          subjectName: data.subjectName || null,
          teacherId: tId,
          teacherName: data.teacherName || null,
          weekType: data.weekType || "ALL",
          altSubjectName: data.altSubjectName || null,
          altTeacherName: data.altTeacherName || null,
          colorCode: data.colorCode || "#3B82F6"
        }
      })
    } else {
      savedSlot = await prisma.timetableSlot.create({
        data: {
          campusId: data.campusId,
          level: data.level,
          academicYearId: yearId,
          classId: data.classId,
          className: data.className,
          dayOfWeek: data.dayOfWeek,
          session: data.session,
          periodNumber: data.periodNumber,
          subjectId: subId,
          subjectName: data.subjectName || null,
          teacherId: tId,
          teacherName: data.teacherName || null,
          weekType: data.weekType || "ALL",
          altSubjectName: data.altSubjectName || null,
          altTeacherName: data.altTeacherName || null,
          colorCode: data.colorCode || "#3B82F6"
        }
      })
    }

    revalidatePath("/admin/thoi-khoa-bieu")
    revalidatePath("/teacher/thoi-khoa-bieu")

    return {
      success: true,
      savedSlot,
      conflictNotice
    }
  } catch (e: any) {
    console.error("saveTimetableSlot error:", e)
    return { success: false, error: e.message }
  }
}

export async function clearTimetableSlot(slotId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.timetableSlot.delete({
      where: { id: slotId }
    })

    revalidatePath("/admin/thoi-khoa-bieu")
    revalidatePath("/teacher/thoi-khoa-bieu")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


export async function batchSaveAllTimetableSlots(campusId: string, level: string, slotsData: any[]) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    const yearId = activeYear?.id || null

    let savedCount = 0
    for (const slot of slotsData) {
      if (!slot.classId || !slot.dayOfWeek) continue

      let subId = slot.subjectId || null
      if (!subId && slot.subjectName) {
        const s = await prisma.subject.findFirst({ where: { subjectName: slot.subjectName } })
        if (s) subId = s.id
      }

      let tId = slot.teacherId || null
      if (!tId && slot.teacherName) {
        const t = await prisma.teacher.findFirst({ where: { teacherName: slot.teacherName } })
        if (t) tId = t.id
      }

      const existing = await prisma.timetableSlot.findFirst({
        where: {
          classId: slot.classId,
          dayOfWeek: slot.dayOfWeek,
          session: slot.session || "MORNING",
          periodNumber: slot.periodNumber || 1
        }
      })

      if (existing) {
        await prisma.timetableSlot.update({
          where: { id: existing.id },
          data: {
            campusId: campusId || existing.campusId,
            level: level || existing.level,
            academicYearId: yearId || existing.academicYearId,
            subjectId: subId,
            subjectName: slot.subjectName || null,
            teacherId: tId,
            teacherName: slot.teacherName || null,
            weekType: slot.weekType || "ALL",
            altSubjectName: slot.altSubjectName || null,
            altTeacherName: slot.altTeacherName || null,
            colorCode: slot.colorCode || "#FEF08A"
          }
        })
      } else if (slot.subjectName || slot.teacherName) {
        await prisma.timetableSlot.create({
          data: {
            campusId: campusId,
            level: level,
            academicYearId: yearId,
            classId: slot.classId,
            className: slot.className || "Class",
            dayOfWeek: slot.dayOfWeek,
            session: slot.session || "MORNING",
            periodNumber: slot.periodNumber || 1,
            subjectId: subId,
            subjectName: slot.subjectName || null,
            teacherId: tId,
            teacherName: slot.teacherName || null,
            weekType: slot.weekType || "ALL",
            altSubjectName: slot.altSubjectName || null,
            altTeacherName: slot.altTeacherName || null,
            colorCode: slot.colorCode || "#FEF08A"
          }
        })
      }
      savedCount++
    }

    revalidatePath("/admin/thoi-khoa-bieu")
    revalidatePath("/teacher/thoi-khoa-bieu")

    return { success: true, savedCount }
  } catch (e: any) {
    console.error("batchSaveAllTimetableSlots error:", e)
    return { success: false, error: e.message }
  }
}


export async function applySlotToAllClasses(data: {
  campusId: string
  level: string
  dayOfWeek: string
  session: string
  periodNumber: number
  subjectId?: string
  subjectName?: string
  teacherId?: string
  teacherName?: string
  weekType?: string
  altSubjectName?: string
  altTeacherName?: string
  colorCode?: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    const yearFilter = activeYear ? { academicYearId: activeYear.id } : {}

    let levelGradeFilter: any = {}
    if (data.level === "TIEU_HOC") {
      levelGradeFilter = { level: { in: ["Tiểu học", "Mầm non"] } }
    } else if (data.level === "TRUNG_HOC") {
      levelGradeFilter = { level: { in: ["THCS", "THPT"] } }
    }

    let targetClasses = await prisma.class.findMany({
      where: {
        status: "ACTIVE",
        ...(data.campusId ? { campusId: data.campusId } : {}),
        ...levelGradeFilter,
        ...yearFilter
      },
      select: { id: true, className: true }
    })

    if (targetClasses.length === 0 && data.campusId) {
      targetClasses = await prisma.class.findMany({
        where: {
          status: "ACTIVE",
          campusId: data.campusId,
          ...yearFilter
        },
        select: { id: true, className: true }
      })
    }

    let subId = data.subjectId || null
    if (!subId && data.subjectName) {
      const s = await prisma.subject.findFirst({ where: { subjectName: data.subjectName } })
      if (s) subId = s.id
    }

    let tId = data.teacherId || null
    if (!tId && data.teacherName) {
      const t = await prisma.teacher.findFirst({ where: { teacherName: data.teacherName } })
      if (t) tId = t.id
    }

    const updatedSlots: any[] = []

    for (const cls of targetClasses) {
      const existingSlot = await prisma.timetableSlot.findFirst({
        where: {
          classId: cls.id,
          dayOfWeek: data.dayOfWeek,
          session: data.session,
          periodNumber: data.periodNumber
        }
      })

      let savedSlot: any
      if (existingSlot) {
        savedSlot = await prisma.timetableSlot.update({
          where: { id: existingSlot.id },
          data: {
            campusId: data.campusId || existingSlot.campusId,
            level: data.level || existingSlot.level,
            academicYearId: activeYear?.id || existingSlot.academicYearId,
            subjectId: subId,
            subjectName: data.subjectName || null,
            teacherId: tId,
            teacherName: data.teacherName || null,
            weekType: data.weekType || "ALL",
            altSubjectName: data.altSubjectName || null,
            altTeacherName: data.altTeacherName || null,
            colorCode: data.colorCode || "#3B82F6"
          }
        })
      } else {
        savedSlot = await prisma.timetableSlot.create({
          data: {
            campusId: data.campusId,
            level: data.level,
            academicYearId: activeYear?.id || null,
            classId: cls.id,
            className: cls.className,
            dayOfWeek: data.dayOfWeek,
            session: data.session,
            periodNumber: data.periodNumber,
            subjectId: subId,
            subjectName: data.subjectName || null,
            teacherId: tId,
            teacherName: data.teacherName || null,
            weekType: data.weekType || "ALL",
            altSubjectName: data.altSubjectName || null,
            altTeacherName: data.altTeacherName || null,
            colorCode: data.colorCode || "#3B82F6"
          }
        })
      }
      updatedSlots.push(savedSlot)
    }

    revalidatePath("/admin/thoi-khoa-bieu")
    revalidatePath("/teacher/thoi-khoa-bieu")

    return {
      success: true,
      updatedCount: targetClasses.length,
      updatedSlots
    }
  } catch (e: any) {
    console.error("applySlotToAllClasses error:", e)
    return { success: false, error: e.message }
  }
}


export async function runAutoSchedulerWith10RulesAction(
  campusId: string,
  level: string,
  shhtConfig?: any
) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const initialData = await getTimetableMatrixData(campusId, level)
    if (!initialData.success) {
      return { success: false, error: "Không thể nạp dữ liệu lập lịch!" }
    }

    const { autoScheduleTimetableWith10Rules } = await import("./solver")
    const res = autoScheduleTimetableWith10Rules(
      campusId,
      level,
      initialData.classes,
      initialData.subjects,
      initialData.teachers,
      initialData.teachingAssignments,
      initialData.timetableSlots,
      shhtConfig
    )

    if (!res.success || !Array.isArray(res.generatedSlots)) {
      return { success: false, error: "Không thể tự động xếp thời khóa biểu!" }
    }

    const saveRes = await batchSaveAllTimetableSlots(campusId, level, res.generatedSlots)
    if (!saveRes.success) {
      return { success: false, error: saveRes.error || "Lỗi khi lưu thời khóa biểu tự động!" }
    }

    revalidatePath("/admin/thoi-khoa-bieu")
    revalidatePath("/teacher/thoi-khoa-bieu")

    return {
      success: true,
      stats: res.stats,
      generatedSlots: res.generatedSlots
    }
  } catch (e: any) {
    console.error("runAutoSchedulerWith10RulesAction error:", e)
    return { success: false, error: e.message }
  }
}
