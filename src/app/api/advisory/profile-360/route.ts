import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            campus: true,
            academicYear: true
          }
        },
        campus: true,
        academicYear: true,
        parents: { include: { parent: true } },
        goals: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { actions: true }
        },
        consultationLogs: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { teacher: { select: { teacherName: true } } },
          orderBy: { meetingDate: "desc" }
        },
        reflections: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        helpRequests: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        advisoryStatuses: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        achievements: {
          include: {
            achievement: {
              include: {
                exam: {
                  include: {
                    round: true,
                    category: true
                  }
                }
              }
            }
          }
        },
        careerOrientations: { where: academicYearId ? { academicYearId } : undefined },
        learningCommitments: { where: academicYearId ? { academicYearId } : undefined },
        highlightComments: { orderBy: { createdAt: "desc" } },
        projectExperiences: { orderBy: { createdAt: "desc" } },
        termScores: { include: { subject: true } },
        termSummaries: { orderBy: { semester: "asc" } },
        learningSupportTargets: { 
          include: { 
            evaluations: { orderBy: { createdAt: "desc" } },
            assignments: { include: { teacher: true, subject: true } }
          } 
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Kiểm tra phân quyền truy cập hồ sơ học sinh (Chống IDOR)
    const userRole = (session?.user as any)?.role || "";
    const currentUserId = (session?.user as any)?.id || "";
    const allowedCampusIds = (session?.user as any)?.campusIds || [];
    const isFullAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KTDBCL"].includes(userRole);

    let canAccess = isFullAdmin;

    if (!canAccess && ["GDCS", "GD_CS", "GIAO_VU_CS", "GIAO_VU"].includes(userRole)) {
      if (allowedCampusIds.length === 0 || allowedCampusIds.includes(student.campusId)) {
        canAccess = true;
      }
    }

    if (!canAccess && userRole === "PARENT") {
      const isMyChild = await prisma.parentStudentLink.findFirst({
        where: { studentId: student.id, parent: { userId: currentUserId } }
      });
      if (isMyChild) canAccess = true;
    }

    if (!canAccess && (userRole === "TEACHER" || userRole === "GV_MN")) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: currentUserId } });
      if (teacher) {
        const isHomeroom = student.class?.homeroomTeacherId === teacher.id;
        const isClassTeacher = await prisma.teacherClassAssignment.findFirst({
          where: { teacherId: teacher.id, classId: student.classId }
        });
        const isSubjectTeacher = await prisma.teachingAssignment.findFirst({
          where: { teacherId: teacher.id, classId: student.classId }
        });
        const isSupport = await prisma.learningSupportAssignment.findFirst({
          where: { teacherId: teacher.id, target: { studentId: student.id } }
        });
        if (isHomeroom || isClassTeacher || isSubjectTeacher || isSupport) {
          canAccess = true;
        }
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: "Bạn không có quyền xem hồ sơ của học sinh này." }, { status: 403 });
    }

    let goals = student.goals || []
    if (goals.length === 0) {
      // Fallback 1: fetch all goals for this studentId
      goals = await prisma.studentGoal.findMany({
        where: { studentId: student.id },
        include: { actions: true },
        orderBy: { createdAt: 'desc' }
      }).catch(() => [])
    }
    if (goals.length === 0 && student.studentCode) {
      // Fallback 2: fetch goals for any student record matching same studentCode
      const sameCodeStudents = await prisma.student.findMany({
        where: { studentCode: student.studentCode },
        select: { id: true }
      }).catch(() => [])
      const ids = sameCodeStudents.map(s => s.id)
      if (ids.length > 0) {
        goals = await prisma.studentGoal.findMany({
          where: { studentId: { in: ids } },
          include: { actions: true },
          orderBy: { createdAt: 'desc' }
        }).catch(() => [])
      }
    }

    // Query Input Assessment data by studentCode from database
    const inputAssessment = await prisma.inputAssessmentStudent.findFirst({
      where: { studentCode: student.studentCode },
      orderBy: { createdAt: "desc" }
    }).catch(() => null)

    // Query Experiential Activities (HĐTN) for this student
    const studentParticipants = await prisma.activityParticipant.findMany({
      where: {
        OR: [
          { studentId: student.id },
          ...(student.studentCode ? [{ student: { studentCode: student.studentCode } }] : [])
        ]
      },
      include: {
        record: {
          include: {
            catalog: {
              include: { group: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => []);

    const strandDict: Record<string, string> = {
      BAN_THAN: "Hướng vào bản thân",
      XA_HOI: "Hướng đến xã hội",
      TU_NHIEN: "Hướng đến tự nhiên",
      HUONG_NGHIEP: "Hướng nghiệp"
    };

    const evalResultDict: Record<string, string> = {
      DAT_XUAT_SAC: "Xuất sắc",
      DAT_TOT: "Tốt",
      DAT: "Đạt",
      CAN_HO_TRO: "Cần hỗ trợ",
      CHUA_DAT: "Chưa đạt",
      THAM_GIA: "Tham gia",
      CHUA_DANH_GIA: "Đang thực hiện",
      XS: "Xuất sắc",
      TO: "Tốt",
      DA: "Đạt",
      KDA: "Chưa đạt"
    };

    const experientialActivities = (studentParticipants || []).map((p, idx) => {
      let pNote: any = {};
      try {
        if (p?.note && typeof p.note === "string" && p.note.startsWith("{")) {
          pNote = JSON.parse(p.note);
        } else if (p?.note && typeof p.note === "object") {
          pNote = p.note;
        }
      } catch {}

      let recMeta: any = {};
      try {
        if (p?.record?.locationId && typeof p.record.locationId === "string" && p.record.locationId.startsWith("{")) {
          recMeta = JSON.parse(p.record.locationId);
        }
      } catch {}

      let resolvedRole = "Thành viên";
      if (Array.isArray(pNote.roles) && pNote.roles.length > 0) {
        resolvedRole = pNote.roles.join(", ");
      } else if (p?.roleId) {
        resolvedRole = p.roleId === "TV" ? "Thành viên" : p.roleId;
      }

      let resolvedEval = "Đang tham gia";
      if (pNote.finalResult) {
        resolvedEval = evalResultDict[pNote.finalResult] || pNote.finalResult;
      } else if (p?.evalLevelId) {
        resolvedEval = evalResultDict[p.evalLevelId] || p.evalLevelId;
      }

      const resolvedGroup = (recMeta.strand && strandDict[recMeta.strand])
        || recMeta.activityTypeName
        || p?.record?.catalog?.group?.name
        || "Hoạt động trải nghiệm";

      const resolvedName = p?.record?.name || recMeta.activityName || p?.record?.catalog?.name || "Hoạt động trải nghiệm";

      return {
        id: p.id,
        stt: idx + 1,
        activityId: p.recordId || p.record?.id,
        activityName: (resolvedName || "").trim(),
        groupName: (resolvedGroup || "").trim(),
        strand: recMeta.strand || undefined,
        role: (resolvedRole || "").trim(),
        evalLevel: (resolvedEval || "").trim(),
        score: pNote.calculatedPercent !== null && pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : undefined,
        attendance: pNote.attendance || "PRESENT",
        date: p.record?.date ? (typeof (p.record as any).date === "string" ? (p.record as any).date.split("T")[0] : new Date((p.record as any).date).toISOString().split("T")[0]) : ""
      };
    });

    const currentStatusColor = student.advisoryStatuses?.[0]?.statusColor || "GREEN"
    const currentStatusReason = student.advisoryStatuses?.[0]?.reasonDetail || "Ổn định"

    return NextResponse.json({
      student,
      currentStatusColor,
      currentStatusReason,
      goals,
      inputAssessment,
      experientialActivities,
      consultationLogs: student.consultationLogs || [],
      reflections: student.reflections || [],
      helpRequests: student.helpRequests || [],
      achievements: student.achievements || [],
      careerOrientation: student.careerOrientations?.[0] || null,
      learningCommitment: student.learningCommitments?.[0] || null,
      highlightComments: student.highlightComments || [],
      projectExperiences: student.projectExperiences || [],
      termScores: student.termScores || [],
      termSummaries: student.termSummaries || [],
      learningSupportTargets: student.learningSupportTargets || []
    })
  } catch (error: any) {
    console.error("GET /api/advisory/profile-360 error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
