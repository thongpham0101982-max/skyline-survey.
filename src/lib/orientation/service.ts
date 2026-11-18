import { prisma } from "@/lib/db";
import { getGradeGroupKey, ORIENTATION_GRADE_GROUPS, GradeGroupKey } from "./criteria-config";

export interface OrientationQuestion {
  id: string;
  gradeGroup: string;
  grade?: string | null;
  category: string;
  categoryLabel?: string | null;
  questionText: string;
  suggestedGuideline?: string | null;
  sampleAnswers?: string | null;
  sortOrder: number;
  status: string;
}

export interface StudentOrientationData {
  id?: string;
  studentId: string;
  academicYearId?: string | null;
  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewDate?: Date | string | null;
  status?: string;

  // Tab 1: Phỏng vấn học sinh
  adaptationLevel?: string | null;
  interviewData?: string | null; // JSON Array of [{ questionId, questionText, rating, answerNotes }]
  studentStrengths?: string | null;
  studentNeedsSupport?: string | null;
  interviewerGeneralRemark?: string | null;

  // Tab 2: Trao đổi PHHS
  parentExpectations?: string | null;
  parentHealthNotes?: string | null;
  parentPersonalityNotes?: string | null;
  parentSpecialRequests?: string | null;
  cooperationCommitment?: string | null;
  parentRepresentativeName?: string | null;
  parentPhone?: string | null;

  // Định hướng chung
  proposedEduSystem?: string | null;
  proposedClassPlacement?: string | null;
  admissionConsultantNote?: string | null;

  // Khảo sát Tâm lý
  psychologyReferralStatus?: string | null; // NONE | REQUESTED | COMPLETED
  psychologyReferralReason?: string | null;
  psychologyTeacherId?: string | null;
  psychologyTeacherName?: string | null;
  psychologyData?: string | null;
}

/**
 * Lấy nhóm khối (gradeGroup) từ tên khối lớp (grade) - chuẩn 05 nhóm khối
 */
export function getGradeGroupFromGrade(gradeStr: string | number | null | undefined): string {
  return getGradeGroupKey(gradeStr);
}

/**
 * Lấy danh sách câu hỏi / tiêu chí phỏng vấn định hướng theo nhóm khối
 */
export async function getOrientationQuestions(gradeGroup?: string) {
  const pAny = prisma as any;
  const targetGroup = gradeGroup ? (gradeGroup === "KHOI_6_9" ? "KHOI_6" : gradeGroup) : undefined;
  const where: any = { status: "ACTIVE" };
  if (targetGroup && targetGroup !== "ALL") {
    where.gradeGroup = { in: [targetGroup, "ALL"] };
  }

  try {
    const list = await pAny.orientationQuestionCatalog.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    if (list && list.length > 0) {
      return list;
    }

    // Fallback sang cấu hình tiêu chí chuẩn hóa nếu cơ sở dữ liệu chưa có
    const groupKey = (targetGroup as GradeGroupKey) || "KHOI_1";
    const groupConfig = ORIENTATION_GRADE_GROUPS[groupKey] || ORIENTATION_GRADE_GROUPS.KHOI_1;
    return groupConfig.criteria.map((c) => ({
      id: c.id,
      gradeGroup: groupKey,
      grade: groupConfig.label,
      category: c.category,
      categoryLabel: c.categoryLabel,
      questionText: c.name,
      suggestedGuideline: c.guideline,
      sampleAnswers: JSON.stringify({
        suggestedQuestions: c.suggestedQuestions,
        mandatoryCommentRatings: c.mandatoryCommentRatings,
        criterionId: c.id,
        version: "2026.1"
      }),
      sortOrder: c.sortOrder,
      status: "ACTIVE"
    }));
  } catch (error) {
    console.error("Error fetching orientation questions:", error);
    return [];
  }
}

/**
 * Lấy phiếu định hướng của học sinh
 */
