import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  CTQT_LEVEL_CONFIGS,
  CtqtSubjectDef,
  detectCtqtLevel,
  isCtqtClass,
  compareCtqtClasses,
} from "@/lib/ctqt/config";

function toNullableFloat(val: any): number | null {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function parseProgressScores(raw?: string | null): (number | null)[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(v => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    });
  } catch {
    return [];
  }
}

function evaluateSlotStudentEntry(entry: any, subDef?: CtqtSubjectDef) {
  const hasCommentEn = Boolean(entry?.commentEn && String(entry.commentEn).trim() !== "");
  const hasCommentVi = Boolean(entry?.commentVi && String(entry.commentVi).trim() !== "");
  const hasAssessmentText = Boolean(
    (entry?.assessmentContentEn && String(entry.assessmentContentEn).trim() !== "") ||
      (entry?.assessmentContentVi && String(entry.assessmentContentVi).trim() !== "")
  );

  if (!subDef || subDef.isQualitative) {
    const hasQualitative = hasCommentEn || hasCommentVi || hasAssessmentText;
    return {
      hasAnyScore: hasQualitative,
      hasFullScore: hasQualitative,
      hasCommentEn,
      hasCommentVi,
    };
  }

  const progArr = parseProgressScores(entry?.progressScores);
  const nonGpaCols = (subDef.scoreColumns || []).filter(c => c.key !== "gpaScore");
  const requiredCols = Math.max(1, nonGpaCols.length);

  let filledCols = 0;
  for (const col of nonGpaCols) {
    let val: number | null = null;
    if (col.key.startsWith("progressScores_")) {
      const idx = parseInt(col.key.split("_")[1], 10);
      val = progArr[idx] ?? null;
    } else if (col.key === "midTermScore") {
      val =
        entry?.midTermScore !== null && entry?.midTermScore !== undefined
          ? Number(entry.midTermScore)
          : null;
    } else if (col.key === "endTermScore") {
      val =
        entry?.endTermScore !== null && entry?.endTermScore !== undefined
          ? Number(entry.endTermScore)
          : null;
    } else if (col.key === "ieltsScore") {
      val =
        entry?.ieltsScore !== null && entry?.ieltsScore !== undefined
          ? Number(entry.ieltsScore)
          : null;
    }
    if (val !== null && Number.isFinite(val)) {
      filledCols++;
    }
  }

  const hasGpa =
    entry?.gpaScore !== null &&
    entry?.gpaScore !== undefined &&
    Number.isFinite(Number(entry.gpaScore));
  const hasAnyScore = filledCols > 0 || hasGpa;
  const hasFullScore = filledCols >= requiredCols;

  return {
    hasAnyScore,
    hasFullScore,
    hasCommentEn,
    hasCommentVi,
  };
}

