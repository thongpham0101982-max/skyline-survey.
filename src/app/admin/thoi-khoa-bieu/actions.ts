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

    
    }

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

    return {
      success: true,
      campuses: campuses || [],
      selectedCampusId,
      classes: classes || [],
      subjects: subjects || [],
      teachers: teachers || [],
      timetableSlots: timetableSlots || [],
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

    const existingSlot = await prisma.timetableSlot.findFirst({
      where: {
        campusId: data.campusId,
        level: data.level,
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
          subjectId: data.subjectId || null,
          subjectName: data.subjectName || null,
          teacherId: data.teacherId || null,
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
          classId: data.classId,
          className: data.className,
          dayOfWeek: data.dayOfWeek,
          session: data.session,
          periodNumber: data.periodNumber,
          subjectId: data.subjectId || null,
          subjectName: data.subjectName || null,
          teacherId: data.teacherId || null,
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

    let savedCount = 0
    for (const slot of slotsData) {
      if (!slot.classId || !slot.dayOfWeek) continue
      const existing = await prisma.timetableSlot.findFirst({
        where: {
          campusId: campusId,
          level: level,
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
            subjectName: slot.subjectName || null,
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
            classId: slot.classId,
            className: slot.className || "Class",
            dayOfWeek: slot.dayOfWeek,
            session: slot.session || "MORNING",
            periodNumber: slot.periodNumber || 1,
            subjectName: slot.subjectName || null,
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
    return { success: false, error: e.message }
  }
}
