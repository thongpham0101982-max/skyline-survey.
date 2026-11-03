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
            period: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                name: true,
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
export async function upsertStudentOrientationRecord(data: StudentOrientationData) {
  const pAny = prisma as any;
  const { studentId, ...rest } = data;

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
            ...rest,
            updatedAt: now
          }
        });
      } catch (prismaUpdateErr) {
        // Fallback update trực tiếp bằng SQL an toàn
        const updates: string[] = ['"updatedAt" = ?'];
        const params: any[] = [now.toISOString()];

        for (const [k, v] of Object.entries(rest)) {
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
            ...rest
          }
        });
      } catch (prismaCreateErr) {
        // Fallback insert trực tiếp bằng SQL an toàn
        const id = "sor_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        const cols: string[] = ['"id"', '"studentId"', '"createdAt"', '"updatedAt"'];
        const placeholders: string[] = ["?", "?", "?", "?"];
        const params: any[] = [id, studentId, now.toISOString(), now.toISOString()];

        for (const [k, v] of Object.entries(rest)) {
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

    // Filter by grade if possible, or fallback to all psychology teachers in the period
    const matched = assignments.filter((a: any) => {
      if (!a.grade) return true;
      const aGrade = String(a.grade).toLowerCase().replace("khối", "").replace("khoi", "").trim();
      return aGrade === rawGrade;
    });

    const targetList = matched.length > 0 ? matched : assignments;

    // Deduplicate by user
    const userMap = new Map();
    targetList.forEach((a: any) => {
      if (a.user && !userMap.has(a.user.id)) {
        userMap.set(a.user.id, {
          userId: a.user.id,
          fullName: a.user.fullName || a.user.name,
          email: a.user.teacher?.email || a.user.email,
          phone: a.user.teacher?.phone || a.user.phone,
          grade: a.grade,
          subjectName: a.subject?.name
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
export async function getGdcsCampusList() {
  const pAny = prisma as any;
  try {
    const campuses = await pAny.campus.findMany({
      include: {
        manager: true,
        userAssignments: {
          include: { user: true }
        }
      },
      orderBy: { campusCode: "asc" }
    });

    const defaultEmails: Record<string, string> = {
      CS1: "longtt@skylineschool.edu.vn",
      CS2: "khanhpt@skylineschool.edu.vn",
      CS3: "thanhtt@skylineschool.edu.vn",
      CS4: "trungct@skylineschool.edu.vn",
      CS5: "trungdq@skylineschool.edu.vn"
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
      managerName: string;
      managerEmail: string;
      roleTitle: string;
    }> = [];

    campuses.forEach((c: any) => {
      let mName = c.manager?.fullName || defaultNames[c.campusCode] || `Giám đốc Cơ sở ${c.campusName}`;
      let mEmail = c.manager?.email || defaultEmails[c.campusCode] || "";
      if (!mEmail.includes("@")) {
        mEmail = defaultEmails[c.campusCode] || (mEmail ? `${mEmail}@skylineschool.edu.vn` : "");
      }

      gdcsList.push({
        campusId: c.id,
        campusCode: c.campusCode,
        campusName: c.campusName,
        managerName: mName,
        managerEmail: mEmail,
        roleTitle: `Giám đốc Cơ sở ${c.campusCode} (${c.campusName})`
      });
    });

    return gdcsList;
  } catch (error) {
    console.error("Error fetching GDCS list:", error);
    return [
      { campusId: "cs1", campusCode: "CS1", campusName: "Sky-Line Riverside (CS1)", managerName: "Thầy Tống Thiên Long", managerEmail: "longtt@skylineschool.edu.vn", roleTitle: "Giám đốc Cơ sở CS1" },
      { campusId: "cs2", campusCode: "CS2", campusName: "Sky-Line Central (CS2)", managerName: "Cô Phạm Thị Khánh", managerEmail: "khanhpt@skylineschool.edu.vn", roleTitle: "Giám đốc Cơ sở CS2" },
      { campusId: "cs3", campusCode: "CS3", campusName: "Sky-Line International (CS3)", managerName: "Cô Trần Thị Thanh", managerEmail: "thanhtt@skylineschool.edu.vn", roleTitle: "Giám đốc Cơ sở CS3" },
      { campusId: "cs4", campusCode: "CS4", campusName: "Sky-Line Beach (CS4)", managerName: "Thầy Cao Thanh Trung", managerEmail: "trungct@skylineschool.edu.vn", roleTitle: "Giám đốc Cơ sở CS4" },
      { campusId: "cs5", campusCode: "CS5", campusName: "Sky-Line Hill (CS5)", managerName: "Thầy Đỗ Quang Trung", managerEmail: "trungdq@skylineschool.edu.vn", roleTitle: "Giám đốc Cơ sở CS5" }
    ];
  }
}



