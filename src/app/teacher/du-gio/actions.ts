"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getObservationData() {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        campus: true
      }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    })

    const teachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true
      },
      orderBy: { teacherName: "asc" }
    })

    const campuses = await prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" }
    })

    const classes = await prisma.class.findMany({
      where: { status: "ACTIVE" },
      orderBy: { className: "asc" }
    })

    return {
      success: true,
      currentTeacher,
      subjects,
      departments,
      teachers,
      campuses,
      classes
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getObservationSlots(filters: {
    level?: string
    grade?: string
    period?: string
  date?: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const where: any = {
      status: "ACTIVE"
    }

    if (filters.level && filters.level !== "all") {
      where.level = filters.level
    }
    if (filters.subjectId && filters.subjectId !== "all") {
      where.subjectId = filters.subjectId
    }
    if (filters.grade && filters.grade !== "all") {
      where.grade = filters.grade
    }
    if (filters.teacherId && filters.teacherId !== "all") {
      where.teacherId = filters.teacherId
    }
    if (filters.date) {
      const filterDate = new Date(filters.date)
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())
      const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate() + 1)
      where.date = {
        gte: startOfDay,
        lt: endOfDay
      }
    }

    const slots = await prisma.observationSlot.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            email: true,
            departmentId: true,
            departmentRel: true,
            campusId: true,
            campus: {
              select: {
                campusName: true
              }
            }
          }
        },
        registrations: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                teacherCode: true,
                email: true
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: {
        date: "asc"
      }
    })

        // Filter by visibility and Khối CM
    const filteredSlots = slots.filter((slot) => {
      if (slot.visibilityType === "DEPARTMENT") {
        if (slot.teacherId !== currentTeacher.id && slot.targetDeptId !== currentTeacher.departmentId) {
          return false;
        }
      }
      
      const currentBlock = currentTeacher.departmentRel?.blockCM || "";
      const isCurrentMamNon = currentBlock.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
      
      // If current teacher is Mầm non, they only see Mầm non slots
      if (isCurrentMamNon) {
        const isSlotMamNon = slot.level?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
        if (!isSlotMamNon) {
          return false;
        }
      } else {
        // If current teacher is NOT Mầm non, they don't see Mầm non slots
        // assuming they are Phổ thông
        const isSlotMamNon = slot.level?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
        if (isSlotMamNon) {
          return false;
        }
      }
      
      return true;
    })

    return { success: true, slots: filteredSlots }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createObservationSlot(data: {
  subjectId?: string
  subjectName: string
  level: string
  grade: string
  topic: string
  date: string
  startTime: string
  endTime: string
  isDoublePeriod: boolean
  room?: string
  description?: string
  visibilityType: string
  targetDeptId?: string
  campusId?: string
  campusName?: string
  classId?: string
  className?: string
  lessonPlanName?: string
  lessonPlanData?: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    // 1. Verify monthly limit
    const slotDate = new Date(data.date)
    const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1)
    const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 1)

    const count = await prisma.observationSlot.count({
      where: {
        teacherId: currentTeacher.id,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        },
        status: "ACTIVE"
      }
    })

    if (count >= 2) {
      return {
        success: false,
        error: `Thầy/Cô đã đạt giới hạn tạo tối đa 2 tiết dạy trong tháng ${slotDate.getMonth() + 1}/${slotDate.getFullYear()}.`
      }
    }

    // 2. Create slot
    const newSlot = await prisma.observationSlot.create({
      data: {
        teacherId: currentTeacher.id,
        subjectId: data.subjectId || null,
        subjectName: data.subjectName,
        level: data.level,
        grade: data.grade,
        topic: data.topic,
        date: slotDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isDoublePeriod: data.isDoublePeriod,
        room: data.room || null,
        description: data.description || null,
        visibilityType: data.visibilityType,
        targetDeptId: data.targetDeptId || null,
        maxSeats: 10,
        status: "ACTIVE",
        campusId: data.campusId || null,
        campusName: data.campusName || null,
        classId: data.classId || null,
        className: data.className || null,
        lessonPlanName: data.lessonPlanName || null,
        lessonPlanData: data.lessonPlanData || null
      }
    })

    revalidatePath("/teacher/du-gio")
    return { success: true, slot: newSlot }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function registerObservation(slotId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: { registrations: true }
    })

    if (!slot) {
      return { success: false, error: "Observation slot not found" }
    }

    if (slot.status !== "ACTIVE") {
      return { success: false, error: "This slot is no longer active" }
    }

    if (slot.teacherId === currentTeacher.id) {
      return { success: false, error: "You cannot register to observe your own slot" }
    }

    if (slot.registrations.some((r) => r.teacherId === currentTeacher.id)) {
      return { success: false, error: "You are already registered for this slot" }
    }

    if (slot.registrations.length >= slot.maxSeats) {
      return { success: false, error: "This slot is fully booked" }
    }

    await prisma.observationRegistration.create({
      data: {
        slotId,
        teacherId: currentTeacher.id
      }
    })

    revalidatePath("/teacher/du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function cancelObservation(slotId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    await prisma.observationRegistration.deleteMany({
      where: {
        slotId,
        teacherId: currentTeacher.id
      }
    })

    revalidatePath("/teacher/du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteObservationSlot(slotId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId }
    })

    if (!slot) {
      return { success: false, error: "Slot not found" }
    }

    if (slot.teacherId !== currentTeacher.id) {
      return { success: false, error: "You can only delete your own hosted slots" }
    }

    await prisma.observationSlot.delete({
      where: { id: slotId }
    })

    revalidatePath("/teacher/du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getCreatedCountInMonth(dateString: string) {
  try {
    const session = await auth()
    if (!session || !session.user) return { success: false, count: 0 }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) return { success: false, count: 0 }

    const slotDate = new Date(dateString)
    const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1)
    const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 1)

    const count = await prisma.observationSlot.count({
      where: {
        teacherId: currentTeacher.id,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        },
        status: "ACTIVE"
      }
    })

    return { success: true, count }
  } catch (e: any) {
    return { success: false, count: 0 }
  }
}

