"use server"
import {
  sendTeamsNewSlotDepartmentNotif,
  sendTeamsRequestApprovalNotif,
  sendTeamsApprovalWithEvalFormNotif,
  sendTeamsDeclineNotif,
  sendTeamsLackingObserversReminder,
  sendTeamsToAllDepartmentMembers
} from "@/lib/teams";
import { cookies } from "next/headers"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/mail"

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
    })

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" }
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

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" }
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

    
    // Guaranteed Email, Teams & In-App Notification Dispatch for Tag 1 (New Slot)
    try {
      const targetDeptIds = Array.isArray(data.targetDeptIds) && data.targetDeptIds.length > 0
        ? data.targetDeptIds
        : (newSlot.targetDeptId || currentTeacher.departmentId ? [newSlot.targetDeptId || currentTeacher.departmentId] : []);

      let deptMembers = [];
      if (targetDeptIds.length > 0) {
        deptMembers = await prisma.teacher.findMany({
          where: {
            OR: [
              { departmentId: { in: targetDeptIds } },
              { departmentAssignments: { some: { departmentId: { in: targetDeptIds } } } }
            ],
            status: "ACTIVE"
          },
          include: { user: true, departmentRel: true }
        });
      }

      // If custom member selection mode is active, filter only selected members
      if (data.notifMode === "SELECTED" && Array.isArray(data.selectedMemberIds) && data.selectedMemberIds.length > 0) {
        const selSet = new Set(data.selectedMemberIds);
        // Keep current teacher as well so they receive confirmation
        deptMembers = deptMembers.filter(m => selSet.has(m.id) || m.id === currentTeacher.id);
      }

      // Fallback only if no targetDeptId exists at all
      if (!targetDeptId && deptMembers.length === 0) {
        deptMembers = await prisma.teacher.findMany({
          where: { status: "ACTIVE" },
          take: 50,
          include: { user: true, departmentRel: true }
        });
      }

      // 1. In-App Notifications
      const notifData = deptMembers
        .filter(m => m.user?.id)
        .map(m => ({
          userId: m.user!.id,
          title: "Tiết dạy dự giờ mới trong Tổ chuyên môn",
          message: `Thầy/Cô ${currentTeacher.teacherName} vừa mở tiết dạy dự giờ mới (${newSlot.subjectName} - ${newSlot.topic}). Kính mời Thầy/Cô đăng ký tham dự.`,
          link: "/teacher/du-gio?tab=dang-ky",
          isRead: false
        }));

      if (notifData.length > 0) {
        await prisma.notification.createMany({ data: notifData }).catch(e => console.error("Notif error:", e));
      }

      // 2. Email Notification from bankhaothi@skylineschool.edu.vn
      const emailsList = new Set();
      if (currentTeacher.email) emailsList.add(currentTeacher.email);
      if ((currentTeacher as any).user?.email) emailsList.add((currentTeacher as any).user.email);

      for (const m of deptMembers) {
        if (m.email) emailsList.add(m.email);
        if (m.user?.email) emailsList.add(m.user.email);
      }

      const memberEmails = Array.from(emailsList).filter(e => typeof e === 'string' && e.includes("@")) as string[];
      console.log("[Skyline Email] Sending slot creation emails to:", memberEmails);

      if (data.sendEmailNotif !== false && memberEmails.length > 0) {
        const formattedDateVi = new Date(newSlot.date).toLocaleDateString("vi-VN");
        const linkUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://skyline-survey.vercel.app") + "/teacher/du-gio?tab=dang-ky";
        
        const emailSubject = `[Skyline - Dự Giờ] Tiết dạy mới: ${newSlot.subjectName} - ${currentTeacher.teacherName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: #00A99D; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 18px;">TIẾT DẠY DỰ GIỜ MỚI Trong TỔ CHUYÊN MÔN</h2>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Kính gửi Thầy/Cô trong <strong>Tổ chuyên môn</strong>,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Thầy/Cô <strong>${currentTeacher.teacherName}</strong> vừa mở một tiết dạy dự giờ mới cho Tổ chuyên môn. Kính mời Thầy/Cô đăng ký tham dự.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: bold; color: #475569; width: 40%;">Giáo viên dạy:</td><td style="padding: 10px 14px; color: #0f172a; font-weight: bold;">${currentTeacher.teacherName} (${currentTeacher.teacherCode})</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: bold; color: #475569;">Bài dạy / Chủ đề:</td><td style="padding: 10px 14px; color: #00A99D; font-weight: bold;">${newSlot.topic}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: bold; color: #475569;">Môn học & Lớp:</td><td style="padding: 10px 14px; color: #0f172a;">${newSlot.subjectName} (${newSlot.grade} - ${newSlot.className || "Lớp học"})</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: bold; color: #475569;">Cơ sở & Địa điểm:</td><td style="padding: 10px 14px; color: #0f172a;">${newSlot.campusName || "Trường"} - ${newSlot.room || "Phòng học"}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: bold; color: #475569;">Ngày dạy:</td><td style="padding: 10px 14px; color: #0f172a; font-weight: bold;">${formattedDateVi}</td></tr>
              <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569;">Tiết dạy:</td><td style="padding: 10px 14px; color: #0f172a;">${newSlot.startTime} - ${newSlot.endTime}</td></tr>
            </table>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${linkUrl}" style="background-color: #00A99D; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">🔗 Đăng Ký Dự Giờ Ngay Trực Tiếp Trên Skyline</a>
            </div>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              Thông báo tự động từ Hệ thống Quản lý Dự giờ Skyline (Khảo thí & ĐBCL)<br/>Email gửi mặc định từ: bankhaothi@skylineschool.edu.vn
            </div>
          </div>
        `;

        for (const targetEmail of memberEmails) {
          sendEmail({ to: targetEmail, subject: emailSubject, html: emailHtml }).catch(err => console.error("[Email Notification Error]:", err));
        }
      }

      // 3. Teams Notification
      const deptRel = (currentTeacher as any).departmentRel;
      sendTeamsToAllDepartmentMembers(
        {
          id: newSlot.id,
          topic: newSlot.topic,
          subjectName: newSlot.subjectName,
          level: newSlot.level,
          grade: newSlot.grade,
          className: newSlot.className,
          date: newSlot.date,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          campusName: newSlot.campusName,
          room: newSlot.room,
          teacherName: currentTeacher.teacherName,
          teacherCode: currentTeacher.teacherCode,
          maxSeats: newSlot.maxSeats || 4,
          registeredCount: 0
        },
        deptMembers.map(m => ({
          teacherName: m.teacherName,
          teacherCode: m.teacherCode,
          email: m.email || m.user?.email,
          teamsWebhookUrl: (m as any).teamsWebhookUrl
        })),
        deptRel?.teamsWebhookUrl
      ).catch(e => console.error("Teams broadcast error:", e));

    } catch (deptNotifErr) {
      console.error("Error sending department member notifications:", deptNotifErr);
    }



    // Send MS Teams Notification to Department Channel for new slot (Tag 1)
    try {
      const teacherWithDept = await prisma.teacher.findUnique({
        where: { id: currentTeacher.id },
        include: { departmentRel: true }
      });
      sendTeamsNewSlotDepartmentNotif({
        id: newSlot.id,
        topic: newSlot.topic,
        subjectName: newSlot.subjectName,
        level: newSlot.level,
        grade: newSlot.grade,
        className: newSlot.className,
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        campusName: newSlot.campusName,
        room: newSlot.room,
        teacherName: currentTeacher.teacherName,
        teacherCode: currentTeacher.teacherCode,
        maxSeats: newSlot.maxSeats || 4,
        registeredCount: 0
      }, teacherWithDept?.departmentRel as any).catch(err => console.error("MS Teams new slot error:", err));
    } catch (teamsErr) {
      console.error("Teams notification dispatch error:", teamsErr);
    }

    
    // Notify host teacher about observation request from GVBM
    try {
      if (hostTeacher.user?.id) {
        const formattedDate = new Date(data.date).toLocaleDateString("vi-VN");
        const notifTitle = `Thông báo đăng ký tiết dạy`;
        const notifMsg = `Thầy/Cô ${observerTeacher.teacherName} vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.`;

        await prisma.notification.create({
          data: {
            userId: hostTeacher.user.id,
            title: notifTitle,
            message: notifMsg,
            link: "/teacher/du-gio",
            isRead: false
          }
        });

        const hostEmail = hostTeacher.email || hostTeacher.user.email;
        if (data.sendEmailNotif !== false && hostEmail && hostEmail.includes("@")) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #00A99D; margin-top: 0;">Thông Báo Đề Xuất Xin Dự Giờ</h2>
              <p>Kính gửi Thầy/Cô <strong>${hostTeacher.teacherName}</strong>,</p>
              <p>Thầy/Cô <strong>${observerTeacher.teacherName}</strong> vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 40%;">Giáo viên xin dự giờ:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${observerTeacher.teacherName} (${observerTeacher.teacherCode})</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tên bài dạy / Chủ đề:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.topic || "Đề xuất xin dự giờ tiết học"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Môn học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.subjectName || "Môn học"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Cấp học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.level || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Khối lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.grade || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.className || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Ngày dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${formattedDate}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tiết dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.period || "Tiết 1"}</td></tr>
              </table>
              <p>Thầy/Cô vui lòng truy cập hệ thống Skyline để phê duyệt hoặc xem chi tiết yêu cầu.</p>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                Hệ thống Quản lý Dự giờ Skyline
              </div>
            </div>
          `;

          try {
            // Email sending disabled per configuration
// sendEmail call omitted
          } catch (mailErr) {
            console.error("Failed to send email for requestObservationSlot:", mailErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Error sending requestObservationSlot notification:", notifErr);
    }

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
      include: { registrations: true, teacher: { include: { user: true } } }
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

    // Notify host teacher about new observation registration
    try {
      if (slot.teacher?.user?.id) {
        const formattedDate = new Date(slot.date).toLocaleDateString("vi-VN");
        const notifTitle = `Thông báo đăng ký tiết dạy`;
        const notifMsg = `Thầy/Cô ${currentTeacher.teacherName} vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.`;

        await prisma.notification.create({
          data: {
            userId: slot.teacher.user.id,
            title: notifTitle,
            message: notifMsg,
            link: "/teacher/du-gio",
            isRead: false
          }
        });

        const hostEmail = slot.teacher.email || slot.teacher.user.email;
        if (hostEmail && hostEmail.includes("@")) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #00A99D; margin-top: 0;">Thông Báo Đăng Ký Dự Giờ</h2>
              <p>Kính gửi Thầy/Cô <strong>${slot.teacher.teacherName}</strong>,</p>
              <p>Thầy/Cô <strong>${currentTeacher.teacherName}</strong> vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 40%;">Giáo viên xin dự giờ:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${currentTeacher.teacherName} (${currentTeacher.teacherCode})</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tên bài dạy / Chủ đề:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.topic}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Môn học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.subjectName}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Cấp học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.level}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Khối lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.grade}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.className || "Chưa chọn"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Ngày dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${formattedDate}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tiết dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${slot.startTime} - ${slot.endTime}</td></tr>
              </table>
              <p>Thầy/Cô vui lòng kiểm tra danh sách người tham dự trên hệ thống Skyline.</p>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                Hệ thống Quản lý Dự giờ Skyline
              </div>
            </div>
          `;

          try {
            // Email sending disabled per configuration
// sendEmail call omitted
          } catch (mailErr) {
            console.error("Failed to send email to host teacher:", mailErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Error sending registerObservation notification:", notifErr);
    }

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

    // Send MS Teams confirmation with Evaluation Form link to Observer Teacher
    try {
      const regFull = await prisma.observationRegistration.findUnique({
        where: { id: registrationId },
        include: {
          teacher: { include: { departmentRel: true } },
          slot: { include: { teacher: true } }
        }
      });
      if (regFull && regFull.teacher) {
        sendTeamsApprovalWithEvalFormNotif(
          {
            id: regFull.slot.id,
            topic: regFull.slot.topic,
            subjectName: regFull.slot.subjectName,
            level: regFull.slot.level,
            grade: regFull.slot.grade,
            className: regFull.slot.className,
            date: regFull.slot.date,
            startTime: regFull.slot.startTime,
            endTime: regFull.slot.endTime,
            campusName: regFull.slot.campusName,
            room: regFull.slot.room
          },
          {
            teacherName: regFull.teacher.teacherName,
            teacherCode: regFull.teacher.teacherCode,
            email: regFull.teacher.email,
            teamsWebhookUrl: (regFull.teacher as any)?.departmentRel?.teamsWebhookUrl
          },
          currentTeacher.teacherName
        ).catch(err => console.error("Teams approval error:", err));
      }
    } catch (apprTeamsErr) {
      console.error("Teams approval dispatch error:", apprTeamsErr);
    }

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
    await prisma.$executeRawUnsafe(`ALTER TABLE "Teacher" ADD COLUMN "teamsWebhookUrl" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "teamsWebhookUrl" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "lastRemindedAt" DATETIME;`);
  } catch (e) {}
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
      include: { campus: true, departmentRel: true, user: true }
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

    // Notify host teacher (Chosen Teaching Teacher) about observation request from GVBM in Tag 2
    try {
      if (hostTeacher && hostTeacher.user?.id) {
        const formattedDate = new Date(data.date).toLocaleDateString("vi-VN");
        const notifTitle = "Thông báo đề xuất xin dự giờ mới";
        const notifMsg = `Thầy/Cô ${observerTeacher.teacherName} vừa đăng ký tiết dạy của bạn, vui lòng đăng nhập hệ thống và xác nhận.`;

        await prisma.notification.create({
          data: {
            userId: hostTeacher.user.id,
            title: notifTitle,
            message: notifMsg,
            link: "/teacher/du-gio",
            isRead: false
          }
        });

        const hostEmail = hostTeacher.email || hostTeacher.user.email;
        if (hostEmail && hostEmail.includes("@")) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #00A99D; margin-top: 0;">Thông Báo Đề Xuất Xin Dự Giờ</h2>
              <p>Kính gửi Thầy/Cô <strong>${hostTeacher.teacherName}</strong>,</p>
              <p>Thầy/Cô <strong>${observerTeacher.teacherName}</strong> vừa gửi đề xuất xin dự giờ tiết dạy của bạn tại Tag 2 (GVBM xin dự giờ), vui lòng đăng nhập hệ thống và xác nhận.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 40%;">Giáo viên xin dự giờ:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${observerTeacher.teacherName} (${observerTeacher.teacherCode})</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tên bài dạy / Chủ đề:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.topic || "Đề xuất xin dự giờ tiết học"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Môn học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.subjectName || "Môn học"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Cấp học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.level || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Khối lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.grade || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.className || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Ngày dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${formattedDate}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tiết dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.period || "Tiết 1"}</td></tr>
              </table>
              <p>Thầy/Cô vui lòng truy cập hệ thống Skyline để phê duyệt hoặc xem chi tiết yêu cầu.</p>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                Hệ thống Quản lý Dự giờ Skyline
              </div>
            </div>
          `;

          try {
            // Email sending disabled per configuration
// sendEmail call omitted
          } catch (mailErr) {
            console.error("Failed to send email for requestObservationSlot:", mailErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Error sending requestObservationSlot notification:", notifErr);
    }

        revalidatePath("/teacher/du-gio")
    revalidatePath("/admin/du-gio")

    // Notify all subject teachers (GVBM) in the same TCM (Tổ Chuyên Môn)
    try {
      const hostDeptId = currentTeacher.departmentId || data.targetDeptId;
      if (hostDeptId) {
        const tcmTeachers = await prisma.teacher.findMany({
          where: {
            departmentId: hostDeptId,
            id: { not: currentTeacher.id },
            status: "ACTIVE"
          },
          include: { user: true }
        });

        const formattedDate = new Date(data.date).toLocaleDateString("vi-VN");

        for (const t of tcmTeachers) {
          if (t.user?.id) {
            await prisma.notification.create({
              data: {
                userId: t.user.id,
                title: "Thông báo đăng ký tiết dự giờ mới",
                message: `Thầy/Cô ${currentTeacher.teacherName} vừa khởi tạo tiết dạy đăng ký dự giờ (${data.subjectName || "Môn học"} - ${data.topic || "Tiết dạy mở"}). Vui lòng đăng nhập hệ thống để đăng ký dự giờ.`,
                link: "/teacher/du-gio",
                isRead: false
              }
            });
          }

          const teacherEmail = t.email || t.user?.email;
          if (teacherEmail && teacherEmail.includes("@")) {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #00A99D; margin-top: 0;">Thông Báo Tiết Dạy Đăng Ký Dự Giờ Mới (Tổ Chuyên Môn)</h2>
                <p>Kính gửi Thầy/Cô <strong>${t.teacherName}</strong>,</p>
                <p>Thầy/Cô <strong>${currentTeacher.teacherName}</strong> thuộc Tổ Chuyên Môn vừa khởi tạo tiết dạy đăng ký dự giờ. Kính mời Thầy/Cô đăng nhập hệ thống để đăng ký dự giờ.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 40%;">Giáo viên đăng ký tiết dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${currentTeacher.teacherName} (${currentTeacher.teacherCode})</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tên bài dạy / Chủ đề:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.topic || "Tiết dạy đăng ký dự giờ"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Môn học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.subjectName || "Môn học"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Cấp học:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.level || "N/A"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Khối lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.grade || "N/A"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Lớp:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.className || "N/A"}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Ngày dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${formattedDate}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tiết dạy:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${data.startTime || "Tiết 1"}</td></tr>
                </table>
                <p>Thầy/Cô vui lòng truy cập hệ thống Skyline để xem chi tiết và chọn tiết đăng ký dự giờ.</p>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                  Hệ thống Quản lý Dự giờ Skyline
                </div>
              </div>
            `;

            try {
              // Email sending disabled per configuration
// sendEmail call omitted
            } catch (mailErr) {
              console.error("Failed to send email to TCM teacher:", mailErr);
            }
          }
        }
      }
    } catch (tcmNotifErr) {
      console.error("Error sending TCM notifications:", tcmNotifErr);
    }

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


