"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function isEnglishDepartment(deptNameOrCode?: string | null): boolean {
  if (!deptNameOrCode) return false;
  const lower = deptNameOrCode.toLowerCase();
  return (
    lower.includes("tiếng anh") ||
    lower.includes("tieng anh") ||
    lower.includes("english") ||
    lower.includes("esl") ||
    lower.includes("eng_pri") ||
    lower.includes("eng_sec") ||
    lower.includes("eng_int") ||
    lower.includes("ngoại ngữ") ||
    lower.includes("ngoai ngu") ||
    lower.includes("quốc tế") ||
    lower.includes("quoc te") ||
    lower.includes("cambridge") || lower.includes("mầm non") || lower.includes("mam non") || lower.includes("preschool") || lower.includes("kindergarten") || lower.includes("eng_pre")
  );
}

function isForeignOrEnglishTeacher(teacher: any): boolean {
  if (!teacher) return false;
  const pos = (teacher.position || "").toUpperCase();
  const role = (teacher.user?.role || "").toUpperCase();
  const deptName = teacher.departmentRel?.name || "";
  const deptCode = teacher.departmentRel?.code || "";

  const isForeign =
    pos.includes("GVNN") ||
    pos.includes("EXPAT") ||
    pos.includes("FOREIGN") ||
    role.includes("GVNN") ||
    role.includes("EXPAT");
  const isEngDept = isEnglishDepartment(deptName) || isEnglishDepartment(deptCode);

  const hasEngAssignment = teacher.departmentAssignments?.some(
    (da: any) =>
      isEnglishDepartment(da.department?.name) ||
      isEnglishDepartment(da.department?.code)
  );

  return isForeign || isEngDept || Boolean(hasEngAssignment);
}

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
      "KT_DBCL",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "GIAO_VU_CS"
    ].includes(roleCode);

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
    });

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" };
    }

    const rawAcademicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true, startDate: true, endDate: true }
    });

    const selectedYear = academicYearId
      ? rawAcademicYears.find(y => y.id === academicYearId)
      : rawAcademicYears.find(y => y.status === "ACTIVE") || rawAcademicYears[0];

    const activeYearId = selectedYear?.id || null;

    const seenNames = new Set();
    let academicYears = rawAcademicYears.filter(y => {
      if (y.status !== "ACTIVE") return false;
      if (seenNames.has(y.name)) return false;
      seenNames.add(y.name);
      return true;
    });

    if (academicYears.length === 0 && selectedYear) {
      academicYears = [selectedYear];
    }

    let activeYearTarget = null;
    if (activeYearId && currentTeacher && !isAdmin) {
      activeYearTarget = await prisma.teacherAcademicYearTarget.findUnique({
        where: {
          teacherId_academicYearId: {
            teacherId: currentTeacher.id,
            academicYearId: activeYearId
          }
        }
      });
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
      } as any;
    }

    const allDepartments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" }
    });

    let englishDepartments = allDepartments.filter(
      d => isEnglishDepartment(d.name) || isEnglishDepartment(d.code)
    );
    if (englishDepartments.length === 0) {
      englishDepartments = allDepartments;
    }

    const rawTeachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        email: true,
        departmentId: true,
        position: true,
        campusId: true,
        departmentRel: {
          select: { id: true, code: true, name: true, blockCM: true }
        },
        mainSubjectRel: {
          select: { id: true, subjectName: true }
        },
        departmentAssignments: {
          select: {
            departmentId: true,
            position: true,
            department: { select: { id: true, code: true, name: true } }
          }
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

    let englishTeachers = rawTeachers.filter(t => isForeignOrEnglishTeacher(t));
    if (englishTeachers.length === 0) {
      englishTeachers = rawTeachers;
    }

    const allTargets = activeYearId
      ? await prisma.teacherAcademicYearTarget.findMany({
          where: { academicYearId: activeYearId }
        })
      : [];

    const targetsMap = new Map(allTargets.map(t => [t.teacherId, t]));

    const teachers = englishTeachers.map(t => {
      const target = targetsMap.get(t.id);
      return {
        ...t,
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

    return {
      success: true,
      currentTeacher,
      departments: englishDepartments.length > 0 ? englishDepartments : allDepartments,
      teachers,
      campuses,
      classes,
      academicYears,
      selectedYearId: activeYearId
    };
  } catch (e: any) {
    console.error("[getForeignObservationData Error]:", e);
    return {
      success: false,
      error: e.message || "Failed to load observation reference data."
    };
  }
}

export async function createForeignObservationWithEvaluation(data: {
  observerId?: string;
  teacherId: string;
  campusId?: string;
  classId?: string;
  className?: string;
  level?: string;
  grade?: string;
  date: string;
  period?: string;
  room?: string;
  topic?: string;
  targetSkills?: string[];
  indicators: Record<string, { rating: string; evidence: string; studentImpact: string }>;
  teacherVoice: {
    workingWell?: string;
    challenges?: string;
    curriculumAdjustments?: string;
    supportNeeded?: string;
  };
  summary: {
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
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { campus: true, departmentRel: true, departmentAssignments: true }
    });

    const roleCode = (session.user as any)?.role || "TEACHER";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "KT_DBCL",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS"
    ].includes(roleCode);

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found." };
    }

    const evaluatorId = data.observerId || currentTeacher?.id || session.user.id;

    const hostTeacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      include: { campus: true, departmentRel: true }
    });

    if (!hostTeacher) {
      return { success: false, error: "Observed teacher not found." };
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" }
    });

    const periodMap: Record<string, { start: string; end: string }> = {
      "Tiết 1": { start: "07:30", end: "08:15" },
      "Tiết 2": { start: "08:20", end: "09:05" },
      "Tiết 3": { start: "09:20", end: "10:05" },
      "Tiết 4": { start: "10:10", end: "10:55" },
      "Tiết 5": { start: "13:30", end: "14:15" },
      "Tiết 6": { start: "14:20", end: "15:05" },
      "Tiết 7": { start: "15:10", end: "15:55" },
      "Tiết 8": { start: "15:55", end: "16:40" }
    };

    const timeRange = periodMap[data.period || "Tiết 1"] || {
      start: "07:30",
      end: "08:15"
    };
    const slotDate = new Date(data.date);

    let newSlot: any;
    try {
      newSlot = await prisma.observationSlot.create({
        data: {
          teacherId: hostTeacher.id,
          targetDeptId: hostTeacher.departmentId || null,
          classId: data.classId || null,
          className: data.className || "Lớp học ESL",
          level: data.level || "Phổ thông K-12",
          grade: data.grade || "Khối",
          subjectId: null,
          subjectName: "ESL",
          topic: data.topic || "ESL Classroom Observation",
          date: slotDate,
          startTime: data.period || timeRange.start,
          endTime: timeRange.end,
          room: data.room || "Phòng học",
          description:
            "ESL Observation & Teaching Support [FOREIGN_WALKTHROUGH] - Focus: " +
            (data.targetSkills || []).join(", "),
          visibilityType: "PUBLIC",
          maxSeats: 1,
          status: "ACTIVE",
          requestOrigin: "FOREIGN_WALKTHROUGH",
          academicYearId: activeYear?.id || null,
          campusId: data.campusId || hostTeacher.campusId || null,
          campusName: hostTeacher.campus?.campusName || null
        }
      });
    } catch (createErr) {
      newSlot = await prisma.observationSlot.create({
        data: {
          teacherId: hostTeacher.id,
          targetDeptId: hostTeacher.departmentId || null,
          classId: data.classId || null,
          className: data.className || "Lớp học ESL",
          level: data.level || "Phổ thông K-12",
          grade: data.grade || "Khối",
          subjectId: null,
          subjectName: "ESL",
          topic: data.topic || "ESL Classroom Observation",
          date: slotDate,
          startTime: data.period || timeRange.start,
          endTime: timeRange.end,
          room: data.room || "Phòng học",
          description:
            "ESL Observation & Teaching Support [FOREIGN_WALKTHROUGH] - Focus: " +
            (data.targetSkills || []).join(", "),
          visibilityType: "PUBLIC",
          maxSeats: 1,
          status: "ACTIVE",
          academicYearId: activeYear?.id || null,
          campusId: data.campusId || hostTeacher.campusId || null,
          campusName: hostTeacher.campus?.campusName || null
        }
      });
    }

    const registration = await prisma.observationRegistration.create({
      data: {
        slotId: newSlot.id,
        teacherId: evaluatorId,
        isApproved: true,
        approvedAt: new Date()
      }
    });

    const detailedPayload = {
      version: "ESL_V2026",
      targetSkills: data.targetSkills || [],
      indicators: data.indicators || {},
      teacherVoice: data.teacherVoice || {},
      summary: data.summary || {},
      isDraft: Boolean(data.isDraft)
    };

    const evalData: any = {
      registrationId: registration.id,
      slotId: newSlot.id,
      evaluatorId: evaluatorId,
      strengths: data.summary?.keyStrengths || "",
      improvements: data.summary?.keyChallenges || "",
      generalComment: JSON.stringify(detailedPayload),
      overallRating: data.overallRating || "Strong Practice",
      totalScore: data.totalScore ?? null,
      submittedAt: new Date(),
      reEvaluationStatus: data.isDraft ? "DRAFT" : null
    };

    await prisma.observationEvaluation.create({
      data: evalData
    });

    revalidatePath("/teacher/du-gio");
    revalidatePath("/teacher/du-gio-gvnn");
    revalidatePath("/admin/du-gio-gvnn");
    revalidatePath("/admin/du-gio");
    revalidatePath("/admin/tong-hop-du-gio");

    return {
      success: true,
      slot: newSlot,
      registrationId: registration.id,
      message: data.isDraft
        ? "Draft evaluation saved successfully!"
        : "ESL Class Observation evaluation submitted successfully!"
    };
  } catch (e: any) {
    console.error("[createForeignObservation Error]:", e);
    return {
      success: false,
      error: e.message || "Error submitting observation evaluation."
    };
  }
}

