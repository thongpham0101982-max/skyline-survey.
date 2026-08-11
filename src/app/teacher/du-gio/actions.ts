"use server"
import { cookies } from "next/headers"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getObservationData(academicYearId?: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        departmentAssignments: {
          include: { department: true }
        },
        campus: true,
        user: {
          select: {
            role: true
          }
        }
      }
    }).catch(() => null)

    if (!currentTeacher && session.user.email) {
      currentTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: session.user.email },
            { teacherCode: session.user.email },
            { teacherCode: session.user.email.split('@')[0] }
          ]
        },
        include: {
          departmentRel: true,
          departmentAssignments: {
            include: { department: true }
          },
          campus: true,
          user: {
            select: {
              role: true
            }
          }
        }
      }).catch(() => null)
    }

    if (!currentTeacher && isAdmin) {
      currentTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null,
        departmentId: "",
        campusId: "",
        position: "ADMIN",
        observerType: "Ban ĐHCM",
        observeeType: "Giáo viên cũ",
        requiredObserved: 0,
        observedUnit: "tháng",
        requiredTaught: 0,
        taughtUnit: "tháng",
        departmentRel: { id: "", code: "ADMIN", name: "Ban giám hiệu", blockCM: "" },
        campus: { id: "", campusCode: "ADMIN", campusName: "Trụ sở chính" }
      } as any
    }

    if (!currentTeacher) {
      currentTeacher = {
        id: session.user.id,
        teacherName: session.user.name || "Giáo viên",
        teacherCode: session.user.email ? session.user.email.split('@')[0] : "GV",
        email: session.user.email || null,
        departmentId: "",
        campusId: "",
        position: "GV",
        observerType: "Giáo viên bộ môn",
        observeeType: "Giáo viên cũ",
        requiredObserved: 0,
        observedUnit: "tháng",
        requiredTaught: 0,
        taughtUnit: "tháng",
        departmentRel: null,
        campus: null
      } as any
    }

    const rawAcademicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true }
    })

    const selectedYear = academicYearId
      ? rawAcademicYears.find(y => y.id === academicYearId)
      : rawAcademicYears.find(y => y.status === "ACTIVE") || rawAcademicYears[0];

    const activeYearId = selectedYear?.id || null;

    // Deduplicate by name and filter by status === "ACTIVE"
    const seenNames = new Set()
    let academicYears = rawAcademicYears.filter(y => {
      if (y.status !== "ACTIVE") return false
      if (seenNames.has(y.name)) return false
      seenNames.add(y.name)
      return true
    })

    // If no active year is found, only show the selectedYear to avoid displaying multiple inactive years
    if (academicYears.length === 0 && selectedYear) {
      academicYears = [selectedYear]
    }

    let activeYearTarget = null
    if (activeYearId && currentTeacher && !isAdmin) {
      activeYearTarget = await prisma.teacherAcademicYearTarget.findUnique({
        where: {
          teacherId_academicYearId: {
            teacherId: currentTeacher.id,
            academicYearId: activeYearId
          }
        }
      })
    }

    if (!currentTeacher && isAdmin) {
      currentTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null,
        departmentId: "",
        campusId: "",
        position: "ADMIN",
        observerType: "Ban ĐHCM",
        observeeType: "Giáo viên cũ",
        requiredObserved: 0,
        observedUnit: "tháng",
        requiredTaught: 0,
        taughtUnit: "tháng",
        departmentRel: {
          id: "",
          code: "ADMIN",
          name: "Ban giám hiệu",
          blockCM: ""
        },
        campus: {
          id: "",
          campusCode: "ADMIN",
          campusName: "Trụ sở chính"
        }
      } as any;
    } else if (currentTeacher) {
      currentTeacher = {
        ...currentTeacher,
        observerType: activeYearTarget?.observerType || null,
        observeeType: activeYearTarget?.observeeType || null,
        requiredObserved: activeYearTarget?.requiredObserved || 0,
        observedUnit: activeYearTarget?.observedUnit || "tháng",
        requiredTaught: activeYearTarget?.requiredTaught || 0,
        taughtUnit: activeYearTarget?.taughtUnit || "tháng"
      } as any
    }

    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    })

    const rawTeachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        departmentId: true,
        position: true
      },
      orderBy: { teacherName: "asc" }
    })

    const allTargets = activeYearId ? await prisma.teacherAcademicYearTarget.findMany({
      where: { academicYearId: activeYearId }
    }) : []

    const targetsMap = new Map(allTargets.map(t => [t.teacherId, t]))

    const teachers = rawTeachers.map(t => {
      const target = targetsMap.get(t.id)
      return {
        ...t,
        observerType: target?.observerType || null,
        observeeType: target?.observeeType || null,
        requiredObserved: target?.requiredObserved || 0,
        observedUnit: target?.observedUnit || "tháng",
        requiredTaught: target?.requiredTaught || 0,
        taughtUnit: target?.taughtUnit || "tháng"
      }
    })

    const campuses = await prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" }
    })

    const classes = await prisma.class.findMany({
      where: {
        status: "ACTIVE",
        ...(activeYearId ? { academicYearId: activeYearId } : { academicYear: { status: "ACTIVE" } })
      },
      select: { id: true, classCode: true, className: true, level: true, grade: true, campusId: true, academicYearId: true },
      orderBy: { className: "asc" }
    })

    return {
      success: true,
      currentTeacher,
      subjects,
      departments,
      teachers,
      campuses,
      classes,
      academicYears,
      selectedYearId: activeYearId
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getObservationSlots(filters: {
    schoolBlock?: string
    campusId?: string
    deptId?: string
    level?: string
    grade?: string
    period?: string
    date?: string
    academicYearId?: string
}) {
  try {
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    }).catch(() => null)

    if (!currentTeacher && session.user.email) {
      currentTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: session.user.email },
            { teacherCode: session.user.email },
            { teacherCode: session.user.email.split('@')[0] }
          ]
        }
      }).catch(() => null)
    }

    if (!currentTeacher && isAdmin) {
      currentTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null,
        departmentId: null,
        campusId: ""
      } as any
    }

    if (!currentTeacher) {
      currentTeacher = {
        id: session.user.id,
        teacherName: session.user.name || "Giáo viên",
        teacherCode: session.user.email ? session.user.email.split('@')[0] : "GV",
        email: session.user.email || null,
        departmentId: null,
        campusId: ""
      } as any
    }

    const activeYear = filters.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: filters.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })

    const where: any = {
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN"] }
    }

    if (activeYear) {
      where.OR = [
        { academicYearId: activeYear.id },
        { academicYearId: null }
      ]
    }

    if (filters.level && filters.level !== "all") {
      if (filters.level === "Phổ thông K-12") {
        where.level = { in: ["Tiểu học", "THCS", "THPT", "Phổ thông K-12"] };
      } else {
        where.level = filters.level;
      }
    }
    if (filters.grade && filters.grade !== "all") {
      where.grade = filters.grade
    }
    if (filters.period && filters.period !== "all") {
      where.startTime = filters.period
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
    if (filters.campusId && filters.campusId !== "all") {
      where.campusId = filters.campusId
    }
    if (filters.deptId && filters.deptId !== "all") {
      where.teacher = {
        departmentId: filters.deptId
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
            departmentAssignments: {
              include: {
                department: true
              }
            },
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
        departmentId: true,
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

        // Filter by visibility and Khối CM with multi-department support
    const filteredSlots = slots.filter((slot) => {
      if (isAdmin) {
        return true;
      }
      if (slot.teacherId === currentTeacher?.id) {
        return true;
      }
      if (slot.visibilityType === "DEPARTMENT") {
        if (!currentTeacher) return false;
        
        const myDeptIds = new Set<string>();
        if (currentTeacher.departmentId) myDeptIds.add(currentTeacher.departmentId);
        if ((currentTeacher as any).departmentAssignments && Array.isArray((currentTeacher as any).departmentAssignments)) {
          (currentTeacher as any).departmentAssignments.forEach((da: any) => {
            if (da.departmentId) myDeptIds.add(da.departmentId);
          });
        }

        const slotTeacherDeptIds = new Set<string>();
        if (slot.teacher?.departmentId) slotTeacherDeptIds.add(slot.teacher.departmentId);
        if (slot.targetDeptId) slotTeacherDeptIds.add(slot.targetDeptId);
        if (slot.teacher?.departmentAssignments && Array.isArray(slot.teacher.departmentAssignments)) {
          slot.teacher.departmentAssignments.forEach((da: any) => {
            if (da.departmentId) slotTeacherDeptIds.add(da.departmentId);
          });
        }

        if (slot.targetDeptId && myDeptIds.has(slot.targetDeptId)) return true;

        for (const id of slotTeacherDeptIds) {
          if (myDeptIds.has(id)) return true;
        }

        if (!slot.targetDeptId) return true;

        return false;
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

    // 1. Verify monthly limit and create slot inside transaction
    const slotDate = new Date(data.date)
    const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1)
    const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 1)

    const cookieStore = await cookies();
    const cookieYearId = cookieStore.get("selectedAcademicYear")?.value;
    let yearId = cookieYearId || null;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } });
      if (!yearExists) yearId = null;
    }

    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      })

      const matchingYear = activeYear ? await prisma.academicYear.findFirst({
        where: {
          startDate: { lte: slotDate },
          endDate: { gte: slotDate }
        }
      }) : null

      yearId = matchingYear?.id || activeYear?.id || null
    }

    const newSlot = await prisma.$transaction(async (tx) => {
      const count = await tx.observationSlot.count({
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
        throw new Error(`Thầy/Cô đã đạt giới hạn tạo tối đa 2 tiết dạy trong tháng ${slotDate.getMonth() + 1}/${slotDate.getFullYear()}.`)
      }

      return await tx.observationSlot.create({
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
          targetDeptId: data.targetDeptId || currentTeacher.departmentId || null,
          maxSeats: 4,
          status: "ACTIVE",
          campusId: data.campusId || null,
          campusName: data.campusName || null,
          classId: data.classId || null,
          className: data.className || null,
          lessonPlanName: data.lessonPlanName || null,
          lessonPlanData: data.lessonPlanData || null,
          academicYearId: yearId
        }
      })
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
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

    // Chặn đăng ký dự giờ tiết dạy đã diễn ra trong quá khứ (Cho phép thời gian trễ trong vòng 30 ngày để nộp bù đánh giá)
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() - 30)
    if (new Date(slot.date) < limitDate) {
      return { success: false, error: "Không thể đăng ký dự giờ tiết dạy đã diễn ra quá 30 ngày." }
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

    if (slot.registrations.length >= Math.min(slot.maxSeats || 4, 4)) {
      return { success: false, error: "This slot is fully booked" }
    }

    await prisma.observationRegistration.create({
      data: {
        slotId,
        teacherId: currentTeacher.id
      }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
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

    // Kiểm tra xem đã nộp phiếu đánh giá hoặc tiết học đã diễn ra hay chưa
    const registration = await prisma.observationRegistration.findFirst({
      where: { slotId, teacherId: currentTeacher.id },
      include: { evaluation: true, slot: true }
    });
    if (registration) {
      if (registration.evaluation) {
        return { success: false, error: "Thầy/Cô đã nộp phiếu đánh giá. Không thể hủy đăng ký dự giờ." }
      }
      if (new Date(registration.slot.date) <= new Date()) {
        return { success: false, error: "Tiết dạy đã diễn ra. Không thể hủy đăng ký dự giờ." }
      }
    }

    await prisma.observationRegistration.deleteMany({
      where: {
        slotId,
        teacherId: currentTeacher.id
      }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
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

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId }
    })

    if (!slot) {
      return { success: false, error: "Không tìm thấy thông tin tiết dạy" }
    }

    if (currentTeacher && slot.teacherId !== currentTeacher.id && !isAdmin) {
      return { success: false, error: "Thầy/Cô chỉ có thể hủy tiết dạy do chính mình khởi tạo" }
    }

    // Delete evaluations & registrations linked to this slot first
    await prisma.observationEvaluation.deleteMany({
      where: { registration: { slotId } }
    })

    await prisma.observationRegistration.deleteMany({
      where: { slotId }
    })

    await prisma.observationSlot.delete({
      where: { id: slotId }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
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
    
    // Enforce max 4 approved observers limit
    const approvedCount = await prisma.observationRegistration.count({
      where: { slotId: registration.slotId, isApproved: true }
    })
    if (approvedCount >= 4) {
      return { success: false, error: "Tiết dạy này đã đạt tối đa 4 giáo viên dự giờ được xác nhận." }
    }

    await prisma.observationRegistration.update({ where: { id: registrationId }, data: { isApproved: true, approvedAt: new Date() } })
    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
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
    const registration = await prisma.observationRegistration.findUnique({ 
      where: { id: data.registrationId }, 
      include: { evaluation: true, slot: true } 
    })
    if (!registration) return { success: false, error: "Không tìm thấy đăng ký dự giờ" }
    
    // Chặn nộp chấm điểm sớm khi tiết học chưa diễn ra
    if (new Date(registration.slot.date) > new Date()) {
      return { success: false, error: "Tiết học chưa diễn ra. Không thể nộp phiếu đánh giá trước thời gian học." }
    }
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
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function updateObservationSlot(slotId: string, data: {
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

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId }
    })

    if (!slot) {
      return { success: false, error: "Observation slot not found" }
    }

    if (slot.teacherId !== currentTeacher.id) {
      return { success: false, error: "You can only edit your own observation slots" }
    }

    const slotDate = new Date(data.date)

    const cookieStore = await cookies();
    const cookieYearId = cookieStore.get("selectedAcademicYear")?.value;
    let yearId = cookieYearId || null;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } });
      if (!yearExists) yearId = null;
    }

    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      })

      const matchingYear = activeYear ? await prisma.academicYear.findFirst({
        where: {
          startDate: { lte: slotDate },
          endDate: { gte: slotDate }
        }
      }) : null

      yearId = matchingYear?.id || activeYear?.id || null
    }

    const updatedSlot = await prisma.observationSlot.update({
      where: { id: slotId },
      data: {
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
        campusId: data.campusId || null,
        campusName: data.campusName || null,
        classId: data.classId || null,
        className: data.className || null,
        lessonPlanName: data.lessonPlanName !== undefined ? data.lessonPlanName : slot.lessonPlanName,
        lessonPlanData: data.lessonPlanData !== undefined ? data.lessonPlanData : slot.lessonPlanData,
        academicYearId: yearId
      }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
    return { success: true, slot: updatedSlot }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTeacherObservationTargets(
  teacherId: string,
  data: {
    observerType?: string | null
    observeeType?: string | null
    requiredObserved: number
    observedUnit: string
    requiredTaught: number
    taughtUnit: string
  }
) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isSuperAdmin = roleCode === "ADMIN"
    const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    // Also allow TTCM or the teacher themselves to update their own targets
    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true, position: true, departmentId: true }
    })

    const isTTCM = currentTeacher?.position === "TTCM"
    const isSelf = currentTeacher && currentTeacher.id === teacherId

    if (!isSuperAdmin && !isTTCM && !isSelf && !isGDCS) {
      return { success: false, error: "Bạn không có quyền cấu hình chỉ tiêu" }
    }

    // If they are TTCM, make sure the target teacher is in their department (unless editing themselves)
    if (isTTCM && !isSuperAdmin && !isSelf) {
      const targetTeacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { departmentId: true }
      })
      if (!targetTeacher || targetTeacher.departmentId !== currentTeacher.departmentId) {
        return { success: false, error: "Bạn chỉ có thể cấu hình chỉ tiêu cho giáo viên thuộc tổ của mình" }
      }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    if (!activeYear) {
      return { success: false, error: "Không tìm thấy năm học hoạt động" }
    }

    await prisma.teacherAcademicYearTarget.upsert({
      where: {
        teacherId_academicYearId: {
          teacherId: teacherId,
          academicYearId: activeYear.id
        }
      },
      update: {
        observerType: data.observerType || null,
        observeeType: data.observeeType || null,
        requiredObserved: data.requiredObserved,
        observedUnit: data.observedUnit,
        requiredTaught: data.requiredTaught,
        taughtUnit: data.taughtUnit,
        confirmed: true,
        confirmedAt: new Date()
      },
      create: {
        teacherId: teacherId,
        academicYearId: activeYear.id,
        observerType: data.observerType || null,
        observeeType: data.observeeType || null,
        requiredObserved: data.requiredObserved,
        observedUnit: data.observedUnit,
        requiredTaught: data.requiredTaught,
        taughtUnit: data.taughtUnit,
        confirmed: true,
        confirmedAt: new Date()
      }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")
    revalidatePath("/admin/tong-hop-du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}




async function ensureDbColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "requestOrigin" TEXT DEFAULT 'TEACHER_OPEN';`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "rejectionReason" TEXT;`);
  } catch (e) {}
}

