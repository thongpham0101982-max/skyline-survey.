const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');

const fullActions = `"use server";

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

    return {
      success: true,
      currentTeacher,
      departments: allDepartments,
      teachers,
      campuses,
      classes,
      academicYears,
      selectedYearId: activeYearId
    };
  } catch (error: any) {
    console.error("Error in getForeignObservationData:", error);
    return { success: false, error: error.message };
  }
}

export async function createForeignObservationWithEvaluation(data: {
  observerId?: string;
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

    const currentTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { email: session.user.email || "" },
          { id: session.user.id }
        ]
      }
    });

    const evaluatorId = data.observerId || currentTeacher?.id || session.user.id;

    let academicYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    });
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

    const observationDate = new Date(data.date);

    const slot = await prisma.observationSlot.create({
      data: {
        teacherId: data.teacherId,
        subjectId: subject.id,
        campusId: data.campusId,
        classId: data.classId || null,
        className: data.className || "ESL Class",
        academicYearId: academicYear?.id,
        date: observationDate,
        startTime: data.period || "Tiết 1",
        endTime: "",
        room: data.room || "Phòng học",
        lessonPlan: data.topic || "Foreign English Lesson Walkthrough",
        status: data.isDraft ? "DRAFT" : "COMPLETED",
        createdById: session.user.id,
        observations: {
          create: {
            observerId: evaluatorId,
            status: data.isDraft ? "DRAFT" : "COMPLETED"
          }
        }
      },
      include: {
        observations: true
      }
    });

    const observation = slot.observations[0];

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
      topic: data.topic || ""
    });

    await prisma.evaluation.create({
      data: {
        observationId: observation.id,
        evaluatorId,
        evaluateeId: data.teacherId,
        totalScore: data.totalScore || 3.0,
        resultLevel: data.overallRating || "Effective Practice",
        generalComment,
        strengths: data.summary?.keyStrengths || "",
        limitations: data.summary?.keyChallenges || "",
        suggestions: data.summary?.agreedActions || "",
        status: data.isDraft ? "DRAFT" : "COMPLETED",
        evaluationCriteria: {
          create: criterionScores
        }
      }
    });

    // Update quotas
    if (!data.isDraft && academicYear?.id) {
      try {
        await prisma.teacherAcademicYearTarget.upsert({
          where: {
            teacherId_academicYearId: {
              teacherId: data.teacherId,
              academicYearId: academicYear.id
            }
          },
          update: {
            requiredTaught: { increment: 1 }
          },
          create: {
            teacherId: data.teacherId,
            academicYearId: academicYear.id,
            requiredTaught: 1,
            requiredObserved: 0
          }
        });

        if (evaluatorId) {
          await prisma.teacherAcademicYearTarget.upsert({
            where: {
              teacherId_academicYearId: {
                teacherId: evaluatorId,
                academicYearId: academicYear.id
              }
            },
            update: {
              requiredObserved: { increment: 1 }
            },
            create: {
              teacherId: evaluatorId,
              academicYearId: academicYear.id,
              requiredTaught: 0,
              requiredObserved: 1
            }
          });
        }
      } catch (e) {
        console.warn("Could not update target counts:", e);
      }
    }

    revalidatePath("/teacher/du-gio-gvnn");
    revalidatePath("/admin/du-gio-gvnn");

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

export async function getForeignObservationSlots(academicYearId?: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const where: any = {};
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const slots = await prisma.observationSlot.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, teacherName: true, teacherCode: true, position: true }
        },
        campus: {
          select: { id: true, campusName: true }
        },
        subject: {
          select: { id: true, subjectName: true }
        },
        observations: {
          include: {
            evaluations: true
          }
        }
      },
      orderBy: { date: "desc" }
    });

    return { success: true, slots };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
`;

fs.writeFileSync(actionsPath, fullActions, 'utf8');
console.log('actions.ts rewritten with clean async functions and full relation queries');
