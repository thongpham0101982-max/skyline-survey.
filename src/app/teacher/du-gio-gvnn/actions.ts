// @ts-nocheck
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getForeignObservationData(academicYearId?: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const roleCode = (session.user as any)?.role || "TEACHER";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "BGH",
      "SUPER_ADMIN",
      "BAN_GIAM_HIEU",
      "TIEU_BAN_CHUYEN_MON",
      "TO_TRUONG_CHUYEN_MON"
    ].includes(roleCode.toUpperCase());

    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" }
    });

    const activeYear = academicYearId
      ? academicYears.find(y => y.id === academicYearId)
      : academicYears.find(y => y.status === "ACTIVE") || academicYears[0];

    const activeYearId = activeYear?.id;

    // Load current teacher
    let currentTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { email: session.user.email || "" },
          { id: session.user.id }
        ]
      },
      include: {
        departmentRel: {
          select: { id: true, code: true, name: true, blockCM: true }
        },
        departmentAssignments: {
          include: {
            department: { select: { id: true, code: true, name: true, blockCM: true } }
          }
        },
        campus: {
          select: { id: true, campusCode: true, campusName: true }
        }
      }
    });

    const activeYearTarget = currentTeacher && activeYearId
      ? await prisma.teacherAcademicYearTarget.findUnique({
          where: {
            teacherId_academicYearId: {
              teacherId: currentTeacher.id,
              academicYearId: activeYearId
            }
          }
        })
      : null;

    if (isAdmin && !currentTeacher) {
      currentTeacher = {
        id: session.user.id,
        teacherName: session.user.name || "BGH / Administrator",
        teacherCode: "ADMIN",
        email: session.user.email,
        position: "QLCM",
        departmentRel: { id: "ADMIN", name: "Ban Giám Hiệu / QLCM", code: "BGH" },
        requiredObserved: 0,
        requiredTaught: 0
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
      } as any;
    }

    // Load all active departments
    const allDepartments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    });

    // Load all active teachers with full relations matching Teacher Management
    const rawTeachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      include: {
        departmentRel: {
          select: { id: true, code: true, name: true, blockCM: true }
        },
        departmentAssignments: {
          include: {
            department: { select: { id: true, code: true, name: true, blockCM: true } }
          }
        },
        mainSubjectRel: {
          select: { id: true, subjectName: true }
        },
        campus: {
          select: { id: true, campusCode: true, campusName: true }
        },
        classes: {
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                className: true,
                grade: true,
                level: true,
                campusId: true
              }
            }
          }
        }
      },
      orderBy: { teacherName: "asc" }
    });

    const allTargets = activeYearId
      ? await prisma.teacherAcademicYearTarget.findMany({
          where: { academicYearId: activeYearId }
        })
      : [];

    const targetsMap = new Map(allTargets.map(t => [t.teacherId, t]));

    const teachers = rawTeachers.map(t => {
      const target = targetsMap.get(t.id);
      return {
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        email: t.email,
        position: t.position || "GV",
        campusId: t.campusId,
        campus: t.campus?.campusName || "",
        campusObj: t.campus,
        department: t.departmentRel?.name || "",
        departmentId: t.departmentId || t.departmentRel?.id || "",
        departmentRel: t.departmentRel,
        departmentAssignments: (t.departmentAssignments || []).map((da: any) => ({
          id: da.id,
          departmentId: da.departmentId || da.department?.id,
          departmentName: da.department?.name || "",
          departmentCode: da.department?.code || "",
          position: da.position
        })),
        classes: t.classes || [],
        observerType: target?.observerType || null,
        observeeType: target?.observeeType || null,
        requiredObserved: target?.requiredObserved || 0,
        observedUnit: target?.observedUnit || "tháng",
        requiredTaught: target?.requiredTaught || 0,
        taughtUnit: target?.taughtUnit || "tháng"
      };
    });

    const campuses = await prisma.campus.findMany({
      where: { NOT: { status: "INACTIVE" } },
      orderBy: { campusName: "asc" }
    });

    const classes = await prisma.class.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        classCode: true,
        className: true,
        level: true,
        grade: true,
        campusId: true,
        academicYearId: true
      },
      orderBy: { className: "asc" }
    });

    let teacherStats = { taughtCount: 0, observedCount: 0, eslTaughtCount: 0, eslObservedCount: 0 };
    if (currentTeacher?.id) {
      const yearSlotCondition: any = activeYear
        ? {
            OR: [
              { academicYearId: activeYear.id },
              {
                AND: [
                  { academicYearId: null },
                  {
                    date: {
                      gte: activeYear.startDate,
                      lte: activeYear.endDate
                    }
                  }
                ]
              }
            ]
          }
        : {};

      const teacherSlots = await prisma.observationSlot.findMany({
        where: {
          status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN", "EXPIRED"] },
          AND: [
            yearSlotCondition,
            {
              OR: [
                { teacherId: currentTeacher.id },
                { registrations: { some: { teacherId: currentTeacher.id } } }
              ]
            }
          ]
        },
        include: {
          registrations: {
            include: { evaluation: true }
          }
        }
      }).catch(() => []);

      teacherSlots.forEach((slot: any) => {
        const weight = slot.isDoublePeriod ? 2 : 1;
        const isEsl = (slot.subjectName || "").includes("ESL") ||
          (slot.subjectName || "").toLowerCase().includes("tiếng anh (esl)") ||
          (slot.topic || "").toLowerCase().includes("foreign english") ||
          slot.requestOrigin === "FOREIGN_WALKTHROUGH";

        if (slot.teacherId === currentTeacher.id) {
          const hasEval = slot.registrations?.some((r: any) => r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT");
          if (hasEval) {
            teacherStats.taughtCount += weight;
            if (isEsl) teacherStats.eslTaughtCount += weight;
          }
        }

        const myReg = slot.registrations?.find((r: any) => r.teacherId === currentTeacher.id);
        if (myReg && myReg.isApproved && myReg.evaluation && myReg.evaluation.reEvaluationStatus !== "DRAFT") {
          teacherStats.observedCount += weight;
          if (isEsl) teacherStats.eslObservedCount += weight;
        }
      });
    }

    return {
      success: true,
      currentTeacher,
      departments: allDepartments,
      teachers,
      campuses,
      classes,
      academicYears,
      selectedYearId: activeYearId,
      teacherStats
    };
  } catch (error: any) {
    console.error("Error in getForeignObservationData:", error);
    return { success: false, error: error.message };
  }
}

