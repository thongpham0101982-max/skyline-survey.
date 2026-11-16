import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  CTQT_LEVEL_CONFIGS,
  CtqtLevel,
  CtqtSubjectDef,
  detectCtqtLevel,
  isCtqtClass,
  compareCtqtClasses,
} from "@/lib/ctqt/config";
import { sendEmail } from "@/lib/mail";
import { renderSkylineEmail, formatMarkdownToHtml } from "@/lib/email-templates";

interface TeacherEmailSource {
  id: string;
  teacherName: string;
  teacherCode?: string | null;
  email?: string | null;
  user?: { email?: string | null } | null;
}

interface GradeEntryEvalSource {
  progressScores?: string | null;
  midTermScore?: number | null;
  endTermScore?: number | null;
  gpaScore?: number | null;
  assessmentContentEn?: string | null;
  assessmentContentVi?: string | null;
  ieltsScore?: number | null;
  commentEn?: string | null;
  commentVi?: string | null;
  reviewStatus?: string | null;
  updatedAt?: Date | string | null;
}

export interface CtqtSlotProgressItem {
  slotKey: string;
  classId: string;
  className: string;
  grade: string;
  level: CtqtLevel;
  campusId: string;
  campusName: string;
  campusCode: string;
  subjectCode: string;
  subjectNameVi: string;
  subjectNameEn: string;
  isQualitative: boolean;
  requiredColsCount: number;
  isAssigned: boolean;
  primaryTeacherId: string | null;
  primaryTeacherName: string | null;
  primaryTeacherCode: string | null;
  primaryTeacherEmail: string | null;
  primaryTeacherCampusId: string;
  primaryTeacherCampusName: string;
  primaryTeacherDeptIds: string[];
  primaryTeacherDeptNames: string[];
  delegatedTeacherId: string | null;
  delegatedTeacherName: string | null;
  totalStudents: number;
  gradedStudents: number;
  fullScoreStudents: number;
  commentEnStudents: number;
  commentViStudents: number;
  missingStudents: number;
  progressRate: number;
  fullScoreRate: number;
  commentRate: number;
  progressStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS";
  reviewStatus: string;
  lastUpdatedAt: string | null;
}

function resolveTeacherEmail(teacher?: TeacherEmailSource | null): string | null {
  if (!teacher) return null;
  const isValid = (raw?: string | null): string | null => {
    if (!raw) return null;
    let clean = raw.trim().toLowerCase();
    if (!clean || clean.includes(" ")) return null;
    if (!clean.includes("@")) {
      if (/^\d+$/.test(clean)) return null;
      clean = `${clean}@skylineschool.edu.vn`;
    }
    const local = clean.split("@")[0];
    if (!local || /^\d+$/.test(local) || clean.includes("noreply")) return null;
    return clean;
  };
  return isValid(teacher.email) || isValid(teacher.user?.email) || null;
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

function evaluateStudentSlotEntry(
  entry: GradeEntryEvalSource | undefined,
  subDef: CtqtSubjectDef
) {
  const hasCommentEn = Boolean(entry?.commentEn && String(entry.commentEn).trim() !== "");
  const hasCommentVi = Boolean(entry?.commentVi && String(entry.commentVi).trim() !== "");
  const hasAssessmentText = Boolean(
    (entry?.assessmentContentEn && String(entry.assessmentContentEn).trim() !== "") ||
      (entry?.assessmentContentVi && String(entry.assessmentContentVi).trim() !== "")
  );

  if (subDef.isQualitative) {
    const hasQualitative = hasCommentEn || hasCommentVi || hasAssessmentText;
    return {
      hasAnyScore: hasQualitative,
      hasFullScore: hasQualitative,
      hasCommentEn,
      hasCommentVi,
      filledCols: hasQualitative ? 1 : 0,
      requiredCols: 1,
      scoreSummary: hasQualitative ? "Đã nhận xét" : "Chưa nhập",
    };
  }

  const progArr = parseProgressScores(entry?.progressScores);
  const nonGpaCols = subDef.scoreColumns.filter(c => c.key !== "gpaScore");
  const requiredCols = Math.max(1, nonGpaCols.length);

  let filledCols = 0;
  const colValues: string[] = [];

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
        entry?.ieltsScore !== null && entry?.ieltsScore !== undefined ? Number(entry.ieltsScore) : null;
    }
    if (val !== null && Number.isFinite(val)) {
      filledCols++;
      colValues.push(`${col.shortLabel}: ${val}`);
    }
  }

  const hasGpa =
    entry?.gpaScore !== null && entry?.gpaScore !== undefined && Number.isFinite(Number(entry.gpaScore));
  const hasAnyScore = filledCols > 0 || hasGpa;
  const hasFullScore = filledCols >= requiredCols;

  return {
    hasAnyScore,
    hasFullScore,
    hasCommentEn,
    hasCommentVi,
    filledCols,
    requiredCols,
    scoreSummary:
      colValues.length > 0 ? colValues.join(" • ") : hasGpa ? `GPA: ${entry?.gpaScore}` : "Chưa có điểm",
  };
}