export async function getStudentOrientationRecord(studentId: string) {
  const pAny = prisma as any;
  try {
    const record = await pAny.studentOrientationRecord.findUnique({
      where: { studentId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            grade: true,
            dateOfBirth: true,
            gender: true,
            className: true,
            admissionCriteria: true,
            targetType: true,
            surveySystem: true,
            surveyFormType: true,
            admissionCampus: true,
            registeredCampus: true,
            cityName: true,
            districtName: true,
            wardName: true,
            countryName: true,
            oldSchoolName: true,
            oldSchoolType: true,
            hoSoCtQuocTe: true,
            hocKy: true,
            academicRating: true,
            conductRating: true,
            kqHocTap: true,
            kqRenLuyen: true,
            kqgdTieuHoc: true,
            mathScore: true,
            literatureScore: true,
            writtenEnglishScore: true,
            oralEnglishScore: true,
            psychologyScore: true,
            periodId: true,
            batchId: true,
            period: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                name: true,
                status: true,
                campus: {
                  select: {
                    id: true,
                    campusName: true,
                    campusCode: true
                  }
                }
              }
            },
            scores: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    if (record) {
      try {
        const rawRows = await pAny.$queryRawUnsafe(
          `SELECT "psychologyReferralStatus", "psychologyReferralReason", "psychologyTeacherId", "psychologyTeacherName", "psychologyData" FROM "StudentOrientationRecord" WHERE "studentId" = ? LIMIT 1`,
          studentId
        );
        if (Array.isArray(rawRows) && rawRows[0]) {
          Object.assign(record, rawRows[0]);
        }
      } catch (rawErr) {
        // ignore fallback error
      }
    }

    return record;
  } catch (error) {
    console.error("Error fetching student orientation record:", error);
    return null;
  }
}

/**
 * Lưu hoặc cập nhật phiếu định hướng của học sinh
 */
const ALLOWED_ORIENTATION_COLS = new Set([
  'academicYearId',
  'interviewerId',
  'interviewerName',
  'interviewDate',
  'status',
  'adaptationLevel',
  'interviewData',
  'studentStrengths',
  'studentNeedsSupport',
  'interviewerGeneralRemark',
  'parentExpectations',
  'parentHealthNotes',
  'parentPersonalityNotes',
  'parentSpecialRequests',
  'cooperationCommitment',
  'parentRepresentativeName',
  'parentPhone',
  'proposedEduSystem',
  'proposedClassPlacement',
  'admissionConsultantNote',
  'psychologyReferralStatus',
  'psychologyReferralReason',
  'psychologyTeacherId',
  'psychologyTeacherName',
  'psychologyData'
]);

export async function upsertStudentOrientationRecord(data: StudentOrientationData) {
  const pAny = prisma as any;
  const { studentId, ...rest } = data;

  const sanitizedRest: Record<string, any> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (ALLOWED_ORIENTATION_COLS.has(k)) {
      sanitizedRest[k] = v;
    }
  }

  try {
    const existing = await pAny.studentOrientationRecord.findUnique({
      where: { studentId }
    });

    const now = new Date();

    if (existing) {
      try {
        return await pAny.studentOrientationRecord.update({
          where: { studentId },
          data: {
            ...sanitizedRest,
            updatedAt: now
          }
        });
      } catch (prismaUpdateErr) {
        // Fallback update trực tiếp bằng SQL an toàn
        const updates: string[] = ['"updatedAt" = ?'];
        const params: any[] = [now.toISOString()];

        for (const [k, v] of Object.entries(sanitizedRest)) {
          updates.push(`"${k}" = ?`);
          params.push(v instanceof Date ? v.toISOString() : (v ?? null));
        }
        params.push(studentId);

        await pAny.$executeRawUnsafe(
          `UPDATE "StudentOrientationRecord" SET ${updates.join(", ")} WHERE "studentId" = ?`,
          ...params
        );
        return await getStudentOrientationRecord(studentId);
      }
    } else {
      try {
        return await pAny.studentOrientationRecord.create({
          data: {
            studentId,
            ...sanitizedRest
          }
        });
      } catch (prismaCreateErr) {
        // Fallback insert trực tiếp bằng SQL an toàn
        const id = "sor_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        const cols: string[] = ['"id"', '"studentId"', '"createdAt"', '"updatedAt"'];
        const placeholders: string[] = ["?", "?", "?", "?"];
        const params: any[] = [id, studentId, now.toISOString(), now.toISOString()];

        for (const [k, v] of Object.entries(sanitizedRest)) {
          cols.push(`"${k}"`);
          placeholders.push("?");
          params.push(v instanceof Date ? v.toISOString() : (v ?? null));
        }

        await pAny.$executeRawUnsafe(
          `INSERT INTO "StudentOrientationRecord" (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
          ...params
        );
        return await getStudentOrientationRecord(studentId);
      }
    }
  } catch (error) {
    console.error("Error upserting student orientation record:", error);
    throw error;
  }
}

/**
 * Lấy Giáo viên phụ trách định hướng được phân công theo đợt / khối của học sinh
 */
export async function getAssignedOrientationTeacher(studentId: string, currentUserId?: string) {
  const pAny = prisma as any;
  try {
    const student = await pAny.inputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        grade: true,
        periodId: true,
        batchId: true
      }
    });

    if (!student || !student.periodId) return { primary: null, list: [] };

    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();

    const where: any = {
      periodId: student.periodId
    };

    if (student.batchId) {
      where.OR = [
        { batchId: student.batchId },
        { batchId: null }
      ];
    }

    const assignments = await pAny.inputAssessmentTeacherAssignment.findMany({
      where,
      include: {
        user: {
          include: {
            teacher: true
          }
        },
        subject: true
      }
    });

    if (!assignments || assignments.length === 0) {
      return { primary: null, list: [] };
    }

    // Lọc theo khối của học sinh (hoặc phân công chung toàn khối)
    const gradeMatched = assignments.filter((a: any) => {
      if (!a.grade) return true;
      const aGrade = String(a.grade).toLowerCase().replace("khối", "").replace("khoi", "").trim();
      return aGrade === rawGrade;
    });

    const pool = gradeMatched.length > 0 ? gradeMatched : assignments;

    // Ưu tiên môn Định hướng / Phỏng vấn / Tư duy
    const isOrientationSubj = (subj: any) => {
      const code = String(subj?.code || "").toUpperCase();
      const name = String(subj?.name || "").toLowerCase();
      return (
        ["DH", "PV", "PVDH", "DINH_HUONG", "KSDH", "TDTD"].includes(code) ||
        name.includes("định hướng") ||
        name.includes("phỏng vấn") ||
        name.includes("tư duy")
      );
    };

    const isPsychSubj = (subj: any) => {
      const code = String(subj?.code || "").toUpperCase();
      const name = String(subj?.name || "").toLowerCase();
      return code === "TLY" || name.includes("tâm lý");
    };

    // Ưu tiên phân công đúng đợt (batchId khớp) trước
    const sortedPool = [...pool].sort((a: any, b: any) => {
      const aBatchMatch = student.batchId && a.batchId === student.batchId ? 1 : 0;
      const bBatchMatch = student.batchId && b.batchId === student.batchId ? 1 : 0;
      if (aBatchMatch !== bBatchMatch) return bBatchMatch - aBatchMatch;

      const aIsOrient = isOrientationSubj(a.subject) ? 1 : 0;
      const bIsOrient = isOrientationSubj(b.subject) ? 1 : 0;
      if (aIsOrient !== bIsOrient) return bIsOrient - aIsOrient;

      const aIsCurrent = currentUserId && a.user?.id === currentUserId ? 1 : 0;
      const bIsCurrent = currentUserId && b.user?.id === currentUserId ? 1 : 0;
      return bIsCurrent - aIsCurrent;
    });

    const nonPsychPool = sortedPool.filter((a: any) => !isPsychSubj(a.subject));
    const effectivePool = nonPsychPool.length > 0 ? nonPsychPool : sortedPool;

    const userMap = new Map();
    effectivePool.forEach((a: any) => {
      if (a.user && !userMap.has(a.user.id)) {
        userMap.set(a.user.id, {
          teacherId: a.user.id,
          teacherName: a.user.fullName || a.user.name || a.user.teacher?.teacherName || "GV Định hướng",
          email: a.user.teacher?.email || a.user.email || "",
          grade: a.grade || student.grade,
          subjectName: a.subject?.name || "Định hướng",
          isOrientationSubject: isOrientationSubj(a.subject),
          isBatchMatched: Boolean(student.batchId && a.batchId === student.batchId)
        });
      }
    });

    const list = Array.from(userMap.values());
    const primary =
      (currentUserId ? list.find((t: any) => t.teacherId === currentUserId) : null) ||
      list[0] ||
      null;

    return { primary, list };
  } catch (error) {
    console.error("Error fetching assigned orientation teacher:", error);
    return { primary: null, list: [] };
  }
}

/**
 * Lấy danh sách Giáo viên Tâm lý được phân công theo học sinh/khối
 */
export async function getAssignedPsychologyTeachers(studentId: string) {
  const pAny = prisma as any;
  try {
    const student = await pAny.inputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        grade: true,
        surveySystem: true,
        surveyFormType: true,
        periodId: true,
        batchId: true
      }
    });

    if (!student) return [];

    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();

    // Query assignments for psychology subject (code: TLY or name contains 'Tâm lý')
    const where: any = {
      periodId: student.periodId,
      subject: {
        OR: [
          { code: "TLY" },
          { name: { contains: "Tâm lý" } },
          { name: { contains: "tâm lý" } }
        ]
      }
    };

    if (student.batchId) {
      where.OR = [
        { batchId: student.batchId },
        { batchId: null }
      ];
    }

    const assignments = await pAny.inputAssessmentTeacherAssignment.findMany({
      where,
      include: {
        user: {
          include: {
            teacher: true
          }
        },
        subject: true
      }
    });

    // Sort exact batch + grade match first
    const sortedAssignments = [...assignments].sort((a: any, b: any) => {
      const aBatchMatch = student.batchId && a.batchId === student.batchId ? 1 : 0;
      const bBatchMatch = student.batchId && b.batchId === student.batchId ? 1 : 0;
      if (aBatchMatch !== bBatchMatch) return bBatchMatch - aBatchMatch;

      const aGrade = String(a.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
      const bGrade = String(b.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
      const aGradeMatch = aGrade === rawGrade ? 1 : 0;
      const bGradeMatch = bGrade === rawGrade ? 1 : 0;
      return bGradeMatch - aGradeMatch;
    });

    // Filter by grade if possible, or fallback to all psychology teachers in the period
    const matched = sortedAssignments.filter((a: any) => {
      if (!a.grade) return true;
      const aGrade = String(a.grade).toLowerCase().replace("khối", "").replace("khoi", "").trim();
      return aGrade === rawGrade;
    });

    const targetList = matched.length > 0 ? matched : sortedAssignments;

    // Deduplicate by user
    const userMap = new Map();
    targetList.forEach((a: any) => {
      if (a.user && !userMap.has(a.user.id)) {
        const aGrade = String(a.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
        userMap.set(a.user.id, {
          userId: a.user.id,
          fullName: a.user.fullName || a.user.name || a.user.teacher?.teacherName,
          email: a.user.teacher?.email || a.user.email,
          phone: a.user.teacher?.phone || a.user.phone,
          grade: a.grade,
          batchId: a.batchId,
          isBatchAssigned: Boolean(student.batchId && a.batchId === student.batchId),
          isGradeMatched: !a.grade || aGrade === rawGrade,
          subjectName: a.subject?.name || "Tâm lý"
        });
      }
    });

    return Array.from(userMap.values());
  } catch (error) {
    console.error("Error fetching assigned psychology teachers:", error);
    return [];
  }
}

/**
 * Lấy danh sách các Tổ / Bộ phận (ưu tiên đưa Tổ TLHN lên đầu)
 */
export async function getDepartments() {
  const pAny = prisma as any;
  try {
    const list = await pAny.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { name: "asc" }
    });

    return list.sort((a: any, b: any) => {
      const aIsTLHN = a.code === "TO_TLHN" || (a.name || "").includes("TLHN");
      const bIsTLHN = b.code === "TO_TLHN" || (b.name || "").includes("TLHN");
      if (aIsTLHN && !bIsTLHN) return -1;
      if (!aIsTLHN && bIsTLHN) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

/**
 * Lấy danh sách Giáo viên theo Tổ (Mặc định Tổ TLHN)
 */
export async function getDepartmentTeachers(deptCodeOrId?: string) {
  const pAny = prisma as any;
  try {
    const isTLHN = !deptCodeOrId || deptCodeOrId === "TO_TLHN" || deptCodeOrId.toLowerCase().includes("tlhn");

    let where: any = { status: "ACTIVE" };

    if (isTLHN) {
      where.OR = [
        { departmentRel: { code: "TO_TLHN" } },
        { departmentRel: { name: { contains: "TLHN" } } },
        { departmentRel: { name: { contains: "Tâm lý" } } },
        { departmentRel: { name: { contains: "tâm lý" } } },
        { position: { contains: "TLHN" } },
        { positions: { contains: "TLHN" } }
      ];
    } else {
      where.OR = [
        { departmentId: deptCodeOrId },
        { departmentRel: { code: deptCodeOrId } },
        { departmentRel: { name: deptCodeOrId } }
      ];
    }

    const teachers = await pAny.teacher.findMany({
      where,
      include: {
        departmentRel: true,
        user: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      },
      orderBy: [
        { position: "desc" }, // TTCM lên đầu
        { teacherName: "asc" }
      ]
    });

    return teachers.map((t: any) => {
      const isTTCM = t.position === "TTCM" || (t.positions || "").includes("TTCM");
      return {
        teacherId: t.userId || t.id,
        realTeacherId: t.id,
        userId: t.userId,
        teacherName: t.teacherName,
        teacherEmail: t.email || t.user?.email || "",
        teacherPhone: t.phone || "",
        departmentId: t.departmentId,
        departmentName: t.departmentRel?.name || (isTLHN ? "Tổ TLHN" : "Bộ môn"),
        departmentCode: t.departmentRel?.code || (isTLHN ? "TO_TLHN" : ""),
        position: t.position || "GV",
        assignmentRole: isTTCM ? "Tổ trưởng Chuyên môn (TTCM)" : "Giáo viên Tâm lý (GV)"
      };
    });
  } catch (error) {
    console.error("Error fetching department teachers:", error);
    return [];
  }
}

/**
 * Lấy danh sách Giám Đốc Cơ Sở (GĐCS) theo từng cơ sở trường học
 */
export interface CampusDepartmentStaffMember {
  userId?: string;
  teacherId?: string;
  name: string;
  email: string;
  departmentName: string;
  campusCode: string;
}

/**
 * Danh bạ nhân sự chuẩn thuộc Tổ Giáo vụ cơ sở theo từng Cơ sở (CS1–CS5)
 * (Tuyệt đối không dùng alias giả giaovu.csX@skylineschool.edu.vn)
 */
export const CAMPUS_GIAOVU_STAFF_DIRECTORY: Record<"CS1" | "CS2" | "CS3" | "CS4" | "CS5", CampusDepartmentStaffMember[]> = {
  CS1: [
    { name: "Cô Huỳnh Thị Phượng", email: "phuongvt@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS1", campusCode: "CS1" },
    { name: "Cô Đỗ Anh Thư", email: "thuda@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS1", campusCode: "CS1" }
  ],
  CS2: [
    { name: "Cô Đỗ Anh Thư", email: "thuda@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS2", campusCode: "CS2" },
    { name: "Cô Lê Phương Dung", email: "dunglp@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS2", campusCode: "CS2" }
  ],
  CS3: [
    { name: "Cô Đỗ Anh Thư", email: "thuda@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS3", campusCode: "CS3" }
  ],
  CS4: [
    { name: "Cô Tống Thị Bích Trâm", email: "bichtramtt@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS4", campusCode: "CS4" }
  ],
  CS5: [
    { name: "Cô Lê Phương Dung", email: "dunglp@skylineschool.edu.vn", departmentName: "Tổ Giáo vụ CS5", campusCode: "CS5" }
  ]
};

/**
 * Danh bạ nhân sự chuẩn thuộc Tổ Tư vấn cơ sở theo từng Cơ sở (CS1–CS5)
 * (Tuyệt đối không dùng alias giả tuyensinh.csX@skylineschool.edu.vn)
 */
export const CAMPUS_TUVAN_STAFF_DIRECTORY: Record<"CS1" | "CS2" | "CS3" | "CS4" | "CS5", CampusDepartmentStaffMember[]> = {
  CS1: [
    { name: "Cô Trương Thị Ngọc Thương", email: "thuongttn@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS1", campusCode: "CS1" }
  ],
  CS2: [
    { name: "Cô Phạm Thương Hoài", email: "hoaipt@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS2", campusCode: "CS2" },
    { name: "Cô Nguyễn Thị Hồng Dinh", email: "dinhnth@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS2", campusCode: "CS2" },
    { name: "Cô Hà Thị Thi Đoan", email: "doanhtt@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS2", campusCode: "CS2" },
    { name: "Cô Nguyễn Thanh Huyền", email: "huyennt@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS2", campusCode: "CS2" }
  ],
  CS3: [
    { name: "Cô Trương Thị Thu Nga", email: "thungatt@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS3", campusCode: "CS3" },
    { name: "Cô Phan Vũ Yên Hà", email: "hapvy@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS3", campusCode: "CS3" }
  ],
  CS4: [
    { name: "Cô Trần Thị Thu Sen", email: "senttt@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS4", campusCode: "CS4" },
    { name: "Cô Nguyễn Thị Minh Ánh", email: "anhntm@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS4", campusCode: "CS4" }
  ],
  CS5: [
    { name: "Cô Nguyễn Mai Huyền Linh", email: "linhnmh@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS5", campusCode: "CS5" },
    { name: "Cô Trần Thị Xuân Quyên", email: "quyenttx@skylineschool.edu.vn", departmentName: "Tổ Tư vấn CS5", campusCode: "CS5" }
  ]
};

/**
 * Kiểm tra và loại bỏ các hòm thư alias chung không tồn tại (giaovu.csX@..., tuyensinh.csX@...)
 */
export function isGenericCampusAliasEmail(email?: string | null): boolean {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return true;
  return /^(giaovu|tuyensinh|tuvan)\.cs\d+@skylineschool\.edu\.vn$/i.test(e);
}

/**
 * Danh bạ Email nhân sự Tổ Giáo vụ cơ sở theo Cơ sở trường học
 */
export const DEFAULT_GIAOVU_EMAILS: Record<string, string> = {
  CS1: CAMPUS_GIAOVU_STAFF_DIRECTORY.CS1.map(s => s.email).join(", "),
  CS2: CAMPUS_GIAOVU_STAFF_DIRECTORY.CS2.map(s => s.email).join(", "),
  CS3: CAMPUS_GIAOVU_STAFF_DIRECTORY.CS3.map(s => s.email).join(", "),
  CS4: CAMPUS_GIAOVU_STAFF_DIRECTORY.CS4.map(s => s.email).join(", "),
  CS5: CAMPUS_GIAOVU_STAFF_DIRECTORY.CS5.map(s => s.email).join(", ")
};

/**
 * Danh bạ Email nhân sự Tổ Tư vấn cơ sở theo Cơ sở trường học
 */
export const DEFAULT_TUYENSINH_EMAILS: Record<string, string> = {
  CS1: CAMPUS_TUVAN_STAFF_DIRECTORY.CS1.map(s => s.email).join(", "),
  CS2: CAMPUS_TUVAN_STAFF_DIRECTORY.CS2.map(s => s.email).join(", "),
  CS3: CAMPUS_TUVAN_STAFF_DIRECTORY.CS3.map(s => s.email).join(", "),
  CS4: CAMPUS_TUVAN_STAFF_DIRECTORY.CS4.map(s => s.email).join(", "),
  CS5: CAMPUS_TUVAN_STAFF_DIRECTORY.CS5.map(s => s.email).join(", ")
};

/**
 * Chuẩn hóa Mã cơ sở (CS1..CS5) từ chuỗi mã hoặc tên cơ sở
 */
export function normalizeCampusCode(campusCodeOrName?: string): "CS1" | "CS2" | "CS3" | "CS4" | "CS5" {
  const code = String(campusCodeOrName || "").toUpperCase();
  if (code.includes("CS5") || code.includes("HỘI AN") || code.includes("HOI AN") || code.includes("HILL") || code.includes("CƠ SỞ 5")) return "CS5";
  if (code.includes("CS4") || code.includes("BEACH") || code.includes("CƠ SỞ 4")) return "CS4";
  if (code.includes("CS3") || code.includes("INTER") || code.includes("GLOBAL") || code.includes("CƠ SỞ 3")) return "CS3";
  if (code.includes("CS2") || code.includes("CENTRAL") || code.includes("CƠ SỞ 2")) return "CS2";
  return "CS1";
}

/**
 * Trích xuất Email Tổ Giáo vụ cơ sở tương ứng theo mã hoặc tên cơ sở
 */
export function getCampusGiaovuEmail(campusCodeOrName?: string): string {
  const cs = normalizeCampusCode(campusCodeOrName);
  return DEFAULT_GIAOVU_EMAILS[cs] || DEFAULT_GIAOVU_EMAILS.CS1;
}

/**
 * Trích xuất Email Tổ Tư vấn cơ sở tương ứng theo mã hoặc tên cơ sở
 */
export function getCampusTuyensinhEmail(campusCodeOrName?: string): string {
  const cs = normalizeCampusCode(campusCodeOrName);
  return DEFAULT_TUYENSINH_EMAILS[cs] || DEFAULT_TUYENSINH_EMAILS.CS1;
}

/**
 * Truy vấn danh sách nhân sự thực tế trong Tổ Giáo vụ và Tổ Tư vấn cơ sở theo từng cơ sở từ CSDL
 * (kết hợp danh bạ nhân sự chuẩn của Tổ Giáo vụ & Tổ Tư vấn cơ sở, loại bỏ giaovu.csX@... / tuyensinh.csX@...)
 */
export async function getCampusGiaovuAndTuvanStaff(campusCodeOrName?: string, campusId?: string | null) {
  const pAny = prisma as any;
  const csCode = normalizeCampusCode(campusCodeOrName);

  const giaovuMap = new Map<string, CampusDepartmentStaffMember>();
  const tuvanMap = new Map<string, CampusDepartmentStaffMember>();

  const addMember = (targetMap: Map<string, CampusDepartmentStaffMember>, item: CampusDepartmentStaffMember) => {
    const cleanEmail = String(item.email || "")
      .trim()
      .toLowerCase()
      .replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn");
    if (!cleanEmail || !cleanEmail.includes("@") || /^\d+@/.test(cleanEmail) || isGenericCampusAliasEmail(cleanEmail)) {
      return;
    }
    const existing = targetMap.get(cleanEmail);
    if (!existing) {
      targetMap.set(cleanEmail, { ...item, email: cleanEmail });
    } else {
      if (!existing.userId && item.userId) existing.userId = item.userId;
      if (!existing.teacherId && item.teacherId) existing.teacherId = item.teacherId;
      if (item.name && (!existing.name || existing.name.includes("@"))) existing.name = item.name;
    }
  };

  // Khởi tạo từ danh bạ nhân sự Tổ Giáo vụ & Tổ Tư vấn cơ sở chuẩn của trường
  for (const g of CAMPUS_GIAOVU_STAFF_DIRECTORY[csCode] || []) {
    addMember(giaovuMap, g);
  }
  for (const tv of CAMPUS_TUVAN_STAFF_DIRECTORY[csCode] || []) {
    addMember(tuvanMap, tv);
  }

  try {
    // Truy vấn nhân sự đang ACTIVE trong bảng Teacher & User thuộc Tổ Giáo vụ và Tổ Tư vấn theo cơ sở
    const [activeTeachers, campusUsers] = await Promise.all([
      typeof pAny.teacher?.findMany === "function"
        ? pAny.teacher
            .findMany({
              where: { status: "ACTIVE" },
              include: {
                departmentRel: true,
                campus: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    campusAssignments: { include: { campus: true } }
                  }
                }
              }
            })
            .catch(() => [])
        : Promise.resolve([]),
      typeof pAny.user?.findMany === "function"
        ? pAny.user
            .findMany({
              where: {
                status: "ACTIVE",
                role: {
                  in: [
                    "GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS", "giao_vu", "giao_vu_cs",
                    "TVAN", "TU_VAN", "TU_VAN_CS", "TVCS", "TUYEN_SINH", "TVTS", "TU_VAN_TS", "tvan", "tu_van"
                  ]
                }
              },
              include: {
                teacher: { include: { departmentRel: true, campus: true } },
                campusAssignments: { include: { campus: true } }
              }
            })
            .catch(() => [])
        : Promise.resolve([])
    ]);

    const emailToTeacherMap = new Map<string, any>();
    for (const t of activeTeachers || []) {
      const em = String(t.email || t.user?.email || "").trim().toLowerCase();
      if (em && em.includes("@") && !/^\d+@/.test(em)) {
        emailToTeacherMap.set(em, t);
      }
    }

    // Đồng bộ userId/teacherId cho các nhân sự đã có trong danh bạ chuẩn
    for (const [em, member] of giaovuMap.entries()) {
      const matchedT = emailToTeacherMap.get(em);
      if (matchedT) {
        member.teacherId = matchedT.id;
        member.userId = matchedT.userId || matchedT.user?.id || member.userId;
        if (matchedT.teacherName) member.name = matchedT.teacherName;
      }
    }
    for (const [em, member] of tuvanMap.entries()) {
      const matchedT = emailToTeacherMap.get(em);
      if (matchedT) {
        member.teacherId = matchedT.id;
        member.userId = matchedT.userId || matchedT.user?.id || member.userId;
        if (matchedT.teacherName) member.name = matchedT.teacherName;
      }
    }

    const matchesTargetCampus = (tCampusCode?: string, tCampusId?: string, userAssigns?: any[]) => {
      const codes = new Set<string>();
      if (tCampusCode) codes.add(normalizeCampusCode(tCampusCode));
      if (Array.isArray(userAssigns)) {
        for (const ua of userAssigns) {
          if (ua?.campus?.campusCode) codes.add(normalizeCampusCode(ua.campus.campusCode));
          if (campusId && ua?.campusId === campusId) codes.add(csCode);
        }
      }
      if (campusId && tCampusId === campusId) codes.add(csCode);
      return codes.has(csCode);
    };

    for (const t of activeTeachers || []) {
      if (!matchesTargetCampus(t.campus?.campusCode, t.campusId, t.user?.campusAssignments)) continue;
      const deptCode = String(t.departmentRel?.code || "").toUpperCase();
      const deptName = String(t.departmentRel?.name || "").toLowerCase();
      const pos = String(t.position || "").toUpperCase();
      const posList = String(t.positions || "").toUpperCase();
      const uRole = String(t.user?.role || "").toUpperCase();
      const em = String(t.email || (t.user?.email?.includes("@") ? t.user.email : "")).trim();

      const isGiaoVu =
        deptCode.includes("GVU") ||
        deptCode.includes("GIAO_VU") ||
        deptCode.includes("GIAOVU") ||
        deptName.includes("giáo vụ") ||
        ["GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS"].includes(uRole) ||
        ["GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS"].includes(pos) ||
        posList.includes("GIAO_VU");

      const isTuVan =
        deptCode.includes("TVAN") ||
        deptCode.includes("TUVAN") ||
        deptCode.includes("TVTS") ||
        deptCode.includes("TUYENSINH") ||
        deptName.includes("tư vấn") ||
        deptName.includes("tuyển sinh") ||
        ["TVAN", "TU_VAN", "TU_VAN_CS", "TVCS", "TUYEN_SINH", "TVTS", "TU_VAN_TS"].includes(uRole) ||
        ["TVAN", "TU_VAN", "TVTS"].includes(pos) ||
        posList.includes("TU_VAN") ||
        posList.includes("TVTS");

      if (isGiaoVu) {
        addMember(giaovuMap, {
          userId: t.userId || t.user?.id,
          teacherId: t.id,
          name: t.teacherName || t.user?.fullName || `Giáo vụ ${csCode}`,
          email: em,
          departmentName: t.departmentRel?.name || `Tổ Giáo vụ ${csCode}`,
          campusCode: csCode
        });
      }
      if (isTuVan) {
        addMember(tuvanMap, {
          userId: t.userId || t.user?.id,
          teacherId: t.id,
          name: t.teacherName || t.user?.fullName || `Tư vấn ${csCode}`,
          email: em,
          departmentName: t.departmentRel?.name || `Tổ Tư vấn ${csCode}`,
          campusCode: csCode
        });
      }
    }

    for (const u of campusUsers || []) {
      if (!matchesTargetCampus(u.teacher?.campus?.campusCode, u.teacher?.campusId, u.campusAssignments)) continue;
      const uRole = String(u.role || "").toUpperCase();
      const em = String(u.teacher?.email || u.email || "").trim();
      if (!em.includes("@") || /^\d+@/.test(em)) continue;

      if (["GIAO_VU", "GIAO_VU_CS", "GVU", "GVCS"].includes(uRole)) {
        addMember(giaovuMap, {
          userId: u.id,
          teacherId: u.teacher?.id,
          name: u.fullName || u.teacher?.teacherName || `Giáo vụ ${csCode}`,
          email: em,
          departmentName: u.teacher?.departmentRel?.name || `Tổ Giáo vụ ${csCode}`,
          campusCode: csCode
        });
      } else if (["TVAN", "TU_VAN", "TU_VAN_CS", "TVCS", "TUYEN_SINH", "TVTS", "TU_VAN_TS"].includes(uRole)) {
        addMember(tuvanMap, {
          userId: u.id,
          teacherId: u.teacher?.id,
          name: u.fullName || u.teacher?.teacherName || `Tư vấn ${csCode}`,
          email: em,
          departmentName: u.teacher?.departmentRel?.name || `Tổ Tư vấn ${csCode}`,
          campusCode: csCode
        });
      }
    }
  } catch (err) {
    console.warn("getCampusGiaovuAndTuvanStaff warning:", err);
  }

  const giaovuStaff = Array.from(giaovuMap.values());
  const tuvanStaff = Array.from(tuvanMap.values());
  const giaovuEmail = giaovuStaff.map(s => s.email).join(", ");
  const tuyensinhEmail = tuvanStaff.map(s => s.email).join(", ");
  const allStaffUserIds = Array.from(
    new Set(
      [...giaovuStaff.map(s => s.userId), ...tuvanStaff.map(s => s.userId)].filter((id): id is string => Boolean(id))
    )
  );

  return {
    campusCode: csCode,
    giaovuStaff,
    tuvanStaff,
    giaovuEmail,
    tuyensinhEmail,
    allStaffUserIds
  };
}

export async function getGdcsCampusList() {
  const pAny = prisma as any;
  try {
    const campuses = await pAny.campus.findMany({
      include: {
        manager: {
          include: { teacher: true }
        },
        userAssignments: {
          include: { user: { include: { teacher: true } } }
        }
      },
      orderBy: { campusCode: "asc" }
    });

    const defaultEmails: Record<string, string> = {
      CS1: "longtt@skylineschool.edu.vn",
      CS2: "khanhpt@skylineschool.edu.vn",
      CS3: "thanhtt@skylineschool.edu.vn",
      CS4: "trungct@skylineschool.edu.vn",
      CS5: "trungdq1@skylineschool.edu.vn"
    };

    const defaultNames: Record<string, string> = {
      CS1: "Thầy Tống Thiên Long",
      CS2: "Cô Phạm Thị Khánh",
      CS3: "Cô Trần Thị Thanh",
      CS4: "Thầy Cao Thanh Trung",
      CS5: "Thầy Đỗ Quang Trung"
    };

    const gdcsList: Array<{
      campusId: string;
      campusCode: string;
      campusName: string;
      managerUserId?: string;
      managerName: string;
      managerEmail: string;
      giaovuEmail: string;
      tuyensinhEmail: string;
      giaovuStaff: CampusDepartmentStaffMember[];
      tuvanStaff: CampusDepartmentStaffMember[];
      roleTitle: string;
    }> = [];

    for (const c of campuses) {
      const code = normalizeCampusCode(c.campusCode || c.campusName);
      let mName = c.manager?.fullName || c.manager?.teacher?.teacherName || defaultNames[code] || `Giám đốc Cơ sở ${c.campusName}`;
      const rawMgrEmail = c.manager?.teacher?.email || c.manager?.email || "";
      let mEmail = rawMgrEmail.includes("@") && !/^\d+@/.test(rawMgrEmail)
        ? rawMgrEmail
        : (defaultEmails[code] || "");
      if (!mEmail.includes("@")) {
        mEmail = defaultEmails[code] || "longtt@skylineschool.edu.vn";
      }

      const staffInfo = await getCampusGiaovuAndTuvanStaff(code, c.id);

      gdcsList.push({
        campusId: c.id,
        campusCode: c.campusCode || code,
        campusName: c.campusName,
        managerUserId: c.managerId || c.manager?.id || undefined,
        managerName: mName,
        managerEmail: mEmail,
        giaovuEmail: staffInfo.giaovuEmail,
        tuyensinhEmail: staffInfo.tuyensinhEmail,
        giaovuStaff: staffInfo.giaovuStaff,
        tuvanStaff: staffInfo.tuvanStaff,
        roleTitle: `Giám đốc Cơ sở ${c.campusCode} (${c.campusName})`
      });
    }

    return gdcsList;
  } catch (error) {
    console.error("Error fetching GDCS list:", error);
    return (["CS1", "CS2", "CS3", "CS4", "CS5"] as const).map((code, idx) => {
      const names: Record<string, string> = {
        CS1: "Thầy Tống Thiên Long",
        CS2: "Cô Phạm Thị Khánh",
        CS3: "Cô Trần Thị Thanh",
        CS4: "Thầy Cao Thanh Trung",
        CS5: "Thầy Đỗ Quang Trung"
      };
      const emails: Record<string, string> = {
        CS1: "longtt@skylineschool.edu.vn",
        CS2: "khanhpt@skylineschool.edu.vn",
        CS3: "thanhtt@skylineschool.edu.vn",
        CS4: "trungct@skylineschool.edu.vn",
        CS5: "trungdq1@skylineschool.edu.vn"
      };
      const campusNames: Record<string, string> = {
        CS1: "Sky-Line Riverside (CS1)",
        CS2: "Sky-Line Central (CS2)",
        CS3: "Sky-Line International (CS3)",
        CS4: "Sky-Line Beach (CS4)",
        CS5: "Sky-Line Hill (CS5)"
      };
      return {
        campusId: `cs${idx + 1}`,
        campusCode: code,
        campusName: campusNames[code],
        managerName: names[code],
        managerEmail: emails[code],
        giaovuEmail: DEFAULT_GIAOVU_EMAILS[code],
        tuyensinhEmail: DEFAULT_TUYENSINH_EMAILS[code],
        giaovuStaff: CAMPUS_GIAOVU_STAFF_DIRECTORY[code],
        tuvanStaff: CAMPUS_TUVAN_STAFF_DIRECTORY[code],
        roleTitle: `Giám đốc Cơ sở ${code}`
      };
    });
  }
}

/**
 * Tổng hợp danh sách CC chuẩn khi gửi báo cáo Tâm lý cho GĐCS:
 * Bắt buộc CC đúng nhân sự Tổ Giáo vụ cơ sở + Tổ Tư vấn cơ sở (+ Ban KT&ĐBCL),
 * loại bỏ hoàn toàn các hòm thư alias giả giaovu.csX@skylineschool.edu.vn / tuyensinh.csX@skylineschool.edu.vn
 */
export function buildPsychologyGdcsCcList(params: {
  campusCodeOrName?: string;
  giaovuEmail?: string;
  tuyensinhEmail?: string;
  extraCc?: Array<string | null | undefined>;
}): string[] {
  const { campusCodeOrName, giaovuEmail, tuyensinhEmail, extraCc = [] } = params;
  const cleanCustomList = (raw?: string) =>
    String(raw || "")
      .split(/[,;]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes("@") && !e.includes(" ") && !isGenericCampusAliasEmail(e));

  const customGiaovu = cleanCustomList(giaovuEmail);
  const customTuyensinh = cleanCustomList(tuyensinhEmail);

  const resolvedGiaovu = customGiaovu.length > 0
    ? customGiaovu
    : cleanCustomList(getCampusGiaovuEmail(campusCodeOrName));
  const resolvedTuyensinh = customTuyensinh.length > 0
    ? customTuyensinh
    : cleanCustomList(getCampusTuyensinhEmail(campusCodeOrName));

  const rawList = [
    ...resolvedGiaovu,
    ...resolvedTuyensinh,
    "ktdbcl@skylineschool.edu.vn",
    ...extraCc
  ];

  const emails = rawList
    .flatMap((item) => String(item || "").split(/[,;]/))
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e.includes("@") && !e.includes(" ") && !isGenericCampusAliasEmail(e));

  return Array.from(new Set(emails));
}

/**
 * Kiểm tra trường hợp TỔNG HỢP học sinh có dấu hiệu Tâm lý cần báo cáo GĐCS:
 * Thang đo 20 câu (0–80 điểm):
 * - 0–15 điểm: Bình thường (Không có dấu hiệu tâm lý)
 * - > 15 điểm (16–80 điểm: Dấu hiệu nhẹ / vừa / nguy cơ cao / rất cao) hoặc được đánh dấu thủ công: Có dấu hiệu Tâm lý
 */
export function hasPsychologicalSignsForGdcs(totalScore: number, manualFlag = false): boolean {
  if (manualFlag) return true;
  const numScore = Number(totalScore);
  return !isNaN(numScore) && numScore > 15;
}

/**
 * Lấy danh sách toàn bộ Giáo viên đã được phân công chấm điểm hoặc khảo sát học sinh này
 * (bao gồm GV các môn Tiếng Anh, Toán, Ngữ Văn, Tâm lý, Mầm non...)
 */
export async function getStudentAssignedSurveyTeachers(studentId: string) {
  const pAny = prisma as any;
  try {
    const student = await pAny.inputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        studentCode: true,
        grade: true,
        periodId: true,
        batchId: true,
        admissionCampus: true,
        registeredCampus: true,
        scores: {
          include: {
            subject: true
          }
        }
      }
    });

    if (!student) return [];

    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const teacherMap = new Map<string, any>();

    // 1. Từ StudentAssessmentScore (những GV đã trực tiếp chấm điểm các môn cho HS)
    if (Array.isArray(student.scores)) {
      for (const sc of student.scores) {
        if (!sc.teacherName && !sc.teacherId) continue;
        const key = sc.teacherId || sc.teacherName;
        const subjName = sc.subject?.name || "Môn khảo sát";
        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            teacherId: sc.teacherId || "",
            teacherName: sc.teacherName,
            email: "",
            phone: "",
            subjects: [subjName],
            isDirectScorer: true,
            source: "Đã chấm điểm"
          });
        } else {
          const item = teacherMap.get(key);
          if (!item.subjects.includes(subjName)) {
            item.subjects.push(subjName);
          }
        }
      }
    }

    // 2. Từ InputAssessmentTeacherAssignment (phân công khảo sát kỳ/đợt/khối)
    if (student.periodId) {
      const assignments = await pAny.inputAssessmentTeacherAssignment.findMany({
        where: {
          periodId: student.periodId,
          ...(student.batchId ? { OR: [{ batchId: student.batchId }, { batchId: null }] } : {})
        },
        include: {
          user: {
            include: {
              teacher: true
            }
          },
          subject: true
        }
      });

      for (const a of assignments) {
        if (!a.user) continue;
        const aGrade = String(a.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
        const gradeMatch = !aGrade || aGrade === "tất cả" || aGrade === rawGrade;
        if (!gradeMatch) continue;

        const uId = a.user.id;
        const uName = a.user.fullName || a.user.name || a.user.teacher?.teacherName || "Giáo viên";
        const uEmail = a.user.teacher?.email || a.user.email || "";
        const uPhone = a.user.teacher?.phone || "";
        const subjName = a.subject?.name || "Khảo sát đầu vào";

        let foundKey = "";
        for (const [k, v] of teacherMap.entries()) {
          if (v.teacherId === uId || v.teacherName === uName) {
            foundKey = k;
            break;
          }
        }

        if (foundKey) {
          const item = teacherMap.get(foundKey);
          if (uId && !item.teacherId) item.teacherId = uId;
          if (uEmail && !item.email) item.email = uEmail;
          if (uPhone && !item.phone) item.phone = uPhone;
          if (!item.subjects.includes(subjName)) item.subjects.push(subjName);
        } else {
          teacherMap.set(uId, {
            teacherId: uId,
            teacherName: uName,
            email: uEmail,
            phone: uPhone,
            subjects: [subjName],
            isDirectScorer: false,
            source: "Phân công khảo sát"
          });
        }
      }
    }

    // Lookup missing emails/phones from User & Teacher table for existing keys
    for (const [, v] of teacherMap.entries()) {
      if (!v.email && (v.teacherId || v.teacherName)) {
        try {
          const u = await pAny.user.findFirst({
            where: {
              OR: [
                ...(v.teacherId ? [{ id: v.teacherId }] : []),
                { fullName: v.teacherName }
              ]
            },
            include: { teacher: true }
          });
          if (u) {
            v.email = u.teacher?.email || u.email || "";
            v.phone = u.teacher?.phone || "";
            if (!v.teacherId) v.teacherId = u.id;
          }
        } catch (e) {}
      }
    }

    return Array.from(teacherMap.values()).map(t => ({
      ...t,
      subjectLabel: t.subjects.join(", ")
    }));
  } catch (error) {
    console.error("Error in getStudentAssignedSurveyTeachers:", error);
    return [];
  }
}




