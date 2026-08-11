"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function ensureTimetableTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TimetableSlot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "academicYearId" TEXT,
        "campusId" TEXT,
        "level" TEXT NOT NULL DEFAULT 'TIEU_HOC',
        "grade" TEXT NOT NULL DEFAULT 'K1',
        "classId" TEXT,
        "className" TEXT NOT NULL,
        "dayOfWeek" TEXT NOT NULL,
        "session" TEXT NOT NULL DEFAULT 'MORNING',
        "periodNumber" INTEGER NOT NULL DEFAULT 1,
        "subjectId" TEXT,
        "subjectName" TEXT,
        "teacherId" TEXT,
        "teacherName" TEXT,
        "weekType" TEXT NOT NULL DEFAULT 'ALL',
        "altSubjectName" TEXT,
        "altTeacherName" TEXT,
        "colorCode" TEXT DEFAULT '#3B82F6',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error("ensureTimetableTable error:", e);
  }
}

export async function getTimetableMatrixData(campusId?: string, level: string = "TIEU_HOC") {
  try {
    await ensureTimetableTable();
    const session = await auth()

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

    const classes = await prisma.class.findMany({
      where: {
        status: "ACTIVE",
        ...(selectedCampusId ? { campusId: selectedCampusId } : {}),
        ...levelGradeFilter
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
    await ensureTimetableTable();
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