function resolveSlotReviewStatus(assignmentStatus?: string | null, entries: any[] = []): string {
  const norm = (s?: string | null) => {
    const u = (s || "").trim().toUpperCase();
    if (u === "SUBMITTED") return "PENDING_REVIEW";
    if (u === "REVISION_REQUESTED") return "CHANGES_REQUESTED";
    return u;
  };

  const aStat = norm(assignmentStatus);
  if (aStat === "APPROVED") return "APPROVED";
  if (aStat === "PENDING_REVIEW") return "PENDING_REVIEW";
  if (aStat === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";

  if (entries.length > 0) {
    const statuses = entries.map(e => norm(e.reviewStatus));
    if (statuses.every(s => s === "APPROVED")) return "APPROVED";
    if (statuses.some(s => s === "CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
    if (statuses.some(s => s === "PENDING_REVIEW")) return "PENDING_REVIEW";
  }

  return "DRAFT";
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email || "";
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let teacher = null;
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } });
    }
    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [{ email: userEmail }, { teacherCode: userEmail.split("@")[0] }],
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);
    const classId = searchParams.get("classId") || "";
    const subjectCode = searchParams.get("subjectCode") || "";

    // Action 1: Get Teacher CTQT Assignments + Grade Entry Progress Tracking
    if (action === "getTeacherAssignments") {
      let allAssignments: any[] = [];

      if (teacher || isSuperAdmin) {
        allAssignments = await prisma.ctqtTeachingAssignment.findMany({
          where: {
            ...(academicYearId ? { academicYearId } : {}),
            semester,
          },
          include: {
            class: {
              select: {
                id: true,
                className: true,
                grade: true,
                level: true,
                educationSystem: true,
                campusId: true,
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
            primaryTeacher: {
              select: { id: true, teacherName: true, teacherCode: true, email: true },
            },
            delegatedTeacher: {
              select: { id: true, teacherName: true, teacherCode: true, email: true },
            },
          },
        });
      }

      // Load active CTQT classes so we can calculate student counts & slot progress
      let rawClasses = await prisma.class.findMany({
        where: {
          status: "ACTIVE",
          ...(academicYearId ? { academicYearId } : {}),
        },
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } },
        },
        orderBy: { className: "asc" },
      });
      if (rawClasses.length === 0) {
        rawClasses = await prisma.class.findMany({
          where: { status: "ACTIVE" },
          include: {
            campus: { select: { id: true, campusCode: true, campusName: true } },
          },
          orderBy: { className: "asc" },
        });
      }

      const ctqtClasses = rawClasses
        .filter(c => isCtqtClass(c.className, c.educationSystem || undefined, c.level, c.grade))
        .sort(compareCtqtClasses);

      const classMap = new Map<string, any>();
      ctqtClasses.forEach(c => classMap.set(c.id, c));
      allAssignments.forEach(a => {
        if (a.class && !classMap.has(a.class.id)) {
          classMap.set(a.class.id, a.class);
        }
      });

      const classIds = Array.from(classMap.keys());

      const [activeStudents, gradeEntries] =
        classIds.length > 0
          ? await Promise.all([
              prisma.student.findMany({
                where: { classId: { in: classIds }, status: "ACTIVE" },
                select: { id: true, classId: true },
              }),
              prisma.ctqtGradeEntry.findMany({
                where: {
                  ...(academicYearId ? { academicYearId } : {}),
                  semester,
                  classId: { in: classIds },
                },
                select: {
                  classId: true,
                  studentId: true,
                  subjectCode: true,
                  progressScores: true,
                  midTermScore: true,
                  endTermScore: true,
                  gpaScore: true,
                  assessmentContentEn: true,
                  assessmentContentVi: true,
                  ieltsScore: true,
                  commentEn: true,
                  commentVi: true,
                  reviewStatus: true,
                  updatedAt: true,
                },
              }),
            ])
          : [[], []];

      const studentsByClass = new Map<string, Set<string>>();
      for (const st of activeStudents) {
        if (!st.classId) continue;
        if (!studentsByClass.has(st.classId)) {
          studentsByClass.set(st.classId, new Set());
        }
        studentsByClass.get(st.classId)!.add(st.id);
      }

      const entriesBySlot = new Map<string, Map<string, any>>();
      for (const ge of gradeEntries) {
        const stSet = studentsByClass.get(ge.classId);
        if (!stSet || !stSet.has(ge.studentId)) continue;
        const slotKey = `${ge.classId}::${ge.subjectCode}`;
        if (!entriesBySlot.has(slotKey)) {
          entriesBySlot.set(slotKey, new Map());
        }
        entriesBySlot.get(slotKey)!.set(ge.studentId, ge);
      }

      const assignBySlot = new Map<string, any>();
      for (const a of allAssignments) {
        assignBySlot.set(`${a.classId}::${a.subjectCode}`, a);
      }

      const computeSlotProgress = (cId: string, subCode: string, assignObj?: any) => {
        const clsObj = classMap.get(cId) || assignObj?.class;
        const lv = detectCtqtLevel(clsObj?.className || "", clsObj?.grade, clsObj?.level);
        const cfg = CTQT_LEVEL_CONFIGS[lv] || CTQT_LEVEL_CONFIGS.PRIMARY;
        const subDef = cfg.subjects.find(s => s.code === subCode);

        const activeStudentIds = Array.from(studentsByClass.get(cId) || []);
        const totalStudents = activeStudentIds.length;
        const slotEntriesMap = entriesBySlot.get(`${cId}::${subCode}`) || new Map();

        let gradedStudents = 0;
        let fullScoreStudents = 0;
        let commentEnStudents = 0;
        let commentViStudents = 0;
        let lastUpdatedMs = 0;
        const rawEntries: any[] = [];

        for (const stId of activeStudentIds) {
          const entry = slotEntriesMap.get(stId);
          if (entry) {
            rawEntries.push(entry);
            if (entry.updatedAt) {
              const ms = new Date(entry.updatedAt).getTime();
              if (ms > lastUpdatedMs) lastUpdatedMs = ms;
            }
          }
          const ev = evaluateSlotStudentEntry(entry, subDef);
          if (ev.hasAnyScore) gradedStudents++;
          if (ev.hasFullScore) fullScoreStudents++;
          if (ev.hasCommentEn) commentEnStudents++;
          if (ev.hasCommentVi) commentViStudents++;
        }

        const progressRate =
          totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0;
        const fullScoreRate =
          totalStudents > 0 ? Math.round((fullScoreStudents / totalStudents) * 100) : 0;
        const commentRate =
          totalStudents > 0
            ? Math.round((Math.max(commentEnStudents, commentViStudents) / totalStudents) * 100)
            : 0;

        let progressStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" =
          "NOT_STARTED";
        if (totalStudents === 0) progressStatus = "NO_STUDENTS";
        else if (gradedStudents >= totalStudents) progressStatus = "COMPLETED";
        else if (gradedStudents > 0) progressStatus = "IN_PROGRESS";

        const reviewStatus = resolveSlotReviewStatus(assignObj?.status, rawEntries);

        return {
          totalStudents,
          gradedStudents,
          fullScoreStudents,
          commentEnStudents,
          commentViStudents,
          missingStudents: Math.max(0, totalStudents - gradedStudents),
          progressRate,
          fullScoreRate,
          commentRate,
          progressStatus,
          reviewStatus,
          lastUpdatedAt: lastUpdatedMs > 0 ? new Date(lastUpdatedMs).toISOString() : null,
        };
      };

      const enrichAssignment = (a: any) => {
        const prog = computeSlotProgress(a.classId, a.subjectCode, a);
        return {
          ...a,
          status: prog.reviewStatus || a.status || "DRAFT",
          ...prog,
        };
      };

      const enrichedAllAssignments = allAssignments.map(enrichAssignment);

      const primaryAssignments = isSuperAdmin
        ? enrichedAllAssignments.filter(a => Boolean(a.primaryTeacherId))
        : enrichedAllAssignments.filter(a => teacher?.id && a.primaryTeacherId === teacher.id);

      const delegatedAssignments = isSuperAdmin
        ? enrichedAllAssignments.filter(a => Boolean(a.delegatedTeacherId))
        : enrichedAllAssignments.filter(a => teacher?.id && a.delegatedTeacherId === teacher.id);

      // Build complete slot list across CTQT classes so any class's subjects have full teacher & progress info
      const allClassSlots: any[] = [];
      for (const cls of ctqtClasses) {
        const lv = detectCtqtLevel(cls.className, cls.grade || undefined, cls.level || undefined);
        const cfg = CTQT_LEVEL_CONFIGS[lv] || CTQT_LEVEL_CONFIGS.PRIMARY;
        for (const sub of cfg.subjects) {
          const foundAssign = assignBySlot.get(`${cls.id}::${sub.code}`);
          const prog = computeSlotProgress(cls.id, sub.code, foundAssign);
          allClassSlots.push({
            id: foundAssign?.id || `${cls.id}::${sub.code}`,
            classId: cls.id,
            subjectCode: sub.code,
            class: {
              id: cls.id,
              className: cls.className,
              grade: cls.grade,
              level: cls.level,
              campus: cls.campus,
            },
            primaryTeacherId: foundAssign?.primaryTeacherId || null,
            primaryTeacher: foundAssign?.primaryTeacher || null,
            delegatedTeacherId: foundAssign?.delegatedTeacherId || null,
            delegatedTeacher: foundAssign?.delegatedTeacher || null,
            status: prog.reviewStatus || foundAssign?.status || "DRAFT",
            isAssignedToCurrentTeacher: Boolean(
              teacher?.id && foundAssign?.primaryTeacherId === teacher.id
            ),
            ...prog,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          teacher: teacher
            ? { id: teacher.id, teacherName: teacher.teacherName, teacherCode: teacher.teacherCode }
            : null,
          primaryAssignments,
          delegatedAssignments,
          allClassSlots,
        },
      });
    }

    // Action 2: Get Subject Grades for Class
    if (!classId || !subjectCode) {
      return NextResponse.json({ success: false, error: "Thiếu classId hoặc subjectCode" }, { status: 400 });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp" }, { status: 404 });
    }

    const level = detectCtqtLevel(targetClass.className, targetClass.grade, targetClass.level);
    const config = CTQT_LEVEL_CONFIGS[level];
    const subjectDef = config.subjects.find(s => s.code === subjectCode);

    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        englishName: true,
        gender: true,
        dateOfBirth: true,
      },
    });

    const studentIds = students.map(s => s.id);

    const entries = await prisma.ctqtGradeEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester,
        subjectCode,
        studentId: { in: studentIds },
      },
    });

    const assignment = await prisma.ctqtTeachingAssignment.findFirst({
      where: {
        classId,
        academicYearId,
        semester,
        subjectCode,
      },
      include: {
        primaryTeacher: { select: { id: true, teacherName: true } },
        delegatedTeacher: { select: { id: true, teacherName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        class: targetClass,
        level,
        subjectDef,
        students,
        entries,
        assignment,
      },
    });
  } catch (error: any) {
    console.error("Error in teacher CTQT grades GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { action, academicYearId, semester, classId, subjectCode, entries } = body;

    if (!academicYearId || !semester || !classId || !subjectCode) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const semInt = parseInt(String(semester), 10);
    const isSubmitReview = action === "submitReview";
    const nextStatus = isSubmitReview ? "PENDING_REVIEW" : undefined;

    if (Array.isArray(entries) && entries.length > 0) {
      const englishNameUpdates = entries
        .filter((e: any) => e.studentId && e.englishName !== undefined)
        .map((e: any) =>
          prisma.student.update({
            where: { id: e.studentId },
            data: {
              englishName: e.englishName && String(e.englishName).trim() !== "" ? String(e.englishName).trim() : null,
            },
          })
        );

      const gradeUpserts = entries
        .filter((e: any) => Boolean(e.studentId))
        .map((e: any) => {
          const midTermScore = toNullableFloat(e.midTermScore);
          const endTermScore = toNullableFloat(e.endTermScore);
          const gpaScore = toNullableFloat(e.gpaScore);
          const ieltsScore = toNullableFloat(e.ieltsScore);

          return prisma.ctqtGradeEntry.upsert({
            where: {
              academicYearId_semester_classId_studentId_subjectCode: {
                academicYearId,
                semester: semInt,
                classId,
                studentId: e.studentId,
                subjectCode,
              },
            },
            update: {
              progressScores: e.progressScores || null,
              midTermScore,
              endTermScore,
              gpaScore,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              ...(nextStatus ? { reviewStatus: nextStatus } : {}),
            },
            create: {
              academicYearId,
              semester: semInt,
              classId,
              studentId: e.studentId,
              subjectCode,
              progressScores: e.progressScores || null,
              midTermScore,
              endTermScore,
              gpaScore,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              reviewStatus: nextStatus || "DRAFT",
            },
          });
        });

      const assignmentStatusOps = isSubmitReview
        ? [
            prisma.ctqtTeachingAssignment.updateMany({
              where: {
                academicYearId,
                semester: semInt,
                classId,
                subjectCode,
              },
              data: {
                status: "SUBMITTED",
              },
            }),
          ]
        : [];

      await prisma.$transaction([
        ...englishNameUpdates,
        ...gradeUpserts,
        ...assignmentStatusOps,
      ]);
    }

    return NextResponse.json({
      success: true,
      message: isSubmitReview ? "Đã hoàn tất gửi duyệt sổ điểm môn học" : "Đã lưu sổ điểm môn học thành công",
    });
  } catch (error: any) {
    console.error("Error in teacher CTQT grades POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