export async function getForeignObservationSlots(filters: {
  academicYearId?: string;
  campusId?: string;
  deptId?: string;
  grade?: string;
  date?: string;
  month?: string;
}) {
  try {
    const whereClause: any = {
      subjectName: {
        in: ["ESL", "Tiếng Anh", "English", "Tiếng Anh Quốc tế"]
      }
    };

    if (filters.academicYearId && filters.academicYearId !== "all") {
      whereClause.academicYearId = filters.academicYearId;
    }
    if (filters.campusId && filters.campusId !== "all") {
      whereClause.campusId = filters.campusId;
    }
    if (filters.deptId && filters.deptId !== "all") {
      whereClause.targetDeptId = filters.deptId;
    }
    if (filters.grade && filters.grade !== "all") {
      whereClause.grade = filters.grade;
    }

    const slots = await prisma.observationSlot.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            email: true,
            position: true,
            departmentRel: { select: { id: true, name: true, code: true } },
            campus: { select: { id: true, campusName: true } }
          }
        },
        registrations: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                teacherCode: true,
                email: true,
                position: true,
                departmentRel: { select: { id: true, name: true } }
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: { date: "desc" }
    });

    return { success: true, slots };
  } catch (e: any) {
    console.error("[getForeignObservationSlots Error]:", e);
    return { success: false, error: e.message || "Failed to fetch observation slots." };
  }
}