export async function createForeignObservationWithEvaluation(data: {
  observerId?: string;
  academicYearId?: string;
  teacherId: string;
  campusId: string;
  classId?: string;
  className?: string;
  date: string;
  period?: string;
  room?: string;
  topic?: string;
  targetSkills?: string[];
  indicators: Record<string, { rating: string; evidence?: string; studentImpact?: string }>;
  teacherVoice?: {
    workingWell?: string;
    challenges?: string;
    curriculumAdjustments?: string;
    supportNeeded?: string;
  };
  summary?: {
    keyStrengths?: string;
    keyChallenges?: string;
    studentProgressEvidence?: string;
    studentsNeedingSupport?: string;
    curriculumChallenges?: string;
    teacherSuggestedFocus?: string;
    supportRequired?: string;
    agreedActions?: string;
  };
  overallRating?: string;
  totalScore?: number;
  isDraft?: boolean;
}) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const hostTeacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      include: {
        campus: true,
        departmentRel: true
      }
    });

    if (!hostTeacher) {
      return { success: false, error: "Teacher to be observed not found" };
    }

    let evaluatorTeacher = null;
    if (data.observerId) {
      evaluatorTeacher = await prisma.teacher.findUnique({ where: { id: data.observerId } });
    }
    if (!evaluatorTeacher && session.user?.id) {
      evaluatorTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { id: session.user.id },
            { email: session.user.email || "" }
          ]
        }
      });
    }
    if (!evaluatorTeacher && session.user?.email) {
      evaluatorTeacher = await prisma.teacher.findFirst({
        where: { email: session.user.email }
      });
    }
    if (!evaluatorTeacher && session.user.email) {
      try {
        evaluatorTeacher = await prisma.teacher.create({
          data: {
            teacherCode: "ADMIN_" + (session.user.name || "GV").substring(0, 3).toUpperCase(),
            teacherName: session.user.name || "Administrator",
            email: session.user.email,
            position: "QLCM",
            status: "ACTIVE"
          }
        });
      } catch (e) {
        evaluatorTeacher = await prisma.teacher.findFirst();
      }
    }

    const evaluatorId = evaluatorTeacher?.id || hostTeacher.id;

    let academicYear = data.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: data.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    if (!academicYear) {
      academicYear = await prisma.academicYear.findFirst({
        orderBy: { startDate: "desc" }
      });
    }

    let subject = await prisma.subject.findFirst({
      where: {
        OR: [
          { subjectCode: "ESL" },
          { subjectName: "Tiếng Anh (ESL)" },
          { subjectName: "Tiếng Anh" },
          { subjectCode: "ENG" }
        ]
      }
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          subjectCode: "ESL",
          subjectName: "Tiếng Anh (ESL)",
          description: "English as a Second Language"
        }
      });
    }

    let classObj = null;
    if (data.classId) {
      classObj = await prisma.class.findUnique({
        where: { id: data.classId }
      });
    }

    const periodMap: Record<string, { start: string, end: string }> = {
      "Tiết 1": { start: "07:30", end: "08:15" },
      "Tiết 2": { start: "08:20", end: "09:05" },
      "Tiết 3": { start: "09:20", end: "10:05" },
      "Tiết 4": { start: "10:10", end: "10:55" },
      "Tiết 5": { start: "13:30", end: "14:15" },
      "Tiết 6": { start: "14:20", end: "15:05" },
      "Tiết 7": { start: "15:10", end: "15:55" },
      "Tiết 8": { start: "15:55", end: "16:40" }
    };
    const timeRange = periodMap[data.period || "Tiết 1"] || { start: "07:30", end: "08:15" };
    const observationDate = new Date(data.date);

    const slot = await prisma.observationSlot.create({
      data: {
        teacherId: hostTeacher.id,
        targetDeptId: hostTeacher.departmentId || null,
        classId: data.classId || null,
        className: data.className || classObj?.className || "ESL Class",
        level: classObj?.level || hostTeacher.departmentRel?.blockCM || "Tiểu học",
        grade: classObj?.grade ? `Khối ${classObj.grade}` : (data.className || "Khối 1"),
        subjectId: subject?.id || null,
        subjectName: subject?.subjectName || "Tiếng Anh (ESL)",
        topic: data.topic || "Foreign English Lesson Walkthrough",
        lessonPlanName: data.topic || "Foreign English Lesson Walkthrough",
        date: observationDate,
        startTime: data.period || timeRange.start,
        endTime: timeRange.end,
        room: data.room || "Phòng học",
        description: "Dự giờ GVNN / Tổ Tiếng Anh",
        visibilityType: "PUBLIC",
        maxSeats: 4,
        status: data.isDraft ? "DRAFT" : "COMPLETED",
        academicYearId: academicYear?.id || null,
        campusId: data.campusId || hostTeacher.campusId || null,
        campusName: hostTeacher.campus?.campusName || null
      }
    });

    const registration = await prisma.observationRegistration.create({
      data: {
        slotId: slot.id,
        teacherId: evaluatorId,
        isApproved: true,
        approvedAt: new Date()
      }
    });

    const evaluationCriteria = [
      { id: 14, standardId: 1, name: "Content appropriate for student level", weight: 1 },
      { id: 15, standardId: 1, name: "Amount of content realistic for time", weight: 1 },
      { id: 16, standardId: 1, name: "Teaching materials & resources effective", weight: 1 },
      { id: 17, standardId: 1, name: "Curriculum implemented as intended", weight: 1 },
      { id: 18, standardId: 2, name: "Formative checks / assessment regular", weight: 1 },
      { id: 19, standardId: 2, name: "Clear actionable feedback provided", weight: 1 },
      { id: 20, standardId: 2, name: "Support for developing students identified", weight: 1 },
      { id: 1, standardId: 3, name: "Clear learning intentions & structured staging", weight: 1 },
      { id: 2, standardId: 3, name: "Optimized TTT vs STT balance", weight: 1 },
      { id: 3, standardId: 3, name: "Positive immersion rapport & active engagement", weight: 1 }
    ];

    const criterionScores = evaluationCriteria.map(crit => {
      const ind = data.indicators[crit.id.toString()] || data.indicators[crit.id];
      const rating = ind?.rating || "3";
      let score = 3;
      if (rating === "4") score = 4;
      else if (rating === "3") score = 3;
      else if (rating === "2") score = 2;
      else if (rating === "1") score = 1;

      return {
        criterionId: crit.id,
        criterionName: crit.name,
        standardId: crit.standardId,
        score,
        evidence: ind?.evidence || "",
        notes: ind?.studentImpact || ""
      };
    });

    const generalComment = JSON.stringify({
      targetSkills: data.targetSkills || [],
      teacherVoice: data.teacherVoice || {},
      summary: data.summary || {},
      overallRatingText: data.overallRating || "Effective Practice",
      period: data.period || "Tiết 1",
      room: data.room || "Phòng học",
      topic: data.topic || "",
      criterionScores
    });

    await prisma.observationEvaluation.create({
      data: {
        registrationId: registration.id,
        slotId: slot.id,
        evaluatorId: evaluatorId,
        score1: criterionScores[0]?.score ?? null,
        score2: criterionScores[1]?.score ?? null,
        score3: criterionScores[2]?.score ?? null,
        score4: criterionScores[3]?.score ?? null,
        score5: criterionScores[4]?.score ?? null,
        score6: criterionScores[5]?.score ?? null,
        score7: criterionScores[6]?.score ?? null,
        score8: criterionScores[7]?.score ?? null,
        score9: criterionScores[8]?.score ?? null,
        score10: criterionScores[9]?.score ?? null,
        totalScore: data.totalScore || 3.0,
        strengths: data.summary?.keyStrengths || "",
        improvements: data.summary?.keyChallenges || "",
        generalComment,
        overallRating: data.overallRating || "Effective Practice",
        reEvaluationStatus: data.isDraft ? "DRAFT" : null,
        submittedAt: new Date()
      }
    });

    revalidatePath("/teacher/du-gio-gvnn");
    revalidatePath("/admin/du-gio-gvnn");
    revalidatePath("/teacher/du-gio");
    revalidatePath("/teacher/du-gio-mam-non");
    revalidatePath("/admin/tong-hop-du-gio");

    return {
      success: true,
      message: data.isDraft
        ? "Draft saved successfully!"
        : "Observation and evaluation submitted successfully!"
    };
  } catch (error: any) {
    console.error("Error creating foreign observation:", error);
    return { success: false, error: error.message };
  }
}