export async function approveRegistration(registrationId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }
    const currentTeacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!currentTeacher) return { success: false, error: "Teacher profile not found" }
    const registration = await prisma.observationRegistration.findUnique({ where: { id: registrationId }, include: { slot: true } })
    if (!registration) return { success: false, error: "Registration not found" }
    if (registration.slot.teacherId !== currentTeacher.id) return { success: false, error: "Bạn không phải giáo viên chủ trì tiết dạy này" }
    await prisma.observationRegistration.update({ where: { id: registrationId }, data: { isApproved: true, approvedAt: new Date() } })
    revalidatePath("/teacher/du-gio")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function submitEvaluation(data: {
  registrationId: string
  slotId: string
  criterion1?: number
  criterion2?: number
  criterion3?: number
  criterion4?: number
  criterion5?: number
  score1?: number
  score2?: number
  score3?: number
  score4?: number
  score5?: number
  score6?: number
  score7?: number
  score8?: number
  score9?: number
  score10?: number
  score11?: number
  totalScore?: number
  strengths: string
  improvements: string
  generalComment: string
  overallRating: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }
    const currentTeacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!currentTeacher) return { success: false, error: "Teacher profile not found" }
    const registration = await prisma.observationRegistration.findUnique({ where: { id: data.registrationId }, include: { evaluation: true } })
    if (!registration) return { success: false, error: "Không tìm thấy đăng ký dự giờ" }
    if (registration.teacherId !== currentTeacher.id) return { success: false, error: "Không có quyền nộp phiếu này" }
    if (!registration.isApproved) return { success: false, error: "Cần được xác nhận dự giờ trước khi nộp phiếu đánh giá" }
    const evalData = {
      criterion1: data.criterion1 ?? null,
      criterion2: data.criterion2 ?? null,
      criterion3: data.criterion3 ?? null,
      criterion4: data.criterion4 ?? null,
      criterion5: data.criterion5 ?? null,
      score1: data.score1 ?? null,
      score2: data.score2 ?? null,
      score3: data.score3 ?? null,
      score4: data.score4 ?? null,
      score5: data.score5 ?? null,
      score6: data.score6 ?? null,
      score7: data.score7 ?? null,
      score8: data.score8 ?? null,
      score9: data.score9 ?? null,
      score10: data.score10 ?? null,
      score11: data.score11 ?? null,
      totalScore: data.totalScore ?? null,
      strengths: data.strengths,
      improvements: data.improvements,
      generalComment: data.generalComment,
      overallRating: data.overallRating
    }
    if (registration.evaluation) {
      await prisma.observationEvaluation.update({ where: { registrationId: data.registrationId }, data: evalData })
    } else {
      await prisma.observationEvaluation.create({
        data: { registrationId: data.registrationId, slotId: data.slotId, evaluatorId: currentTeacher.id, ...evalData }
      })
    }
    revalidatePath("/teacher/du-gio")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