export async function triggerSlotReminder(slotId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: { include: { departmentRel: true } },
        registrations: true
      }
    });

    if (!slot) return { success: false, error: "Không tìm thấy thông tin tiết dạy" };

    const regCount = slot.registrations.length;
    await sendTeamsLackingObserversReminder({
      id: slot.id,
      topic: slot.topic,
      subjectName: slot.subjectName,
      level: slot.level,
      grade: slot.grade,
      className: slot.className,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      campusName: slot.campusName,
      room: slot.room,
      teacherName: slot.teacher?.teacherName,
      teacherCode: slot.teacher?.teacherCode,
      maxSeats: slot.maxSeats || 4,
      registeredCount: regCount
    }, slot.teacher?.departmentRel as any);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}


export async function getDepartmentTeachers(departmentId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return [];
    
    const userTeacher = await prisma.teacher.findUnique({
      where: { userId: (session.user as any).id }
    });
    
    const targetDeptId = departmentId || userTeacher?.departmentId;
    if (!targetDeptId) {
      return await prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, teacherCode: true, teacherName: true, email: true }
      });
    }

    return await prisma.teacher.findMany({
      where: {
        OR: [
          { departmentId: targetDeptId },
          { departmentAssignments: { some: { departmentId: targetDeptId } } }
        ],
        status: "ACTIVE"
      },
      select: { id: true, teacherCode: true, teacherName: true, email: true }
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}