export async function requestObservationSlot(data: {
  targetTeacherId: string
  targetDeptId?: string
  classId?: string
  className?: string
  level?: string
  grade?: string
  subjectId?: string
  subjectName?: string
  topic?: string
  date: string
  period?: string
  room?: string
  notes?: string
  academicYearId?: string
}) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    let observerTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!observerTeacher && isAdmin) {
      observerTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null
      } as any
    }

    if (!observerTeacher) {
      return { success: false, error: "Tài khoản của bạn chưa được gắn với hồ sơ Nhân sự/Giáo viên." }
    }

    const hostTeacher = await prisma.teacher.findUnique({
      where: { id: data.targetTeacherId },
      include: { campus: true, departmentRel: true }
    })

    if (!hostTeacher) {
      return { success: false, error: "Không tìm thấy thông tin Giáo viên dạy." }
    }

    const activeYear = data.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: data.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })

    const periodMap: Record<string, { start: string; end: string }> = {
      "Tiết 1": { start: "07:30", end: "08:15" },
      "Tiết 2": { start: "08:25", end: "09:10" },
      "Tiết 3": { start: "09:30", end: "10:15" },
      "Tiết 4": { start: "10:25", end: "11:10" },
      "Tiết 5": { start: "13:00", end: "13:45" },
      "Tiết 6": { start: "13:55", end: "14:40" },
      "Tiết 7": { start: "15:00", end: "15:45" },
      "Tiết 8": { start: "15:55", end: "16:40" }
    }

    const timeRange = periodMap[data.period || "Tiết 1"] || { start: "07:30", end: "08:15" }

    const slotDate = new Date(data.date)

    let newSlot: any;
    try {
      newSlot = await prisma.observationSlot.create({
        data: {
          teacherId: hostTeacher.id,
          targetDeptId: data.targetDeptId || hostTeacher.departmentId || null,
          classId: data.classId || null,
          className: data.className || "Lớp chọn",
          level: data.level || "ALL",
          grade: data.grade || "Khối",
          subjectId: data.subjectId || null,
          subjectName: data.subjectName || "Môn học",
          topic: data.topic || "Đề xuất xin dự giờ tiết học",
          date: slotDate,
          startTime: data.period || timeRange.start,
          endTime: timeRange.end,
          room: data.room || "Phòng học",
          description: data.notes || "Yêu cầu xin dự giờ từ GVBM",
          visibilityType: "PUBLIC",
          maxSeats: 4,
          status: "PENDING_TEACHER_APPROVAL",
          requestOrigin: "OBSERVER_REQUEST",
          academicYearId: activeYear?.id || null,
          campusId: hostTeacher.campusId || null,
          campusName: hostTeacher.campus?.campusName || null
        }
      });
    } catch (createErr: any) {
      if (createErr?.message?.includes("requestOrigin") || createErr?.message?.includes("no column named")) {
        newSlot = await prisma.observationSlot.create({
          data: {
            teacherId: hostTeacher.id,
            targetDeptId: data.targetDeptId || hostTeacher.departmentId || null,
            classId: data.classId || null,
            className: data.className || "Lớp chọn",
            level: data.level || "ALL",
            grade: data.grade || "Khối",
            subjectId: data.subjectId || null,
            subjectName: data.subjectName || "Môn học",
            topic: data.topic || "Đề xuất xin dự giờ tiết học",
            date: slotDate,
            startTime: data.period || timeRange.start,
            endTime: timeRange.end,
            room: data.room || "Phòng học",
            description: (data.notes ? data.notes + " | " : "") + "[GVBM_XIN_DU_GIO]",
            visibilityType: "PUBLIC",
            maxSeats: 4,
            status: "PENDING_TEACHER_APPROVAL",
            academicYearId: activeYear?.id || null,
            campusId: hostTeacher.campusId || null,
            campusName: hostTeacher.campus?.campusName || null
          }
        });
      } else {
        throw createErr;
      }
    }

    // Automatically register observer
    if (observerTeacher && observerTeacher.id && !observerTeacher.id.startsWith("admin-")) {
      await prisma.observationRegistration.create({
        data: {
          slotId: newSlot.id,
          teacherId: observerTeacher.id,
          isApproved: false
        }
      })
    }

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")

    return { success: true, slot: newSlot }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function respondToObservationRequest(slotId: string, accept: boolean, reason?: string) {
  // Ensure DB columns exist
  await ensureDbColumns();
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: { registrations: true }
    })

    if (!slot) {
      return { success: false, error: "Không tìm thấy thông tin tiết dự giờ." }
    }

    if (accept) {
      await prisma.observationSlot.update({
        where: { id: slotId },
        data: {
          status: "ACTIVE"
        }
      })

      // Approve registrations
      await prisma.observationRegistration.updateMany({
        where: { slotId },
        data: {
          isApproved: true,
          approvedAt: new Date()
        }
      })
    } else {
      try {
        await prisma.observationSlot.update({
          where: { id: slotId },
          data: {
            status: "REJECTED",
            rejectionReason: reason || "Giáo viên từ chối"
          }
        })
      } catch (err: any) {
        if (err?.message?.includes("rejectionReason") || err?.message?.includes("no column named")) {
          await prisma.observationSlot.update({
            where: { id: slotId },
            data: {
              status: "REJECTED"
            }
          })
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