export async function getForeignObservationSlots(params?: string | {
  academicYearId?: string;
  campusId?: string;
  deptId?: string;
  grade?: string;
  date?: string;
  month?: string;
  onlyMySlots?: boolean;
}) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const roleCode = (session.user as any)?.role || "TEACHER";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "BGH",
      "SUPER_ADMIN",
      "BAN_GIAM_HIEU",
      "TIEU_BAN_CHUYEN_MON",
      "TO_TRUONG_CHUYEN_MON"
    ].includes(roleCode.toUpperCase());

    const currentTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email || "" },
          { id: session.user.id }
        ]
      }
    });

    const andConditions: any[] = [
      {
        OR: [
          { requestOrigin: "FOREIGN_WALKTHROUGH" },
          { description: { contains: "GVNN" } },
          { description: { contains: "Dự giờ GVNN" } },
          { description: { contains: "FOREIGN" } },
          { subjectName: { contains: "ESL" } },
          { subjectName: { contains: "Tiếng Anh" } },
          { topic: { contains: "Foreign" } },
          { topic: { contains: "ESL" } }
        ]
      }
    ];

    const academicYearId = typeof params === "string" ? params : params?.academicYearId;
    if (academicYearId && academicYearId !== "all") {
      andConditions.push({ academicYearId });
    }

    const shouldRestrictToTeacher = typeof params === "object" && params?.onlyMySlots
      ? true
      : (!isAdmin);

    if (shouldRestrictToTeacher && currentTeacher) {
      andConditions.push({
        OR: [
          { teacherId: currentTeacher.id },
          { registrations: { some: { teacherId: currentTeacher.id } } }
        ]
      });
    }

    if (typeof params === "object" && params) {
      if (params.campusId && params.campusId !== "all") {
        andConditions.push({ campusId: params.campusId });
      }
      if (params.grade && params.grade !== "all") {
        andConditions.push({ grade: params.grade });
      }
      if (params.deptId && params.deptId !== "all") {
        andConditions.push({ targetDeptId: params.deptId });
      }
      if (params.date) {
        const start = new Date(params.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(params.date);
        end.setHours(23, 59, 59, 999);
        andConditions.push({ date: { gte: start, lte: end } });
      }
    }

    const slots = await prisma.observationSlot.findMany({
      where: { AND: andConditions },
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            position: true,
            departmentId: true,
            departmentRel: true,
            campusId: true,
            campus: {
              select: { id: true, campusName: true }
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
                position: true
              }
            },
            evaluation: true
          }
        },
        academicYear: true
      },
      orderBy: { date: "desc" }
    });

    return { success: true, slots };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