function resolveSlotReviewStatus(
  assignmentStatus?: string | null,
  entries: GradeEntryEvalSource[] = []
): string {
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

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);
    const campusId = searchParams.get("campusId") || "";
    const action = searchParams.get("action") || "";

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu academicYearId" }, { status: 400 });
    }

    // Detail mode for a single (classId + subjectCode) slot
    if (action === "slot_detail") {
      const classId = searchParams.get("classId") || "";
      const subjectCode = searchParams.get("subjectCode") || "";
      if (!classId || !subjectCode) {
        return NextResponse.json({ success: false, error: "Thiếu classId hoặc subjectCode" }, { status: 400 });
      }

      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        include: { campus: { select: { id: true, campusCode: true, campusName: true } } },
      });
      if (!targetClass) {
        return NextResponse.json({ success: false, error: "Không tìm thấy lớp học" }, { status: 404 });
      }

      const level = detectCtqtLevel(
        targetClass.className,
        targetClass.grade || undefined,
        targetClass.level || undefined
      );
      const config = CTQT_LEVEL_CONFIGS[level];
      const subDef = config.subjects.find(s => s.code === subjectCode) || config.subjects[0];

      const [students, entries, assignment] = await Promise.all([
        prisma.student.findMany({
          where: { classId, status: "ACTIVE" },
          orderBy: { studentName: "asc" },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            englishName: true,
          },
        }),
        prisma.ctqtGradeEntry.findMany({
          where: { academicYearId, semester, classId, subjectCode },
        }),
        prisma.ctqtTeachingAssignment.findFirst({
          where: { academicYearId, semester, classId, subjectCode },
          include: {
            primaryTeacher: { select: { id: true, teacherName: true, teacherCode: true, email: true } },
          },
        }),
      ]);

      const entryByStudent = new Map<string, (typeof entries)[number]>();
      entries.forEach(e => entryByStudent.set(e.studentId, e));

      const studentRows = students.map(st => {
        const entry = entryByStudent.get(st.id);
        const evalInfo = evaluateStudentSlotEntry(entry, subDef);
        return {
          studentId: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          englishName: st.englishName || "",
          ...evalInfo,
          commentEn: entry?.commentEn || "",
          commentVi: entry?.commentVi || "",
          reviewStatus: entry?.reviewStatus || "DRAFT",
          updatedAt: entry?.updatedAt || null,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          classId: targetClass.id,
          className: targetClass.className,
          campusName: targetClass.campus?.campusName || "",
          level,
          subjectCode: subDef.code,
          subjectNameVi: subDef.nameVi,
          subjectNameEn: subDef.nameEn,
          isQualitative: Boolean(subDef.isQualitative),
          primaryTeacherName: assignment?.primaryTeacher?.teacherName || null,
          primaryTeacherCode: assignment?.primaryTeacher?.teacherCode || null,
          students: studentRows,
        },
      });
    }

    // Load CTQT classes (with fallback matching assignments API)
    const classWhere: { academicYearId: string; status: string; campusId?: string } = {
      academicYearId,
      status: "ACTIVE",
    };
    if (campusId) classWhere.campusId = campusId;

    let allClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: { className: "asc" },
    });

    if (allClasses.length === 0) {
      const fallbackWhere: { status: string; campusId?: string } = { status: "ACTIVE" };
      if (campusId) fallbackWhere.campusId = campusId;
      allClasses = await prisma.class.findMany({
        where: fallbackWhere,
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } },
        },
        orderBy: { className: "asc" },
      });
    }

    const ctqtClasses = allClasses
      .filter(c => isCtqtClass(c.className, c.educationSystem || undefined, c.level, c.grade))
      .sort(compareCtqtClasses);

    const classIds = ctqtClasses.map(c => c.id);

    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalClasses: 0,
            totalSlots: 0,
            assignedSlots: 0,
            unassignedSlots: 0,
            totalTeachers: 0,
            completedTeachers: 0,
            inProgressTeachers: 0,
            notStartedTeachers: 0,
            completedSlots: 0,
            inProgressSlots: 0,
            notStartedSlots: 0,
            approvedSlots: 0,
            totalExpectedStudents: 0,
            totalGradedStudents: 0,
            overallRate: 0,
          },
          teachers: [],
          slots: [],
        },
      });
    }

    const [students, assignments, gradeEntries] = await Promise.all([
      prisma.student.findMany({
        where: { classId: { in: classIds }, status: "ACTIVE" },
        select: { id: true, classId: true },
      }),
      prisma.ctqtTeachingAssignment.findMany({
        where: {
          academicYearId,
          semester,
          classId: { in: classIds },
        },
        include: {
          primaryTeacher: {
            select: {
              id: true,
              teacherName: true,
              teacherCode: true,
              email: true,
              campusId: true,
              user: { select: { email: true } },
              campus: { select: { id: true, campusCode: true, campusName: true } },
              departmentRel: { select: { id: true, code: true, name: true, divisionCode: true } },
              departmentAssignments: {
                select: {
                  departmentId: true,
                  department: { select: { id: true, code: true, name: true, divisionCode: true } },
                },
              },
            },
          },
          delegatedTeacher: {
            select: { id: true, teacherName: true, teacherCode: true },
          },
        },
      }),
      prisma.ctqtGradeEntry.findMany({
        where: {
          academicYearId,
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
    ]);

    // Group active student IDs per class
    const studentsByClass = new Map<string, Set<string>>();
    for (const st of students) {
      if (!st.classId) continue;
      if (!studentsByClass.has(st.classId)) {
        studentsByClass.set(st.classId, new Set());
      }
      studentsByClass.get(st.classId)!.add(st.id);
    }

    // Index assignments by classId__subjectCode
    const assignmentBySlot = new Map<string, (typeof assignments)[number]>();
    for (const a of assignments) {
      assignmentBySlot.set(`${a.classId}__${a.subjectCode}`, a);
    }

    // Index grade entries by classId__subjectCode -> Map<studentId, entry>
    const entriesBySlot = new Map<string, Map<string, (typeof gradeEntries)[number]>>();
    for (const ge of gradeEntries) {
      const classStudentSet = studentsByClass.get(ge.classId);
      if (!classStudentSet || !classStudentSet.has(ge.studentId)) continue;
      const slotKey = `${ge.classId}__${ge.subjectCode}`;
      if (!entriesBySlot.has(slotKey)) {
        entriesBySlot.set(slotKey, new Map());
      }
      entriesBySlot.get(slotKey)!.set(ge.studentId, ge);
    }

    const slots: CtqtSlotProgressItem[] = [];

    for (const cls of ctqtClasses) {
      const level = detectCtqtLevel(cls.className, cls.grade || undefined, cls.level || undefined);
      const config = CTQT_LEVEL_CONFIGS[level];
      const activeStudentIds = Array.from(studentsByClass.get(cls.id) || []);
      const totalStudents = activeStudentIds.length;

      for (const subDef of config.subjects) {
        const slotKey = `${cls.id}__${subDef.code}`;
        const foundAssign = assignmentBySlot.get(slotKey);
        const slotEntriesMap = entriesBySlot.get(slotKey) || new Map<string, (typeof gradeEntries)[number]>();

        let gradedStudents = 0;
        let fullScoreStudents = 0;
        let commentEnStudents = 0;
        let commentViStudents = 0;
        let lastUpdatedMs = 0;
        const rawEntries: GradeEntryEvalSource[] = [];

        for (const stId of activeStudentIds) {
          const entry = slotEntriesMap.get(stId);
          if (entry) {
            rawEntries.push(entry);
            if (entry.updatedAt) {
              const t = new Date(entry.updatedAt).getTime();
              if (t > lastUpdatedMs) lastUpdatedMs = t;
            }
          }
          const evalInfo = evaluateStudentSlotEntry(entry, subDef);
          if (evalInfo.hasAnyScore) gradedStudents++;
          if (evalInfo.hasFullScore) fullScoreStudents++;
          if (evalInfo.hasCommentEn) commentEnStudents++;
          if (evalInfo.hasCommentVi) commentViStudents++;
        }

        const progressRate = totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0;
        const fullScoreRate = totalStudents > 0 ? Math.round((fullScoreStudents / totalStudents) * 100) : 0;
        const commentRate =
          totalStudents > 0
            ? Math.round((Math.max(commentEnStudents, commentViStudents) / totalStudents) * 100)
            : 0;

        let progressStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" = "NOT_STARTED";
        if (totalStudents === 0) {
          progressStatus = "NO_STUDENTS";
        } else if (gradedStudents >= totalStudents) {
          progressStatus = "COMPLETED";
        } else if (gradedStudents > 0) {
          progressStatus = "IN_PROGRESS";
        }

        const primaryTeacher = foundAssign?.primaryTeacher || null;
        const deptNamesSet = new Set<string>();
        const deptIdsSet = new Set<string>();
        if (primaryTeacher?.departmentRel) {
          if (primaryTeacher.departmentRel.name) deptNamesSet.add(primaryTeacher.departmentRel.name);
          if (primaryTeacher.departmentRel.id) deptIdsSet.add(primaryTeacher.departmentRel.id);
        }
        if (Array.isArray(primaryTeacher?.departmentAssignments)) {
          for (const da of primaryTeacher.departmentAssignments) {
            if (da.department?.name) deptNamesSet.add(da.department.name);
            if (da.department?.id) deptIdsSet.add(da.department.id);
          }
        }

        const reviewStatus = resolveSlotReviewStatus(foundAssign?.status, rawEntries);

        slots.push({
          slotKey,
          classId: cls.id,
          className: cls.className,
          grade: cls.grade || "",
          level,
          campusId: cls.campusId || "",
          campusName: cls.campus?.campusName || "",
          campusCode: cls.campus?.campusCode || "",
          subjectCode: subDef.code,
          subjectNameVi: subDef.nameVi,
          subjectNameEn: subDef.nameEn,
          isQualitative: Boolean(subDef.isQualitative),
          requiredColsCount: subDef.isQualitative
            ? 1
            : Math.max(1, subDef.scoreColumns.filter(c => c.key !== "gpaScore").length),
          isAssigned: Boolean(primaryTeacher?.id),
          primaryTeacherId: primaryTeacher?.id || null,
          primaryTeacherName: primaryTeacher?.teacherName || null,
          primaryTeacherCode: primaryTeacher?.teacherCode || null,
          primaryTeacherEmail: resolveTeacherEmail(primaryTeacher),
          primaryTeacherCampusId: primaryTeacher?.campusId || "",
          primaryTeacherCampusName: primaryTeacher?.campus?.campusName || "",
          primaryTeacherDeptIds: Array.from(deptIdsSet),
          primaryTeacherDeptNames: Array.from(deptNamesSet),
          delegatedTeacherId: foundAssign?.delegatedTeacher?.id || null,
          delegatedTeacherName: foundAssign?.delegatedTeacher?.teacherName || null,
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
        });
      }
    }

    // Aggregate by Assigned Primary Teacher (GVBM)
    interface TeacherAccumulator {
      teacherId: string;
      teacherName: string;
      teacherCode: string;
      email: string | null;
      campusId: string;
      campusName: string;
      deptIds: string[];
      deptNames: string[];
      classIdSet: Set<string>;
      slotCount: number;
      completedSlots: number;
      inProgressSlots: number;
      notStartedSlots: number;
      noStudentsSlots: number;
      approvedSlots: number;
      pendingReviewSlots: number;
      totalExpectedStudents: number;
      totalGradedStudents: number;
      totalFullScoreStudents: number;
      totalCommentEnStudents: number;
      totalCommentViStudents: number;
      lastUpdatedMs: number;
      slots: CtqtSlotProgressItem[];
    }

    const teacherMap = new Map<string, TeacherAccumulator>();
    for (const s of slots) {
      if (!s.primaryTeacherId) continue;
      if (!teacherMap.has(s.primaryTeacherId)) {
        teacherMap.set(s.primaryTeacherId, {
          teacherId: s.primaryTeacherId,
          teacherName: s.primaryTeacherName || "Giáo viên",
          teacherCode: s.primaryTeacherCode || "",
          email: s.primaryTeacherEmail || null,
          campusId: s.primaryTeacherCampusId || "",
          campusName: s.primaryTeacherCampusName || "",
          deptIds: s.primaryTeacherDeptIds || [],
          deptNames: s.primaryTeacherDeptNames || [],
          classIdSet: new Set<string>(),
          slotCount: 0,
          completedSlots: 0,
          inProgressSlots: 0,
          notStartedSlots: 0,
          noStudentsSlots: 0,
          approvedSlots: 0,
          pendingReviewSlots: 0,
          totalExpectedStudents: 0,
          totalGradedStudents: 0,
          totalFullScoreStudents: 0,
          totalCommentEnStudents: 0,
          totalCommentViStudents: 0,
          lastUpdatedMs: 0,
          slots: [],
        });
      }

      const item = teacherMap.get(s.primaryTeacherId)!;
      item.classIdSet.add(s.classId);
      item.slotCount++;
      if (s.progressStatus === "COMPLETED") item.completedSlots++;
      else if (s.progressStatus === "IN_PROGRESS") item.inProgressSlots++;
      else if (s.progressStatus === "NO_STUDENTS") item.noStudentsSlots++;
      else item.notStartedSlots++;

      if (s.reviewStatus === "APPROVED") item.approvedSlots++;
      else if (s.reviewStatus === "PENDING_REVIEW") item.pendingReviewSlots++;

      item.totalExpectedStudents += s.totalStudents;
      item.totalGradedStudents += s.gradedStudents;
      item.totalFullScoreStudents += s.fullScoreStudents;
      item.totalCommentEnStudents += s.commentEnStudents;
      item.totalCommentViStudents += s.commentViStudents;

      if (s.lastUpdatedAt) {
        const ms = new Date(s.lastUpdatedAt).getTime();
        if (ms > item.lastUpdatedMs) item.lastUpdatedMs = ms;
      }

      item.slots.push(s);
    }

    const teachers = Array.from(teacherMap.values())
      .map(t => {
        const activeSlotsCount = t.slotCount - t.noStudentsSlots;
        let teacherStatus: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "NO_STUDENTS" = "NOT_STARTED";
        if (activeSlotsCount <= 0) {
          teacherStatus = "NO_STUDENTS";
        } else if (t.completedSlots === activeSlotsCount) {
          teacherStatus = "COMPLETED";
        } else if (t.totalGradedStudents > 0 || t.completedSlots > 0) {
          teacherStatus = "IN_PROGRESS";
        }

        const progressRate =
          t.totalExpectedStudents > 0
            ? Math.round((t.totalGradedStudents / t.totalExpectedStudents) * 100)
            : teacherStatus === "COMPLETED"
            ? 100
            : 0;

        const commentRate =
          t.totalExpectedStudents > 0
            ? Math.round(
                (Math.max(t.totalCommentEnStudents, t.totalCommentViStudents) / t.totalExpectedStudents) * 100
              )
            : 0;

        return {
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          teacherCode: t.teacherCode,
          email: t.email,
          campusId: t.campusId,
          campusName: t.campusName,
          deptIds: t.deptIds,
          deptNames: t.deptNames,
          classCount: t.classIdSet.size,
          slotCount: t.slotCount,
          completedSlots: t.completedSlots,
          inProgressSlots: t.inProgressSlots,
          notStartedSlots: t.notStartedSlots,
          noStudentsSlots: t.noStudentsSlots,
          incompleteSlots: t.inProgressSlots + t.notStartedSlots,
          approvedSlots: t.approvedSlots,
          pendingReviewSlots: t.pendingReviewSlots,
          totalExpectedStudents: t.totalExpectedStudents,
          totalGradedStudents: t.totalGradedStudents,
          totalFullScoreStudents: t.totalFullScoreStudents,
          totalCommentEnStudents: t.totalCommentEnStudents,
          totalCommentViStudents: t.totalCommentViStudents,
          missingStudents: Math.max(0, t.totalExpectedStudents - t.totalGradedStudents),
          progressRate,
          commentRate,
          teacherStatus,
          lastUpdatedAt: t.lastUpdatedMs > 0 ? new Date(t.lastUpdatedMs).toISOString() : null,
          slots: t.slots,
        };
      })
      .sort((a, b) => {
        const rank = (st: string) =>
          st === "NOT_STARTED" ? 0 : st === "IN_PROGRESS" ? 1 : st === "COMPLETED" ? 2 : 3;
        if (rank(a.teacherStatus) !== rank(b.teacherStatus)) {
          return rank(a.teacherStatus) - rank(b.teacherStatus);
        }
        return (a.teacherName || "").localeCompare(b.teacherName || "", "vi");
      });

    const assignedSlotsList = slots.filter(s => s.isAssigned);
    const totalExpectedStudents = assignedSlotsList.reduce((sum, s) => sum + s.totalStudents, 0);
    const totalGradedStudents = assignedSlotsList.reduce((sum, s) => sum + s.gradedStudents, 0);
    const overallRate =
      totalExpectedStudents > 0 ? Math.round((totalGradedStudents / totalExpectedStudents) * 100) : 0;

    const summary = {
      totalClasses: ctqtClasses.length,
      totalSlots: slots.length,
      assignedSlots: assignedSlotsList.length,
      unassignedSlots: slots.length - assignedSlotsList.length,
      totalTeachers: teachers.length,
      completedTeachers: teachers.filter(t => t.teacherStatus === "COMPLETED").length,
      inProgressTeachers: teachers.filter(t => t.teacherStatus === "IN_PROGRESS").length,
      notStartedTeachers: teachers.filter(t => t.teacherStatus === "NOT_STARTED").length,
      completedSlots: assignedSlotsList.filter(s => s.progressStatus === "COMPLETED").length,
      inProgressSlots: assignedSlotsList.filter(s => s.progressStatus === "IN_PROGRESS").length,
      notStartedSlots: assignedSlotsList.filter(s => s.progressStatus === "NOT_STARTED").length,
      approvedSlots: assignedSlotsList.filter(s => s.reviewStatus === "APPROVED").length,
      totalExpectedStudents,
      totalGradedStudents,
      overallRate,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        teachers,
        slots,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi máy chủ";
    console.error("Error in CTQT grade-progress GET:", error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { action, academicYearId, semester, teacherIds, onlyIncomplete = true, customMessage } = body;

    if (action !== "send_reminder") {
      return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 });
    }

    if (!academicYearId || !semester || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn ít nhất 1 giáo viên để gửi nhắc nhở." },
        { status: 400 }
      );
    }

    const semInt = parseInt(String(semester), 10);
    const yearRecord = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { name: true },
    });
    const yearName = yearRecord?.name || "2026-2027";

    const assignments = await prisma.ctqtTeachingAssignment.findMany({
      where: {
        academicYearId,
        semester: semInt,
        primaryTeacherId: { in: teacherIds },
      },
      include: {
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            level: true,
            campus: { select: { campusCode: true, campusName: true } },
          },
        },
        primaryTeacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            email: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phân công nào của các giáo viên đã chọn." },
        { status: 400 }
      );
    }

    const classIds = Array.from(new Set(assignments.map(a => a.classId)));
    const [students, gradeEntries] = await Promise.all([
      prisma.student.findMany({
        where: { classId: { in: classIds }, status: "ACTIVE" },
        select: { id: true, classId: true },
      }),
      prisma.ctqtGradeEntry.findMany({
        where: { academicYearId, semester: semInt, classId: { in: classIds } },
      }),
    ]);

    const studentsByClass = new Map<string, string[]>();
    for (const st of students) {
      if (!st.classId) continue;
      if (!studentsByClass.has(st.classId)) studentsByClass.set(st.classId, []);
      studentsByClass.get(st.classId)!.push(st.id);
    }

    const entryMap = new Map<string, (typeof gradeEntries)[number]>();
    for (const ge of gradeEntries) {
      entryMap.set(`${ge.classId}__${ge.subjectCode}__${ge.studentId}`, ge);
    }

    interface ReminderRow {
      className: string;
      campusLabel: string;
      subjectLabel: string;
      graded: number;
      commented: number;
      total: number;
      rate: number;
    }

    const teacherGroups = new Map<
      string,
      { teacher: NonNullable<(typeof assignments)[number]["primaryTeacher"]>; rows: ReminderRow[] }
    >();

    for (const a of assignments) {
      if (!a.primaryTeacher || !a.class) continue;
      const lv = detectCtqtLevel(
        a.class.className,
        a.class.grade || undefined,
        a.class.level || undefined
      );
      const cfg = CTQT_LEVEL_CONFIGS[lv];
      const subDef = cfg.subjects.find(s => s.code === a.subjectCode);
      if (!subDef) continue;

      const stIds = studentsByClass.get(a.classId) || [];
      let graded = 0;
      let commented = 0;
      for (const sid of stIds) {
        const ev = evaluateStudentSlotEntry(
          entryMap.get(`${a.classId}__${a.subjectCode}__${sid}`),
          subDef
        );
        if (ev.hasAnyScore) graded++;
        if (ev.hasCommentEn || ev.hasCommentVi) commented++;
      }

      const total = stIds.length;
      const isComplete = total === 0 || graded >= total;
      if (onlyIncomplete && isComplete) continue;

      if (!teacherGroups.has(a.primaryTeacher.id)) {
        teacherGroups.set(a.primaryTeacher.id, { teacher: a.primaryTeacher, rows: [] });
      }
      teacherGroups.get(a.primaryTeacher.id)!.rows.push({
        className: a.class.className,
        campusLabel: a.class.campus?.campusCode || a.class.campus?.campusName || "",
        subjectLabel: `${subDef.nameVi} (${subDef.code})`,
        graded,
        commented,
        total,
        rate: total > 0 ? Math.round((graded / total) * 100) : 100,
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const skippedTeachers: string[] = [];
    const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
    const portalUrl = `${baseUrl}/teacher/so-diem-ctqt`;

    for (const [, bundle] of teacherGroups) {
      const { teacher, rows } = bundle;
      if (rows.length === 0) continue;

      const toEmail = resolveTeacherEmail(teacher);
      if (!toEmail) {
        skippedTeachers.push(`${teacher.teacherName} (${teacher.teacherCode || "chưa có email"})`);
        continue;
      }

      const tableRowsHtml = rows
        .map(r => {
          const statusBadge =
            r.graded === 0
              ? `<span style="background:#FFF1F2;color:#BE123C;border:1px solid #FECDD3;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Chưa nhập (0/${r.total} HS)</span>`
              : r.graded < r.total
              ? `<span style="background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Đang nhập (${r.graded}/${r.total} HS - ${r.rate}%)</span>`
              : `<span style="background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Đã nhập đủ (${r.graded}/${r.total} HS)</span>`;
          return `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${r.className}${r.campusLabel ? ` <span style="font-weight:500;color:#64748B;">(${r.campusLabel})</span>` : ""}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #334155;">${r.subjectLabel}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0;">${statusBadge}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #475569; font-size: 12px;">Nhận xét: ${r.commented}/${r.total} HS</td>
            </tr>`;
        })
        .join("");

      const customNoteHtml = customMessage?.trim()
        ? `
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #92400E; line-height: 1.5;">
            <div style="font-weight: 700; margin-bottom: 4px;">Lưu ý từ Ban Khảo thí &amp; ĐBCL:</div>
            <div>${formatMarkdownToHtml(customMessage.trim())}</div>
          </div>
        `
        : "";

      const progressTableHtml = `
        <div style="margin: 16px 0; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
            <thead>
              <tr style="background-color: #003B3A; color: #FFFFFF;">
                <th style="padding: 9px 10px;">Lớp học</th>
                <th style="padding: 9px 10px; color: #CCFBF1;">Môn phân công</th>
                <th style="padding: 9px 10px; color: #5EEAD4;">Tiến độ điểm</th>
                <th style="padding: 9px 10px; color: #CCFBF1;">Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
        ${customNoteHtml}
      `;

      const emailHtml = renderSkylineEmail({
        headerBadge: "CHƯƠNG TRÌNH QUỐC TẾ (CTQT)",
        headerTitle: "Nhắc Nhở Hoàn Tất Nhập Điểm & Nhận Xét Sổ Điểm CTQT",
        headerSubtitle: "Ban Khảo thí & Đảm bảo chất lượng Sky-Line",
        headerTheme: "teal",
        recipientName: teacher.teacherName,
        greetingPrefix: "Kính gửi Thầy/Cô",
        introMessage: `Qua rà soát tiến độ nhập điểm Chương trình Quốc tế (CTQT) Năm học ${yearName} — Học kỳ ${semInt}, hệ thống ghi nhận một số lớp/môn học do Thầy/Cô phụ trách hiện chưa hoàn tất dữ liệu điểm hoặc nhận xét:`,
        detailsTitle: "THÔNG TIN TIẾN ĐỘ PHÂN CÔNG",
        details: [
          {
            label: "Giáo viên bộ môn",
            value: `${teacher.teacherName}${teacher.teacherCode ? ` (${teacher.teacherCode})` : ""}`,
            highlight: true,
          },
          {
            label: "Năm học / Học kỳ",
            value: `Năm học ${yearName} — Học kỳ ${semInt}`,
          },
          {
            label: "Số môn cần rà soát bổ sung",
            value: `${rows.length} lượt lớp - môn`,
            highlight: true,
          },
        ],
        extraHtml: progressTableHtml,
        noticeBox: {
          type: "info",
          title: "Hướng dẫn hoàn thiện sổ điểm",
          content:
            "Thầy/Cô vui lòng truy cập phân hệ Sổ điểm CTQT để hoàn tất nhập điểm thành phần, nhận xét song ngữ và nhấn gửi duyệt đúng tiến độ phục vụ in ấn Report Card.",
        },
        button: {
          text: "Mở Sổ điểm CTQT để nhập điểm",
          url: portalUrl,
          color: "#003B3A",
        },
      });

      try {
        const res = await sendEmail({
          to: toEmail,
          subject: `[Sky-line SMS] Nhắc tiến độ nhập điểm CTQT - HK${semInt} (${yearName})`,
          html: emailHtml,
          from: "Ban Khảo thí & ĐBCL Sky-Line <ktdbcl@skylineschool.edu.vn>",
        });
        if (res.success) sentCount++;
        else failedCount++;
      } catch (err) {
        console.error(`[CTQT Progress Reminder Email Error] to ${toEmail}:`, err);
        failedCount++;
      }
    }

    if (sentCount === 0 && failedCount === 0 && skippedTeachers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Tất cả các giáo viên được chọn đã hoàn thành 100% nhập điểm cho các lớp phụ trách.",
      });
    }

    const msgParts: string[] = [];
    if (sentCount > 0) msgParts.push(`Đã gửi email nhắc tiến độ đến ${sentCount} giáo viên`);
    if (skippedTeachers.length > 0) {
      msgParts.push(`Bỏ qua ${skippedTeachers.length} GV chưa có email (${skippedTeachers.join(", ")})`);
    }
    if (failedCount > 0) msgParts.push(`${failedCount} email gửi lỗi`);

    return NextResponse.json({
      success: sentCount > 0 || skippedTeachers.length > 0,
      sentCount,
      failedCount,
      skippedCount: skippedTeachers.length,
      message: msgParts.join(". ") + ".",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi máy chủ";
    console.error("Error in CTQT grade-progress POST:", error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
