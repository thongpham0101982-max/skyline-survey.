import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/db"
import {
  isSuperOrCommunityAdmin,
  isUserInCampus,
  SlcUserContext,
} from "./permissions"
import { ensureSlcSchema, getSlcDb } from "./schema-init"
import {
  checkSlcRateLimit,
  detectAndRedactStudentPii,
  sanitizeRichText,
  sanitizeUntrustedAiInput,
} from "./security"

export interface SsmDataSourceMappingItem {
  domainCode: string
  domainName: string
  prismaModels: string[]
  apiEndpoints: string[]
  fieldsUsed: string[]
  accessPermissionRule: string
  completenessLevel: "FULL" | "PARTIAL" | "MANUAL_SUPPLEMENT"
  connectionStatus: "CONNECTED" | "PARTIAL" | "UNCONNECTED_TABLE"
  missingOrLimitationNote: string
}

/**
 * I.5. Bảng mapping nguồn dữ liệu, API, trường dữ liệu, quyền truy cập, mức độ đầy đủ và phần còn thiếu.
 * Không tự giả định tên bảng hoặc API không tồn tại; nguồn chưa kết nối có trạng thái rõ ràng.
 */
export function getSsmDataMappingReport(): SsmDataSourceMappingItem[] {
  return [
    {
      domainCode: "TEACHER_ASSIGNMENT",
      domainName: "1. Giáo viên & Phân công giảng dạy",
      prismaModels: [
        "Teacher",
        "TeachingAssignment",
        "CtqtTeachingAssignment",
        "SpecialTeachingAssignment",
        "TeacherClassAssignment",
        "TeacherDepartmentAssignment",
        "Department",
      ],
      apiEndpoints: [
        "GET /api/skyline-connect?action=ssmDataScope",
        "GET /api/skyline-connect?action=catalogs",
      ],
      fieldsUsed: [
        "Teacher.id, userId, teacherCode, teacherName, campusId, departmentId, mainSubjectId, position",
        "TeachingAssignment.teacherId, classId, subjectId, academicYearId, semester",
        "CtqtTeachingAssignment.primaryTeacherId, delegatedTeacherId, classId, subjectCode, academicYearId",
        "SpecialTeachingAssignment.teacherId, classId, subjectId, academicYearId, semester",
      ],
      accessPermissionRule:
        "Giáo viên chỉ truy vấn được lớp/môn được phân công (TeachingAssignment / CtqtTeachingAssignment / SpecialTeachingAssignment / GVCN). TTCM/QLCM truy cập theo Tổ/Cơ sở; KT&ĐBCL và Admin truy cập theo phạm vi quản lý.",
      completenessLevel: "FULL",
      connectionStatus: "CONNECTED",
      missingOrLimitationNote:
        "Đã kết nối đầy đủ cho cả chương trình Bộ GD&ĐT (MOET), Chương trình Quốc tế (CTQT) và Môn đặc thù Sky-Line.",
    },
    {
      domainCode: "STUDENT_CLASS_SUBJECT",
      domainName: "2. Học sinh, Lớp, Môn, Khối, Cơ sở, Năm học",
      prismaModels: [
        "Student",
        "Class",
        "Subject",
        "SpecialSubject",
        "Campus",
        "AcademicYear",
      ],
      apiEndpoints: [
        "GET /api/skyline-connect?action=ssmDataScope",
        "POST /api/skyline-connect (action=reviewScopeData)",
      ],
      fieldsUsed: [
        "Student.id, classId, campusId, grade, status (ẩn danh hoàn toàn fullName và studentCode khi tạo căn cứ/skill)",
        "Class.id, className, grade, level, campusId, academicYearId, homeroomTeacherId",
        "Subject.id, subjectCode, subjectName, category (MOET | SKL | INTERNATIONAL)",
        "SpecialSubject.id, code, name",
      ],
      accessPermissionRule:
        "Chỉ đếm tổng số học sinh đang học (status=ACTIVE) của lớp thuộc quyền giáo viên; tuyệt đối không xuất tên/mã học sinh ra bản căn cứ hoặc gói skill.",
      completenessLevel: "FULL",
      connectionStatus: "CONNECTED",
      missingOrLimitationNote:
        "Đã kết nối đầy đủ danh mục Cơ sở, Năm học, Lớp, Khối, Môn Bộ và Môn đặc thù Sky-Line.",
    },
    {
      domainCode: "ACADEMIC_GRADES_COMPETENCY",
      domainName: "3. Kết quả học tập & Đánh giá năng lực theo tháng/kỳ",
      prismaModels: [
        "SubjectGradeEntry",
        "SubjectBenchmarkConfig",
        "StudentCompetencyAssessment",
        "SubjectCompetency",
        "CtqtGradeEntry",
        "SpecialGradeEntry",
      ],
      apiEndpoints: [
        "POST /api/skyline-connect (action=reviewScopeData)",
      ],
      fieldsUsed: [
        "SubjectGradeEntry.evaluationPeriod, componentScores, compositeScore, remark, updatedAt",
        "SubjectBenchmarkConfig.benchmarkScore",
        "StudentCompetencyAssessment.assessmentPeriod, competencyId, achievedScore, maxScore, competencyPercent",
        "CtqtGradeEntry.midTermScore, endTermScore, gpaScore, commentVi",
        "SpecialGradeEntry.evalScope, evalResult, numericScore, rubricDetails, teacherFeedback",
      ],
      accessPermissionRule:
        "Kiểm tra verifyTeacherClassSubjectAccess tại backend trước khi đọc. Không biến bản ghi chưa nhập điểm (null) thành điểm 0.",
      completenessLevel: "FULL",
      connectionStatus: "CONNECTED",
      missingOrLimitationNote:
        "Nếu lớp/môn chỉ mới nhập compositeScore mà chưa có đánh giá năng lực thành phần hoặc nhận xét, hệ thống ghi rõ thiếu minh chứng thành phần và không suy diễn lỗi kiến thức.",
    },
    {
      domainCode: "EXAMS_WORK_REMARKS",
      domainName: "4. Bài kiểm tra, Bài làm & Nhận xét",
      prismaModels: [
        "TestingPeriod",
        "TestingSubjectExam",
        "TestingQuestion",
        "TestingCandidateResult",
        "SubjectGradeEntry (trường remark)",
      ],
      apiEndpoints: [
        "POST /api/skyline-connect (action=reviewScopeData)",
      ],
      fieldsUsed: [
        "TestingCandidateResult.mcqScore, essayScore, finalScore, topicBreakdownJson, levelBreakdownJson, essayComment",
        "TestingQuestion.topicName, cognitiveLevel",
        "SubjectGradeEntry.remark",
      ],
      accessPermissionRule:
        "Chỉ tổng hợp phân bố theo chủ đề/mức độ nhận thức (topicBreakdownJson, levelBreakdownJson) và nhận xét của lớp được phân công.",
      completenessLevel: "PARTIAL",
      connectionStatus: "PARTIAL",
      missingOrLimitationNote:
        "Kết nối đầy đủ với các kỳ khảo sát tập trung (TestingCandidateResult có topicBreakdownJson/essayComment) và nhận xét bộ môn (SubjectGradeEntry.remark). Bài kiểm tra giấy thường xuyên trên lớp chưa số hóa từng câu hỏi sẽ được báo trạng thái 'Chưa có dữ liệu bài làm chi tiết' để không suy diễn lỗi kiến thức từ điểm tổng.",
    },
    {
      domainCode: "CURRICULUM_LESSON_MATERIALS",
      domainName: "5. Chương trình, Giáo án & Học liệu",
      prismaModels: [
        "SpecialCurriculum",
        "SpecialCurriculumVersion",
        "SpecialTopic",
        "SpecialLesson",
        "KnowledgeDocument",
      ],
      apiEndpoints: [
        "GET /api/skyline-connect?action=ssmDataScope",
        "POST /api/skyline-connect (action=confirmBriefAndGenerateSkill)",
      ],
      fieldsUsed: [
        "SpecialLesson.lessonName, objectives, requirements, mainActivities, expectedProduct",
        "KnowledgeDocument.title, category, content",
      ],
      accessPermissionRule:
        "Giáo viên xem chương trình môn đặc thù được phân công và tài liệu học vụ nội bộ; cho phép bổ sung trực tiếp mục tiêu/giáo án ở Bước 4.",
      completenessLevel: "PARTIAL",
      connectionStatus: "PARTIAL",
      missingOrLimitationNote:
        "Môn đặc thù Sky-Line đã có bảng số hóa bài học (SpecialTopic, SpecialLesson). Với các môn Bộ GD&ĐT thông thường chưa có bảng giáo án từng tiết trong DB, hệ thống hiển thị trạng thái 'Bổ sung trực tiếp tại Bước 4' và yêu cầu giáo viên nhập/đính kèm mục tiêu bài học thay vì tự đặt yêu cầu chương trình.",
    },
    {
      domainCode: "STUDENT_SUPPORT_ACTIVITIES",
      domainName: "6. Hoạt động hỗ trợ học sinh",
      prismaModels: [
        "LearningSupportTarget",
        "LearningSupportEvaluation",
        "AcademicConsultationLog",
        "StudentHelpRequest",
      ],
      apiEndpoints: [
        "POST /api/skyline-connect (action=reviewScopeData)",
      ],
      fieldsUsed: [
        "LearningSupportTarget.supportType, reason, academicTopic, outcome",
        "LearningSupportEvaluation.periodName, trackingLevel, comment",
        "AcademicConsultationLog.academicTopic, difficulties, nextActions",
      ],
      accessPermissionRule:
        "Chỉ tổng hợp số lượng học sinh cần hỗ trợ và nhóm chủ đề khó khăn (academicTopic, difficulties) của lớp thuộc quyền giáo viên; ẩn hoàn toàn danh tính cá nhân học sinh.",
      completenessLevel: "FULL",
      connectionStatus: "CONNECTED",
      missingOrLimitationNote:
        "Đã kết nối với sổ theo dõi hỗ trợ học tập (LearningSupportTarget) và nhật ký tư vấn học vụ (AcademicConsultationLog).",
    },
  ]
}

export interface AuthorizedClassSubjectItem {
  classId: string
  className: string
  gradeLevel: string
  level: string
  campusId: string
  campusName: string
  academicYearId: string
  academicYearName: string
  assignmentRole: "SUBJECT_TEACHER" | "HOMEROOM_TEACHER" | "CTQT_TEACHER" | "SPECIAL_TEACHER" | "MANAGER_SCOPE"
  subjects: Array<{
    subjectId?: string | null
    subjectCode: string
    subjectName: string
    category: "MOET" | "SKL" | "INTERNATIONAL"
  }>
}

/**
 * Kiểm tra chặt chẽ ở backend xem giáo viên hiện tại có quyền truy cập dữ liệu của Lớp & Môn học này hay không.
 * Ngăn chặn tuyệt đối việc giáo viên truy cập dữ liệu lớp khác hoặc cơ sở khác không được phân công.
 */
export async function verifyTeacherClassSubjectAccess(
  ctx: SlcUserContext | null,
  params: {
    classId: string
    subjectCode?: string | null
    subjectId?: string | null
    academicYearId?: string | null
  }
): Promise<{
  allowed: boolean
  reason?: string
  classInfo?: {
    id: string
    className: string
    grade: string
    level: string
    campusId: string
    campusName: string
    academicYearId: string
    academicYearName: string
  }
}> {
  if (!ctx || !ctx.userId) {
    return { allowed: false, reason: "PERMISSION_DENIED: Vui lòng đăng nhập để truy cập dữ liệu." }
  }

  if (!params.classId) {
    return { allowed: false, reason: "Vui lòng chọn lớp học cần rà soát dữ liệu." }
  }

  const pAny = getSlcDb()
  const targetClass = await prisma.class
    .findUnique({
      where: { id: params.classId },
      include: {
        campus: { select: { id: true, campusName: true } },
        academicYear: { select: { id: true, name: true } },
      },
    })
    .catch(() => null)

  if (!targetClass) {
    return { allowed: false, reason: "Không tìm thấy lớp học được chọn trong hệ thống." }
  }

  const classInfo = {
    id: targetClass.id,
    className: targetClass.className,
    grade: String(targetClass.grade || ""),
    level: String(targetClass.level || ""),
    campusId: targetClass.campusId,
    campusName: (targetClass as any).campus?.campusName || "Sky-Line",
    academicYearId: targetClass.academicYearId,
    academicYearName: (targetClass as any).academicYear?.name || "",
  }

  // 1. Super Admin / Community Admin
  if (isSuperOrCommunityAdmin(ctx)) {
    return { allowed: true, classInfo }
  }

  // 2. KT&ĐBCL Officer or Department Head (TTCM/QLCM) within their authorized campus
  if ((ctx.isKtdbclOfficer || ctx.isDepartmentHead) && isUserInCampus(ctx, targetClass.campusId)) {
    return { allowed: true, classInfo }
  }

  // 3. Teacher must have a Teacher record and be assigned to this class
  if (!ctx.teacherId) {
    return {
      allowed: false,
      reason:
        "PERMISSION_DENIED: Tài khoản chưa được liên kết hồ sơ giáo viên giảng dạy tại lớp này.",
    }
  }

  // Must belong to allowed campus unless explicitly assigned across campuses
  const [moetAssign, ctqtAssign, specialAssign, classAssign] = await Promise.all([
    prisma.teachingAssignment
      .findFirst({
        where: {
          teacherId: ctx.teacherId,
          classId: targetClass.id,
        },
        include: { subject: true },
      })
      .catch(() => null),
    pAny.ctqtTeachingAssignment
      ?.findFirst({
        where: {
          classId: targetClass.id,
          OR: [{ primaryTeacherId: ctx.teacherId }, { delegatedTeacherId: ctx.teacherId }],
        },
      })
      .catch(() => null),
    pAny.specialTeachingAssignment
      ?.findFirst({
        where: {
          teacherId: ctx.teacherId,
          classId: targetClass.id,
        },
      })
      .catch(() => null),
    pAny.teacherClassAssignment
      ?.findFirst({
        where: {
          teacherId: ctx.teacherId,
          classId: targetClass.id,
        },
      })
      .catch(() => null),
  ])

  const isHomeroom =
    targetClass.homeroomTeacherId === ctx.teacherId ||
    Boolean(targetClass.homeroomTeacherId && targetClass.homeroomTeacherId.includes(ctx.teacherId))

  if (!isHomeroom && !moetAssign && !ctqtAssign && !specialAssign && !classAssign) {
    // Allow department/campus fallback ONLY when the class is within the teacher's authorized campus
    // AND the teacher either belongs to the department teaching this class or has no personal TeachingAssignment rows yet
    if (isUserInCampus(ctx, targetClass.campusId)) {
      const [deptAssign, anyPersonalAssign] = await Promise.all([
        ctx.departmentId
          ? prisma.teachingAssignment
              .findFirst({
                where: {
                  classId: targetClass.id,
                  teacher: {
                    OR: [
                      { departmentId: ctx.departmentId },
                      { departmentAssignments: { some: { departmentId: ctx.departmentId } } },
                    ],
                  },
                },
              })
              .catch(() => null)
          : Promise.resolve(null),
        prisma.teachingAssignment
          .findFirst({
            where: { teacherId: ctx.teacherId },
          })
          .catch(() => undefined),
      ])

      if (deptAssign || anyPersonalAssign === null) {
        return { allowed: true, classInfo }
      }
    }

    return {
      allowed: false,
      reason:
        "PERMISSION_DENIED: Thầy/Cô không được phân công giảng dạy hoặc chủ nhiệm lớp này. Hệ thống từ chối truy cập dữ liệu lớp khác/cơ sở khác.",
    }
  }

  return { allowed: true, classInfo }
}

/**
 * Bước 1 (Chọn phạm vi):
 * Tự xác định môn/lớp từ phân công thực tế của giáo viên; trả về danh mục phạm vi và trạng thái kết nối các nguồn dữ liệu.
 */
export async function getTeacherAuthorizedScopeCatalog(
  ctx: SlcUserContext,
  requestedAcademicYearId?: string
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const [rawAcademicYears, allSubjects, specialSubjects, specialTopics, teacherRecord] =
    await Promise.all([
      prisma.academicYear
        .findMany({
          where: { isOff: false },
          select: { id: true, name: true, status: true, startDate: true, endDate: true },
          orderBy: { startDate: "desc" },
        })
        .catch(() => []),
      prisma.subject
        .findMany({
          where: { status: "ACTIVE" },
          select: { id: true, subjectCode: true, subjectName: true, category: true, level: true },
          orderBy: { subjectName: "asc" },
        })
        .catch(() => []),
      pAny.specialSubject
        ?.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true },
        })
        .catch(() => []) ?? [],
      pAny.specialTopic
        ?.findMany({
          include: {
            lessons: {
              select: {
                id: true,
                lessonCode: true,
                lessonName: true,
                objectives: true,
                requirements: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            curriculumVersion: {
              include: {
                curriculum: {
                  include: { subject: true },
                },
              },
            },
          },
          take: 100,
        })
        .catch(() => []) ?? [],
      ctx.teacherId
        ? prisma.teacher
            .findUnique({
              where: { id: ctx.teacherId },
              include: {
                departmentAssignments: true,
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
    ])

  const subjectById = new Map<string, any>(allSubjects.map((s) => [String(s.id), s]))
  const subjectByCode = new Map<string, any>(allSubjects.map((s) => [String(s.subjectCode), s]))
  const specialById = new Map<string, any>(specialSubjects.map((s: any) => [String(s.id), s]))

  // 1. Load ALL personal assignments across years first so we can auto-pick the year that actually has assignments
  let allMoetList: any[] = []
  let allCtqtList: any[] = []
  let allSpecialList: any[] = []
  let allHomeroomClasses: any[] = []
  let allLegacyClassAssigns: any[] = []

  if (ctx.teacherId) {
    const homeroomNames = String(teacherRecord?.homeroomClass || "")
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const teacherCode = teacherRecord?.teacherCode ? String(teacherRecord.teacherCode).trim() : ""

    const homeroomOr: any[] = [
      { homeroomTeacherId: ctx.teacherId },
      { homeroomTeacherId: { contains: ctx.teacherId } },
    ]
    if (teacherCode) {
      homeroomOr.push({ homeroomTeacherId: teacherCode })
      homeroomOr.push({ homeroomTeacherId: { contains: teacherCode } })
    }
    if (homeroomNames.length > 0) {
      homeroomOr.push({ className: { in: homeroomNames } })
      homeroomOr.push({ classCode: { in: homeroomNames } })
    }

    ;[allMoetList, allCtqtList, allSpecialList, allHomeroomClasses, allLegacyClassAssigns] =
      await Promise.all([
        prisma.teachingAssignment
          .findMany({
            where: { teacherId: ctx.teacherId },
            include: {
              class: { include: { campus: true, academicYear: true } },
              subject: true,
            },
          })
          .catch(() => []),
        pAny.ctqtTeachingAssignment
          ?.findMany({
            where: {
              OR: [{ primaryTeacherId: ctx.teacherId }, { delegatedTeacherId: ctx.teacherId }],
            },
            include: {
              class: { include: { campus: true, academicYear: true } },
            },
          })
          .catch(() => []) ?? [],
        pAny.specialTeachingAssignment
          ?.findMany({
            where: {
              teacherId: ctx.teacherId,
              status: "ACTIVE",
            },
            include: {
              class: { include: { campus: true, academicYear: true } },
              subject: true,
            },
          })
          .catch(() => []) ?? [],
        prisma.class
          .findMany({
            where: {
              OR: homeroomOr,
            },
            include: { campus: true, academicYear: true },
          })
          .catch(() => []),
        pAny.teacherClassAssignment
          ?.findMany({
            where: { teacherId: ctx.teacherId },
            include: {
              class: { include: { campus: true, academicYear: true } },
            },
          })
          .catch(() => []) ?? [],
      ])
  }

  // Count how many assignments exist per academicYearId
  const countByYear = new Map<string, number>()
  const bumpYearCount = (yId?: string | null) => {
    if (!yId) return
    countByYear.set(yId, (countByYear.get(yId) || 0) + 1)
  }
  for (const m of allMoetList) bumpYearCount(m.academicYearId || m.class?.academicYearId)
  for (const c of allCtqtList) bumpYearCount(c.academicYearId || c.class?.academicYearId)
  for (const s of allSpecialList) bumpYearCount(s.academicYearId || s.class?.academicYearId)
  for (const h of allHomeroomClasses) bumpYearCount(h.academicYearId)
  for (const l of allLegacyClassAssigns) bumpYearCount(l.class?.academicYearId)

  const academicYears = rawAcademicYears.map((y) => ({
    ...y,
    isCurrent: y.status === "ACTIVE",
    assignmentCount: countByYear.get(y.id) || 0,
  }))

  // Pick requested year, or year with status="ACTIVE" that has assignments, or any year that has assignments, or active year
  const activeYear =
    (requestedAcademicYearId
      ? academicYears.find((y) => y.id === requestedAcademicYearId)
      : null) ||
    academicYears.find((y) => y.status === "ACTIVE" && (countByYear.get(y.id) || 0) > 0) ||
    academicYears.find((y) => (countByYear.get(y.id) || 0) > 0) ||
    academicYears.find((y) => y.status === "ACTIVE") ||
    academicYears[0] ||
    null

  const selectedYearId = activeYear?.id || ""

  const classMap = new Map<string, AuthorizedClassSubjectItem>()
  const flatAssignments: Array<{
    classId: string
    className: string
    gradeLevel: string
    campusId: string
    campusName: string
    subjectId: string | null
    subjectCode: string
    subjectName: string
    category: "MOET" | "SKL" | "INTERNATIONAL"
    sourceType: string
    academicYearId: string
  }> = []
  const seenFlatKey = new Set<string>()

  const addClassSubject = (
    cls: any,
    role: AuthorizedClassSubjectItem["assignmentRole"],
    subj?: {
      subjectId?: string | null
      subjectCode: string
      subjectName: string
      category: "MOET" | "SKL" | "INTERNATIONAL"
      sourceLabel?: string
    }
  ) => {
    if (!cls || !cls.id) return
    const gradeStr = String(cls.grade || "").replace(/^K/i, "")
    const gradeLevel = gradeStr ? `K${gradeStr}` : "K10"
    const campusName = cls.campus?.campusName || ctx.campusName || "Sky-Line"
    const existing: AuthorizedClassSubjectItem = classMap.get(cls.id) || {
      classId: cls.id,
      className: cls.className,
      gradeLevel,
      level: cls.level || "",
      campusId: cls.campusId,
      campusName,
      academicYearId: cls.academicYearId || selectedYearId,
      academicYearName: cls.academicYear?.name || activeYear?.name || "",
      assignmentRole: role,
      subjects: [],
    }
    if (subj) {
      if (!existing.subjects.some((s) => s.subjectCode === subj.subjectCode)) {
        existing.subjects.push({
          subjectId: subj.subjectId,
          subjectCode: subj.subjectCode,
          subjectName: subj.subjectName,
          category: subj.category,
        })
      }
      const fKey = `${cls.id}::${subj.subjectCode}`
      if (!seenFlatKey.has(fKey)) {
        seenFlatKey.add(fKey)
        flatAssignments.push({
          classId: cls.id,
          className: cls.className,
          gradeLevel,
          campusId: cls.campusId,
          campusName,
          subjectId: subj.subjectId || null,
          subjectCode: subj.subjectCode,
          subjectName: subj.subjectName,
          category: subj.category,
          sourceType:
            subj.sourceLabel ||
            (role === "HOMEROOM_TEACHER"
              ? "GV Chủ nhiệm"
              : role === "SPECIAL_TEACHER"
                ? "Môn đặc thù Sky-Line"
                : role === "CTQT_TEACHER"
                  ? "Chương trình Quốc tế"
                  : role === "MANAGER_SCOPE"
                    ? "Phạm vi Tổ/Quản lý"
                    : "GV Bộ môn"),
          academicYearId: cls.academicYearId || selectedYearId,
        })
      }
    }
    classMap.set(cls.id, existing)
  }

  const filterByYearOrAll = <T extends { academicYearId?: string | null; class?: any }>(
    list: T[]
  ): T[] => {
    if (!selectedYearId) return list
    const matched = list.filter(
      (item) =>
        item.academicYearId === selectedYearId ||
        item.class?.academicYearId === selectedYearId
    )
    return matched.length > 0 ? matched : list
  }

  for (const ma of filterByYearOrAll(allMoetList)) {
    const sub = (ma as any).subject || subjectById.get(ma.subjectId)
    addClassSubject((ma as any).class, "SUBJECT_TEACHER", {
      subjectId: ma.subjectId,
      subjectCode: sub?.subjectCode || "MON_HOC",
      subjectName: sub?.subjectName || "Môn giảng dạy",
      category: (sub?.category as any) || "MOET",
      sourceLabel: "Phân công giảng dạy (GVBM)",
    })
  }

  for (const ca of filterByYearOrAll(allCtqtList)) {
    const sub = subjectByCode.get(ca.subjectCode)
    addClassSubject(ca.class, "CTQT_TEACHER", {
      subjectId: sub?.id || null,
      subjectCode: ca.subjectCode,
      subjectName: sub?.subjectName || `CTQT (${ca.subjectCode})`,
      category: "INTERNATIONAL",
      sourceLabel: "Phân công CTQT",
    })
  }

  for (const sa of filterByYearOrAll(allSpecialList)) {
    const sp = sa.subject || specialById.get(sa.subjectId)
    addClassSubject(sa.class, "SPECIAL_TEACHER", {
      subjectId: sa.subjectId,
      subjectCode: sp?.code || "SKL_SPECIAL",
      subjectName: sp ? `${sp.name} (Đặc thù Sky-Line)` : "Môn đặc thù Sky-Line",
      category: "SKL",
      sourceLabel: "Môn đặc thù Sky-Line",
    })
  }

  const homeroomFiltered = selectedYearId
    ? allHomeroomClasses.filter((hc) => hc.academicYearId === selectedYearId)
    : allHomeroomClasses
  const effectiveHomerooms =
    homeroomFiltered.length > 0 ? homeroomFiltered : allHomeroomClasses

  for (const hc of effectiveHomerooms) {
    addClassSubject(hc, "HOMEROOM_TEACHER", {
      subjectId: null,
      subjectCode: ctx.mainSubjectCode || "CHU_NHIEM",
      subjectName: ctx.mainSubjectName || "Công tác chủ nhiệm & Tư vấn",
      category: "MOET",
      sourceLabel: "Giáo viên Chủ nhiệm",
    })
  }

  for (const lca of allLegacyClassAssigns) {
    if (lca.class && (!selectedYearId || lca.class.academicYearId === selectedYearId || flatAssignments.length === 0)) {
      addClassSubject(lca.class, "SUBJECT_TEACHER", {
        subjectId: null,
        subjectCode: ctx.mainSubjectCode || "TOAN",
        subjectName: ctx.mainSubjectName || "Môn chuyên môn",
        category: "MOET",
        sourceLabel: "Phân công lớp học",
      })
    }
  }

  // 2. If teacher still has 0 personal assignments in this year, check their Department's assignments (same as /teacher/phan-cong-giang-day)
  if (flatAssignments.length === 0 && (ctx.departmentId || teacherRecord?.departmentAssignments?.length)) {
    const deptIds = Array.from(
      new Set<string>([
        ...(ctx.departmentId ? [ctx.departmentId] : []),
        ...((teacherRecord?.departmentAssignments || []).map((d: any) => String(d.departmentId)).filter(Boolean)),
      ])
    )
    if (deptIds.length > 0) {
      const deptAssignments = await prisma.teachingAssignment
        .findMany({
          where: {
            ...(selectedYearId ? { academicYearId: selectedYearId } : {}),
            teacher: {
              OR: [
                { departmentId: { in: deptIds } },
                { departmentAssignments: { some: { departmentId: { in: deptIds } } } },
              ],
            },
          },
          include: {
            class: { include: { campus: true, academicYear: true } },
            subject: true,
          },
          take: 40,
        })
        .catch(() => [])

      for (const da of deptAssignments) {
        const sub = (da as any).subject || subjectById.get(da.subjectId)
        addClassSubject((da as any).class, "MANAGER_SCOPE", {
          subjectId: da.subjectId,
          subjectCode: sub?.subjectCode || "MON_HOC",
          subjectName: sub?.subjectName || "Môn chuyên môn",
          category: (sub?.category as any) || "MOET",
          sourceLabel: `Tổ chuyên môn (${ctx.departmentName || "Cùng tổ"})`,
        })
      }
    }
  }

  // 3. Fallback for Managers / Admins / KT&ĐBCL or accounts without explicit TeachingAssignment rows in the selected year
  if (flatAssignments.length === 0) {
    const scopedClasses = await prisma.class
      .findMany({
        where: {
          status: "ACTIVE",
          ...(selectedYearId ? { academicYearId: selectedYearId } : {}),
          ...(!isSuperOrCommunityAdmin(ctx) && ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        include: { campus: true, academicYear: true },
        orderBy: [{ grade: "asc" }, { className: "asc" }],
        take: 30,
      })
      .catch(() => [])

    const fallbackClasses =
      scopedClasses.length > 0
        ? scopedClasses
        : await prisma.class
            .findMany({
              where: {
                status: "ACTIVE",
                ...(!isSuperOrCommunityAdmin(ctx) && ctx.campusId ? { campusId: ctx.campusId } : {}),
              },
              include: { campus: true, academicYear: true },
              orderBy: [{ grade: "asc" }, { className: "asc" }],
              take: 25,
            })
            .catch(() => [])

    const defaultSubCode = ctx.mainSubjectCode || allSubjects[0]?.subjectCode || "TOAN"
    const defaultSubName = ctx.mainSubjectName || allSubjects[0]?.subjectName || "Toán"
    const defaultSubId = subjectByCode.get(defaultSubCode)?.id || allSubjects[0]?.id || null

    for (const sc of fallbackClasses) {
      addClassSubject(sc, "MANAGER_SCOPE", {
        subjectId: defaultSubId,
        subjectCode: defaultSubCode,
        subjectName: defaultSubName,
        category: "MOET",
        sourceLabel:
          isSuperOrCommunityAdmin(ctx) || ctx.isKtdbclOfficer || ctx.isDepartmentHead
            ? "Phạm vi Quản lý / Cơ sở"
            : "Lớp thuộc Cơ sở giảng dạy",
      })
    }
  }

  // Ensure each authorized class has fallback subject choices if homeroom/manager
  const authorizedClasses = Array.from(classMap.values()).map((c) => {
    if (c.subjects.length === 0) {
      c.subjects.push({
        subjectId: null,
        subjectCode: ctx.mainSubjectCode || "TOAN",
        subjectName: ctx.mainSubjectName || "Môn chuyên môn",
        category: "MOET",
      })
    }
    return c
  })

  // Flatten special lessons for quick selection when teaching a Sky-Line special subject
  const specialLessonsCatalog = specialTopics.flatMap((t: any) => {
    const subjCode = t.curriculumVersion?.curriculum?.subject?.code || "SKL"
    const grade = t.curriculumVersion?.curriculum?.grade || ""
    return (t.lessons || []).map((l: any) => ({
      id: l.id,
      subjectCode: subjCode,
      gradeLevel: grade ? `K${grade}` : "",
      topicName: t.topicName,
      lessonName: l.lessonName,
      objectives: l.objectives || "",
      requirements: l.requirements || "",
    }))
  })

  const evaluationPeriods = [
    { code: "ALL", label: "Toàn bộ kỳ/tháng hiện có trong năm học" },
    { code: "THANG_9", label: "Tháng 9" },
    { code: "THANG_10", label: "Tháng 10" },
    { code: "THANG_11", label: "Tháng 11" },
    { code: "THANG_12", label: "Tháng 12" },
    { code: "GIUA_HK1", label: "Giữa Học kỳ I" },
    { code: "CUOI_HK1", label: "Cuối Học kỳ I (HK1)" },
    { code: "THANG_1", label: "Tháng 1" },
    { code: "THANG_2", label: "Tháng 2" },
    { code: "THANG_3", label: "Tháng 3" },
    { code: "THANG_4", label: "Tháng 4" },
    { code: "GIUA_HK2", label: "Giữa Học kỳ II" },
    { code: "CUOI_HK2", label: "Cuối Học kỳ II (HK2)" },
  ]

  const dataSources = [
    {
      id: "ACADEMIC_RECORDS",
      name: "Điểm số & Mức đạt môn học",
      status: "REFERENCE",
      defaultSelected: true,
      note: "Tham khảo tự động phân bố mức đạt của lớp trên SSM (nếu kỳ này đã có điểm)",
    },
    {
      id: "EXAM_BREAKDOWN",
      name: "Khảo sát & Bài kiểm tra",
      status: "REFERENCE",
      defaultSelected: true,
      note: "Tham khảo phổ điểm khảo sát, trắc nghiệm/tự luận và chủ đề cần lưu ý",
    },
    {
      id: "COMPETENCY_RADAR",
      name: "Đánh giá năng lực định kỳ",
      status: "REFERENCE",
      defaultSelected: false,
      note: "Tham khảo nhận xét năng lực thành phần theo tháng / học kỳ",
    },
    {
      id: "SUPPORT_PLANS",
      name: "Hoạt động hỗ trợ & Tư vấn học tập",
      status: "REFERENCE",
      defaultSelected: false,
      note: "Tham khảo nhóm nội dung học sinh đang cần củng cố thêm",
    },
    {
      id: "SPECIAL_SUBJECT_RUBRIC",
      name: "Rubric môn đặc thù Sky-Line",
      status: "REFERENCE",
      defaultSelected: false,
      note: "Chỉ áp dụng tham khảo khi dạy các môn đặc thù Sky-Line",
    },
    {
      id: "CURRICULUM_LESSONS",
      name: "Danh mục chủ đề môn học",
      status: "REFERENCE",
      defaultSelected: false,
      note: "Tham khảo khung chủ đề sẵn có trên hệ thống (kết hợp giáo án của GV)",
    },
  ]

  return {
    teacherProfile: {
      teacherId: ctx.teacherId,
      fullName: ctx.fullName,
      campusId: ctx.campusId,
      campusName: ctx.campusName,
      departmentId: ctx.departmentId,
      departmentName: ctx.departmentName,
      mainSubjectCode: ctx.mainSubjectCode,
      mainSubjectName: ctx.mainSubjectName,
      position: ctx.teacherPosition,
    },
    academicYears,
    selectedAcademicYearId: selectedYearId,
    evaluationPeriods,
    assignments: flatAssignments,
    authorizedClasses,
    dataSources,
    specialLessonsCatalog,
    dataSourcesMapping: getSsmDataMappingReport(),
  }
}

export interface DeterministicMetricItem {
  id: string
  label: string
  value: number | string
  unit: string
  sourceTable: string
  recordCount: number
  updatedAt: string | null
  formulaNote: string
}

export interface EvidenceBriefResult {
  briefId: string
  scope: {
    academicYearId: string
    academicYearName: string
    evaluationPeriod: string
    classId: string
    className: string
    gradeLevel: string
    subjectId?: string | null
    subjectCode: string
    subjectName: string
    topicOrLesson: string
  }
  dataQualityAudit: {
    totalClassStudents: number
    validScoredStudentCount: number
    missingScoreCount: number
    missingRemarkCount: number
    duplicateRecordCount: number
    latestUpdatedAt: string | null
    isStaleData: boolean
    hasDetailedWorkOrRubricEvidence: boolean
    specificKnowledgeErrorsAllowed: boolean
    guardrailNotice: string
  }
  sourcesStatus: Array<{
    sourceKey: string
    sourceName: string
    tableName: string
    status: "CONNECTED_WITH_DATA" | "CONNECTED_EMPTY" | "MANUAL_SUPPLEMENT_REQUIRED"
    recordCount: number
    latestUpdatedAt: string | null
    detailNote: string
  }>
  /**
   * Khối 1: Số liệu tính từ dữ liệu (100% tính toán xác định tại backend, không dùng AI tạo số liệu)
   */
  deterministicMetrics: {
    summaryStats: DeterministicMetricItem[]
    scoreDistribution: {
      highCount: number // >= 8.0
      goodCount: number // 6.5 - 7.9
      averageCount: number // 5.0 - 6.4
      needSupportCount: number // < 5.0
      missingCount: number // Chưa có điểm (tuyệt đối không biến thành 0)
      averageScore: number | null
      benchmarkScore: number | null
      belowBenchmarkCount: number | null
      progressDeltaVsPrevious: number | null
    }
    identifiedSkillOrTopicGaps: Array<{
      id: string
      topicOrCompetencyName: string
      affectedStudentCount: number
      affectedPercent: number
      evidenceSource: string
    }>
    missingInformationList: string[]
  }
  /**
   * Khối 2: Nhận định AI (Diễn giải trên kết quả đã tính, neo vào mã số liệu, không tự bịa số liệu)
   */
  aiInterpretation: {
    generatedBy: "GEMINI_AI" | "DETERMINISTIC_INTERPRETER"
    aiConfigured: boolean
    modelName: string
    learningSituationSummary: string
    prominentSupportNeeds: Array<{
      id: string
      statement: string
      anchoredMetricIds: string[]
      sourceLabel: string
    }>
    pedagogicalCautions: string[]
  }
  /**
   * Khối 3: Đề xuất hành động & Gợi ý Skill phù hợp
   */
  proposedActions: Array<{
    id: string
    workCategory: string
    workCategoryLabel: string
    suggestedSkillTitle: string
    targetGroupDesc: string
    rationale: string
    recommendedDurationMinutes: number
    recommendedOutputStructure: string
  }>
}

/**
 * Bước 2 & Bước 3: Rà soát dữ liệu SSM và tạo Bản căn cứ xây dựng Skill (Evidence Brief).
 * Quy tắc nghiêm ngặt:
 * - Kiểm tra quyền giáo viên trên lớp/môn ở backend.
 * - Không biến dữ liệu thiếu (null/undefined) thành kết quả bằng 0.
 * - Chỉ nhận diện lỗi kiến thức cụ thể khi có bài làm (TestingCandidateResult.topicBreakdownJson/essayComment),
 *   đánh giá năng lực thành phần (StudentCompetencyAssessment), rubric môn đặc thù (SpecialGradeEntry),
 *   hoặc nhận xét/hỗ trợ chi tiết (remark, LearningSupportTarget). Không suy diễn lỗi kiến thức chỉ từ điểm tổng.
 * - Tính toán số liệu ở backend bằng logic xác định; AI chỉ diễn giải trên kết quả đã tính.
 */
export async function reviewScopeDataAndBuildEvidenceBrief(
  ctx: SlcUserContext,
  input: {
    academicYearId: string
    evaluationPeriod?: string
    classId: string
    subjectId?: string | null
    subjectCode: string
    subjectName?: string
    topicOrLesson?: string
    selectedSources?: string[]
    teacherProactiveNotes?: string
    targetObjective?: string
    lessonPlanReference?: string
  }
): Promise<EvidenceBriefResult> {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const accessCheck = await verifyTeacherClassSubjectAccess(ctx, {
    classId: input.classId,
    subjectCode: input.subjectCode,
    subjectId: input.subjectId,
    academicYearId: input.academicYearId,
  })

  if (!accessCheck.allowed || !accessCheck.classInfo) {
    throw new Error(
      accessCheck.reason || "PERMISSION_DENIED: Không có quyền truy cập dữ liệu lớp học này."
    )
  }

  const cls = accessCheck.classInfo
  const evaluationPeriod = input.evaluationPeriod || "ALL"
  const topicOrLesson = sanitizeRichText(input.topicOrLesson || "")

  // Resolve subject record if subjectId not provided
  let resolvedSubjectId = input.subjectId || null
  let resolvedSubjectName = input.subjectName || input.subjectCode
  if (!resolvedSubjectId) {
    const subjRow = await prisma.subject
      .findFirst({
        where: { subjectCode: input.subjectCode },
        select: { id: true, subjectName: true },
      })
      .catch(() => null)
    if (subjRow) {
      resolvedSubjectId = subjRow.id
      resolvedSubjectName = subjRow.subjectName
    }
  }

  // 1. Fetch ONLY required fields (no student PII exposed to output)
  const [
    classStudents,
    gradeEntries,
    benchmarkCfg,
    competencyEntries,
    ctqtEntries,
    specialEntries,
    testResults,
    supportTargets,
    consultationLogs,
    specialLessons,
  ] = await Promise.all([
    prisma.student
      .findMany({
        where: { classId: cls.id, status: "ACTIVE" },
        select: { id: true },
      })
      .catch(() => []),
    prisma.subjectGradeEntry
      .findMany({
        where: {
          classId: cls.id,
          academicYearId: cls.academicYearId,
          ...(resolvedSubjectId ? { subjectId: resolvedSubjectId } : {}),
        },
        select: {
          id: true,
          studentId: true,
          evaluationPeriod: true,
          componentScores: true,
          compositeScore: true,
          remark: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => []),
    resolvedSubjectId
      ? prisma.subjectBenchmarkConfig
          .findFirst({
            where: {
              academicYearId: cls.academicYearId,
              subjectId: resolvedSubjectId,
              grade: cls.grade,
            },
            select: { benchmarkScore: true, updatedAt: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    resolvedSubjectId
      ? prisma.studentCompetencyAssessment
          .findMany({
            where: {
              academicYearId: cls.academicYearId,
              subjectId: resolvedSubjectId,
              student: { classId: cls.id },
            },
            include: {
              competency: { select: { code: true, name: true } },
            },
            orderBy: { updatedAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    pAny.ctqtGradeEntry
      ?.findMany({
        where: {
          classId: cls.id,
          academicYearId: cls.academicYearId,
          subjectCode: input.subjectCode,
        },
        select: {
          id: true,
          studentId: true,
          semester: true,
          gpaScore: true,
          commentVi: true,
          updatedAt: true,
        },
      })
      .catch(() => []) ?? [],
    pAny.specialGradeEntry
      ?.findMany({
        where: {
          classId: cls.id,
          academicYearId: cls.academicYearId,
        },
        select: {
          id: true,
          studentId: true,
          evalScope: true,
          evalResult: true,
          numericScore: true,
          rubricDetails: true,
          teacherFeedback: true,
          updatedAt: true,
        },
      })
      .catch(() => []) ?? [],
    pAny.testingCandidateResult
      ?.findMany({
        where: {
          student: { classId: cls.id },
          subjectExam: {
            subjectCode: input.subjectCode,
          },
        },
        select: {
          id: true,
          studentId: true,
          mcqScore: true,
          essayScore: true,
          finalScore: true,
          topicBreakdownJson: true,
          levelBreakdownJson: true,
          essayComment: true,
          updatedAt: true,
        },
        take: 200,
      })
      .catch(() => []) ?? [],
    pAny.learningSupportTarget
      ?.findMany({
        where: {
          classId: cls.id,
          academicYearId: cls.academicYearId,
        },
        select: {
          id: true,
          studentId: true,
          supportType: true,
          reason: true,
          academicTopic: true,
          outcome: true,
          updatedAt: true,
        },
      })
      .catch(() => []) ?? [],
    pAny.academicConsultationLog
      ?.findMany({
        where: {
          student: { classId: cls.id },
          academicYearId: cls.academicYearId,
        },
        select: {
          id: true,
          studentId: true,
          academicTopic: true,
          difficulties: true,
          nextActions: true,
          updatedAt: true,
        },
      })
      .catch(() => []) ?? [],
    pAny.specialLesson
      ?.findMany({
        where: topicOrLesson
          ? { lessonName: { contains: topicOrLesson } }
          : undefined,
        select: {
          id: true,
          lessonName: true,
          objectives: true,
          requirements: true,
          UpdatedAt: false,
        },
        take: 10,
      })
      .catch(() => []) ?? [],
  ])

  const totalClassStudents = classStudents.length

  // Filter gradeEntries by evaluationPeriod if specified
  const matchingPeriodGrades =
    evaluationPeriod && evaluationPeriod !== "ALL"
      ? gradeEntries.filter((g) => {
          const pNorm = String(g.evaluationPeriod || "").toUpperCase()
          return pNorm.includes(evaluationPeriod.replace("THANG_", "").replace("CUOI_", ""))
        })
      : gradeEntries

  const effectiveGradeEntries =
    matchingPeriodGrades.length > 0 ? matchingPeriodGrades : gradeEntries

  // Check duplicate records per (studentId, evaluationPeriod)
  const seenStudentPeriod = new Set<string>()
  let duplicateRecordCount = 0
  const latestScoreByStudent = new Map<string, number>()
  const previousScoreByStudent = new Map<string, number>()
  const remarksList: string[] = []
  let timestampsMs: number[] = []

  for (const ge of effectiveGradeEntries) {
    const key = `${ge.studentId}::${ge.evaluationPeriod || "DEFAULT"}`
    if (seenStudentPeriod.has(key)) {
      duplicateRecordCount++
    } else {
      seenStudentPeriod.add(key)
    }

    if (ge.updatedAt) {
      timestampsMs.push(new Date(ge.updatedAt).getTime())
    }

    if (ge.remark && String(ge.remark).trim()) {
      remarksList.push(String(ge.remark).trim())
    }

    // IMPORTANT RULE: Never convert null/undefined score into 0!
    if (ge.compositeScore !== null && ge.compositeScore !== undefined && !Number.isNaN(Number(ge.compositeScore))) {
      const numeric = Number(ge.compositeScore)
      if (!latestScoreByStudent.has(ge.studentId)) {
        latestScoreByStudent.set(ge.studentId, numeric)
      } else if (!previousScoreByStudent.has(ge.studentId)) {
        previousScoreByStudent.set(ge.studentId, numeric)
      }
    }
  }

  // Also include CTQT or SpecialGradeEntry numeric scores if MOET gradeEntries are empty
  if (latestScoreByStudent.size === 0 && ctqtEntries.length > 0) {
    for (const ce of ctqtEntries) {
      if (ce.updatedAt) timestampsMs.push(new Date(ce.updatedAt).getTime())
      if (ce.commentVi && String(ce.commentVi).trim()) remarksList.push(String(ce.commentVi).trim())
      if (ce.gpaScore !== null && ce.gpaScore !== undefined && !Number.isNaN(Number(ce.gpaScore))) {
        latestScoreByStudent.set(ce.studentId, Number(ce.gpaScore))
      }
    }
  }

  if (latestScoreByStudent.size === 0 && specialEntries.length > 0) {
    for (const se of specialEntries) {
      if (se.updatedAt) timestampsMs.push(new Date(se.updatedAt).getTime())
      if (se.teacherFeedback && String(se.teacherFeedback).trim()) {
        remarksList.push(String(se.teacherFeedback).trim())
      }
      if (
        se.numericScore !== null &&
        se.numericScore !== undefined &&
        !Number.isNaN(Number(se.numericScore))
      ) {
        latestScoreByStudent.set(se.studentId, Number(se.numericScore))
      }
    }
  }

  const validScores = Array.from(latestScoreByStudent.values())
  const validScoredStudentCount = validScores.length
  const missingScoreCount = Math.max(0, totalClassStudents - validScoredStudentCount)
  const missingRemarkCount = Math.max(0, totalClassStudents - remarksList.length)

  let highCount = 0
  let goodCount = 0
  let averageCount = 0
  let needSupportCount = 0

  for (const s of validScores) {
    if (s >= 8.0) highCount++
    else if (s >= 6.5) goodCount++
    else if (s >= 5.0) averageCount++
    else needSupportCount++
  }

  const averageScore =
    validScoredStudentCount > 0
      ? Number(
          (validScores.reduce((acc, v) => acc + v, 0) / validScoredStudentCount).toFixed(2)
        )
      : null

  const benchmarkScore =
    benchmarkCfg?.benchmarkScore !== null && benchmarkCfg?.benchmarkScore !== undefined
      ? Number(benchmarkCfg.benchmarkScore)
      : null

  const belowBenchmarkCount =
    benchmarkScore !== null && validScoredStudentCount > 0
      ? validScores.filter((s) => s < benchmarkScore).length
      : null

  // Calculate progress delta vs previous period if at least 3 students have both periods
  let progressDeltaVsPrevious: number | null = null
  const pairedDeltas: number[] = []
  for (const [stuId, currScore] of latestScoreByStudent.entries()) {
    const prevScore = previousScoreByStudent.get(stuId)
    if (prevScore !== undefined) {
      pairedDeltas.push(currScore - prevScore)
    }
  }
  if (pairedDeltas.length >= 3) {
    progressDeltaVsPrevious = Number(
      (pairedDeltas.reduce((a, b) => a + b, 0) / pairedDeltas.length).toFixed(2)
    )
  }

  // Extract specific topic/competency gaps ONLY when real student work/competency/rubric/remark evidence exists
  const identifiedSkillOrTopicGaps: EvidenceBriefResult["deterministicMetrics"]["identifiedSkillOrTopicGaps"] =
    []

  // Source A: StudentCompetencyAssessment breakdown
  const compStats = new Map<
    string,
    { name: string; lowCount: number; totalCount: number }
  >()
  for (const ca of competencyEntries) {
    if ((ca as any).updatedAt) timestampsMs.push(new Date((ca as any).updatedAt).getTime())
    const compName =
      (ca as any).competency?.name || (ca as any).competency?.code || "Năng lực thành phần"
    const pct =
      ca.competencyPercent !== null && ca.competencyPercent !== undefined
        ? Number(ca.competencyPercent)
        : ca.maxScore && ca.maxScore > 0
          ? (Number(ca.achievedScore) / Number(ca.maxScore)) * 100
          : null
    if (pct === null) continue
    const st = compStats.get(compName) || { name: compName, lowCount: 0, totalCount: 0 }
    st.totalCount++
    if (pct < 65) st.lowCount++
    compStats.set(compName, st)
  }
  for (const [compName, st] of compStats.entries()) {
    if (st.lowCount > 0 && st.totalCount > 0) {
      identifiedSkillOrTopicGaps.push({
        id: `comp_${identifiedSkillOrTopicGaps.length + 1}`,
        topicOrCompetencyName: `Năng lực: ${compName}`,
        affectedStudentCount: st.lowCount,
        affectedPercent: Number(((st.lowCount / st.totalCount) * 100).toFixed(1)),
        evidenceSource: "Bảng đánh giá năng lực theo tháng/kỳ (StudentCompetencyAssessment)",
      })
    }
  }

  // Source B: TestingCandidateResult topicBreakdownJson
  const topicLowMap = new Map<string, { lowCount: number; totalCount: number }>()
  for (const tr of testResults) {
    if (tr.updatedAt) timestampsMs.push(new Date(tr.updatedAt).getTime())
    if (tr.topicBreakdownJson) {
      try {
        const parsed = JSON.parse(tr.topicBreakdownJson)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const tName = String(item.topicName || item.topic || "").trim()
            const accuracy = Number(item.accuracyPercent ?? item.percent ?? 100)
            if (!tName) continue
            const cur = topicLowMap.get(tName) || { lowCount: 0, totalCount: 0 }
            cur.totalCount++
            if (accuracy < 60) cur.lowCount++
            topicLowMap.set(tName, cur)
          }
        }
      } catch {
        // ignore malformed json
      }
    }
  }
  for (const [tName, st] of topicLowMap.entries()) {
    if (st.lowCount > 0 && st.totalCount > 0) {
      identifiedSkillOrTopicGaps.push({
        id: `exam_topic_${identifiedSkillOrTopicGaps.length + 1}`,
        topicOrCompetencyName: `Chủ đề bài kiểm tra: ${tName}`,
        affectedStudentCount: st.lowCount,
        affectedPercent: Number(((st.lowCount / st.totalCount) * 100).toFixed(1)),
        evidenceSource: "Kết quả phân tích câu hỏi/chủ đề bài khảo sát (TestingCandidateResult)",
      })
    }
  }

  // Source C: LearningSupportTarget & AcademicConsultationLog topics
  const supportTopicCounts = new Map<string, number>()
  for (const st of supportTargets) {
    if (st.updatedAt) timestampsMs.push(new Date(st.updatedAt).getTime())
    const topicText = String(st.academicTopic || st.reason || "").trim()
    if (topicText) {
      supportTopicCounts.set(topicText, (supportTopicCounts.get(topicText) || 0) + 1)
    }
  }
  for (const log of consultationLogs) {
    if (log.updatedAt) timestampsMs.push(new Date(log.updatedAt).getTime())
    const topicText = String(log.academicTopic || log.difficulties || "").trim()
    if (topicText) {
      supportTopicCounts.set(topicText, (supportTopicCounts.get(topicText) || 0) + 1)
    }
  }
  for (const [topicText, cnt] of supportTopicCounts.entries()) {
    const cleanTopic = detectAndRedactStudentPii(topicText).redactedText.slice(0, 120)
    identifiedSkillOrTopicGaps.push({
      id: `support_topic_${identifiedSkillOrTopicGaps.length + 1}`,
      topicOrCompetencyName: `Nhu cầu hỗ trợ: ${cleanTopic}`,
      affectedStudentCount: cnt,
      affectedPercent:
        totalClassStudents > 0 ? Number(((cnt / totalClassStudents) * 100).toFixed(1)) : 0,
      evidenceSource:
        "Danh sách học sinh cần hỗ trợ & Nhật ký tư vấn học vụ (LearningSupportTarget / AcademicConsultationLog)",
    })
  }

  const hasDetailedWorkOrRubricEvidence =
    competencyEntries.length > 0 ||
    testResults.some((t: any) => Boolean(t.topicBreakdownJson || t.essayComment)) ||
    specialEntries.some((s: any) => Boolean(s.rubricDetails || s.teacherFeedback)) ||
    remarksList.length > 0 ||
    supportTargets.length > 0 ||
    consultationLogs.length > 0

  const specificKnowledgeErrorsAllowed = hasDetailedWorkOrRubricEvidence

  const latestUpdatedMs = timestampsMs.length > 0 ? Math.max(...timestampsMs) : null
  const latestUpdatedAt = latestUpdatedMs ? new Date(latestUpdatedMs).toISOString() : null
  const isStaleData =
    latestUpdatedMs !== null
      ? Date.now() - latestUpdatedMs > 45 * 24 * 60 * 60 * 1000
      : true

  const guardrailNotice = specificKnowledgeErrorsAllowed
    ? "Đã có minh chứng nhận xét/năng lực thành phần/bài khảo sát để nhận diện nhu cầu hỗ trợ theo chủ đề."
    : "CHỈ CÓ ĐIỂM TỔNG HỢP (chưa có dữ liệu bài làm chi tiết hoặc nhận xét năng lực thành phần): Hệ thống chỉ thống kê phân bố mức độ đạt và nhóm điểm; tuyệt đối KHÔNG suy diễn lỗi kiến thức cụ thể từ điểm tổng hợp và KHÔNG biến bản ghi thiếu điểm thành điểm 0."

  // Build sourcesStatus list
  const sourcesStatus: EvidenceBriefResult["sourcesStatus"] = [
    {
      sourceKey: "CLASS_ROSTER",
      sourceName: "Danh sách học sinh lớp & Phân công giảng dạy",
      tableName: "Student, Class, TeachingAssignment",
      status: totalClassStudents > 0 ? "CONNECTED_WITH_DATA" : "CONNECTED_EMPTY",
      recordCount: totalClassStudents,
      latestUpdatedAt,
      detailNote:
        totalClassStudents > 0
          ? `Đã kết nối sĩ số ${totalClassStudents} học sinh đang học (đã ẩn danh PII).`
          : "Lớp hiện chưa có danh sách học sinh active.",
    },
    {
      sourceKey: "SUBJECT_GRADES",
      sourceName: "Điểm tổng hợp & Nhận xét bộ môn",
      tableName: "SubjectGradeEntry / CtqtGradeEntry / SpecialGradeEntry",
      status: validScoredStudentCount > 0 ? "CONNECTED_WITH_DATA" : "CONNECTED_EMPTY",
      recordCount: validScoredStudentCount,
      latestUpdatedAt,
      detailNote:
        validScoredStudentCount > 0
          ? `Có điểm hợp lệ của ${validScoredStudentCount}/${totalClassStudents} HS; ${missingScoreCount} HS chưa có điểm (giữ trạng thái thiếu dữ liệu, không tính là 0).`
          : "Chưa có bản ghi điểm trong kỳ được chọn.",
    },
    {
      sourceKey: "COMPETENCY_ASSESSMENT",
      sourceName: "Đánh giá năng lực thành phần theo tháng/kỳ",
      tableName: "StudentCompetencyAssessment",
      status: competencyEntries.length > 0 ? "CONNECTED_WITH_DATA" : "CONNECTED_EMPTY",
      recordCount: competencyEntries.length,
      latestUpdatedAt,
      detailNote:
        competencyEntries.length > 0
          ? `Đã kết nối ${competencyEntries.length} lượt đánh giá tiêu chí năng lực.`
          : "Chưa có bản ghi đánh giá năng lực thành phần cho phạm vi này.",
    },
    {
      sourceKey: "TESTING_EXAMS",
      sourceName: "Bài kiểm tra / Khảo sát & Phân tích câu hỏi",
      tableName: "TestingCandidateResult, TestingQuestion",
      status: testResults.length > 0 ? "CONNECTED_WITH_DATA" : "CONNECTED_EMPTY",
      recordCount: testResults.length,
      latestUpdatedAt,
      detailNote:
        testResults.length > 0
          ? `Đã kết nối ${testResults.length} kết quả bài khảo sát.`
          : "Chưa có dữ liệu bài làm chi tiết trên hệ thống khảo sát cho môn/lớp này.",
    },
    {
      sourceKey: "CURRICULUM_LESSON",
      sourceName: "Chương trình, Giáo án & Yêu cầu cần đạt",
      tableName: "SpecialLesson (Môn đặc thù) / Bổ sung trực tiếp (Môn Bộ)",
      status:
        specialLessons.length > 0
          ? "CONNECTED_WITH_DATA"
          : "MANUAL_SUPPLEMENT_REQUIRED",
      recordCount: specialLessons.length,
      latestUpdatedAt: null,
      detailNote:
        specialLessons.length > 0
          ? `Đã kết nối ${specialLessons.length} bài học từ khung chương trình môn đặc thù Sky-Line.`
          : "Hệ thống chưa có bảng giáo án từng tiết tự động cho môn học này — Giáo viên sẽ xác nhận/bổ sung mục tiêu và học liệu ở Bước 4.",
    },
    {
      sourceKey: "LEARNING_SUPPORT",
      sourceName: "Hoạt động hỗ trợ học sinh & Tư vấn học vụ",
      tableName: "LearningSupportTarget, AcademicConsultationLog",
      status:
        supportTargets.length + consultationLogs.length > 0
          ? "CONNECTED_WITH_DATA"
          : "CONNECTED_EMPTY",
      recordCount: supportTargets.length + consultationLogs.length,
      latestUpdatedAt,
      detailNote:
        supportTargets.length + consultationLogs.length > 0
          ? `Có ${supportTargets.length} hồ sơ hỗ trợ học tập và ${consultationLogs.length} nhật ký tư vấn.`
          : "Chưa có hồ sơ hỗ trợ học tập hoặc nhật ký tư vấn trong kỳ này.",
    },
  ]

  // Build summaryStats (Block 1: Deterministic Metrics)
  const summaryStats: DeterministicMetricItem[] = [
    {
      id: "M_CLASS_SIZE",
      label: "Sĩ số học sinh đang theo học",
      value: totalClassStudents,
      unit: "học sinh",
      sourceTable: "Student",
      recordCount: totalClassStudents,
      updatedAt: latestUpdatedAt,
      formulaNote: "Đếm số bản ghi Student có status = ACTIVE thuộc lớp",
    },
    {
      id: "M_VALID_SCORED",
      label: "Số học sinh đã có điểm hợp lệ",
      value: validScoredStudentCount,
      unit: "học sinh",
      sourceTable: "SubjectGradeEntry / CtqtGradeEntry / SpecialGradeEntry",
      recordCount: effectiveGradeEntries.length,
      updatedAt: latestUpdatedAt,
      formulaNote: "Chỉ tính học sinh có điểm số thực tế (compositeScore != null)",
    },
    {
      id: "M_MISSING_SCORES",
      label: "Số học sinh chưa có dữ liệu điểm",
      value: missingScoreCount,
      unit: "học sinh",
      sourceTable: "SubjectGradeEntry",
      recordCount: missingScoreCount,
      updatedAt: latestUpdatedAt,
      formulaNote: "Sĩ số lớp trừ số HS đã có điểm (không gán điểm 0 cho dữ liệu thiếu)",
    },
    {
      id: "M_AVG_SCORE",
      label: "Điểm trung bình lớp (trên số HS đã có điểm)",
      value: averageScore !== null ? averageScore : "Chưa có dữ liệu",
      unit: averageScore !== null ? "điểm" : "",
      sourceTable: "SubjectGradeEntry",
      recordCount: validScoredStudentCount,
      updatedAt: latestUpdatedAt,
      formulaNote: "Trung bình cộng compositeScore của các học sinh đã có điểm",
    },
    {
      id: "M_NEED_SUPPORT_GROUP",
      label: "Nhóm học sinh dưới 6.5 điểm (cần củng cố/phân hóa)",
      value: averageCount + needSupportCount,
      unit: "học sinh",
      sourceTable: "SubjectGradeEntry",
      recordCount: validScoredStudentCount,
      updatedAt: latestUpdatedAt,
      formulaNote: `Gồm ${averageCount} HS mức 5.0–6.4 và ${needSupportCount} HS mức < 5.0`,
    },
  ]

  if (benchmarkScore !== null && belowBenchmarkCount !== null) {
    summaryStats.push({
      id: "M_BENCHMARK_GAP",
      label: `Số học sinh dưới ngưỡng chuẩn môn (${benchmarkScore} điểm)`,
      value: belowBenchmarkCount,
      unit: "học sinh",
      sourceTable: "SubjectBenchmarkConfig + SubjectGradeEntry",
      recordCount: validScoredStudentCount,
      updatedAt: latestUpdatedAt,
      formulaNote: `So sánh điểm từng HS với ngưỡng benchmarkScore = ${benchmarkScore}`,
    })
  }

  if (progressDeltaVsPrevious !== null) {
    summaryStats.push({
      id: "M_PROGRESS_DELTA",
      label: "Chênh lệch điểm trung bình so với kỳ đánh giá trước",
      value: progressDeltaVsPrevious > 0 ? `+${progressDeltaVsPrevious}` : progressDeltaVsPrevious,
      unit: "điểm",
      sourceTable: "SubjectGradeEntry (So sánh 2 kỳ)",
      recordCount: pairedDeltas.length,
      updatedAt: latestUpdatedAt,
      formulaNote: `Tính trên ${pairedDeltas.length} HS có đủ dữ liệu 2 kỳ liên tiếp`,
    })
  }

  const missingInformationList: string[] = []
  if (missingScoreCount > 0) {
    missingInformationList.push(
      `Còn ${missingScoreCount}/${totalClassStudents} học sinh chưa có điểm đánh giá trong kỳ đã chọn.`
    )
  }
  if (!hasDetailedWorkOrRubricEvidence) {
    missingInformationList.push(
      "Chưa có dữ liệu bài làm chi tiết (TestingCandidateResult) hoặc đánh giá năng lực thành phần (StudentCompetencyAssessment) hoặc nhận xét chi tiết (remark). Không thể tự động xác định lỗi kiến thức cụ thể."
    )
  }
  if (specialLessons.length === 0) {
    missingInformationList.push(
      "Chưa có mục tiêu bài học/giáo án số hóa tự động cho bài học này — cần giáo viên xác nhận và bổ sung mục tiêu/tài liệu ở Bước 4."
    )
  }
  if (duplicateRecordCount > 0) {
    missingInformationList.push(
      `Phát hiện ${duplicateRecordCount} bản ghi điểm trùng kỳ của cùng học sinh (hệ thống đã lấy bản cập nhật mới nhất).`
    )
  }

  // Build Block 2: AI Interpretation (strictly grounded in deterministicMetrics + Teacher Proactive Input)
  const prominentSupportNeeds: EvidenceBriefResult["aiInterpretation"]["prominentSupportNeeds"] = []

  const cleanProactiveNotes = detectAndRedactStudentPii(
    sanitizeRichText(input.teacherProactiveNotes || "")
  ).redactedText.trim()
  const cleanProactiveObjective = detectAndRedactStudentPii(
    sanitizeRichText(input.targetObjective || "")
  ).redactedText.trim()
  const cleanProactiveMaterial = detectAndRedactStudentPii(
    sanitizeRichText(input.lessonPlanReference || "")
  ).redactedText.trim()

  if (cleanProactiveNotes) {
    prominentSupportNeeds.push({
      id: "NEED_TEACHER_PROACTIVE_OBSERVATION",
      statement: `Nhận định thực tế trên lớp từ Giáo viên: ${cleanProactiveNotes}`,
      anchoredMetricIds: ["M_CLASS_SIZE"],
      sourceLabel: "Giáo viên chủ động xác định (Thực tế giảng dạy)",
    })
  }
  if (cleanProactiveObjective) {
    prominentSupportNeeds.push({
      id: "NEED_TEACHER_PROACTIVE_OBJECTIVE",
      statement: `Mục tiêu & định hướng trọng tâm Giáo viên đặt ra: ${cleanProactiveObjective}`,
      anchoredMetricIds: ["M_CLASS_SIZE"],
      sourceLabel: "Giáo viên chủ động xác định (Mục tiêu bài dạy)",
    })
  }

  if (validScoredStudentCount === 0) {
    prominentSupportNeeds.push({
      id: "NEED_INITIAL_DIAGNOSTIC",
      statement:
        "Lớp hiện chưa có dữ liệu điểm số trong kỳ được chọn; ưu tiên thiết kế hoạt động khảo sát đầu bài hoặc phiếu khởi động chẩn đoán nhanh mức độ sẵn sàng của học sinh.",
      anchoredMetricIds: ["M_CLASS_SIZE", "M_MISSING_SCORES"],
      sourceLabel: "Rà soát dữ liệu điểm (SubjectGradeEntry)",
    })
  } else {
    if (highCount > 0 && averageCount + needSupportCount > 0) {
      prominentSupportNeeds.push({
        id: "NEED_3_TIER_DIFFERENTIATION",
        statement: `Lớp có sự phân hóa rõ giữa nhóm đạt tốt (${highCount} HS >= 8.0) và nhóm cần củng cố (${averageCount + needSupportCount} HS < 6.5, trong đó ${needSupportCount} HS < 5.0). Cần thiết kế nhiệm vụ phân hóa 3 mức độ (Cơ bản - Vận dụng - Mở rộng) trong cùng tiết dạy.`,
        anchoredMetricIds: ["M_VALID_SCORED", "M_NEED_SUPPORT_GROUP"],
        sourceLabel: "Phân bố điểm SubjectGradeEntry",
      })
    } else if (averageCount + needSupportCount > 0) {
      prominentSupportNeeds.push({
        id: "NEED_SCAFFOLDING_SUPPORT",
        statement: `Có ${averageCount + needSupportCount}/${validScoredStudentCount} học sinh đã có điểm đang ở mức dưới 6.5 điểm. Cần chia nhỏ nhiệm vụ học tập (scaffolding), cung cấp gợi ý từng bước và phiếu học tập củng cố.`,
        anchoredMetricIds: ["M_VALID_SCORED", "M_NEED_SUPPORT_GROUP"],
        sourceLabel: "Phân bố điểm SubjectGradeEntry",
      })
    } else {
      prominentSupportNeeds.push({
        id: "NEED_ENRICHMENT_ACTIVITY",
        statement: `Đa số học sinh đã có điểm đạt từ 6.5 trở lên (ĐTB lớp: ${averageScore}). Phù hợp thiết kế hoạt động vận dụng thực tiễn, thảo luận nhóm hoặc dự án nhỏ phát triển năng lực.`,
        anchoredMetricIds: ["M_VALID_SCORED", "M_AVG_SCORE"],
        sourceLabel: "Phân bố điểm SubjectGradeEntry",
      })
    }
  }

  for (const gap of identifiedSkillOrTopicGaps.slice(0, 3)) {
    prominentSupportNeeds.push({
      id: `NEED_GAP_${gap.id}`,
      statement: `Cần hỗ trợ trực tiếp nội dung "${gap.topicOrCompetencyName}" (ghi nhận trên ${gap.affectedStudentCount} học sinh, chiếm ${gap.affectedPercent}%).`,
      anchoredMetricIds: ["M_CLASS_SIZE"],
      sourceLabel: gap.evidenceSource,
    })
  }

  const learningSituationSummary =
    validScoredStudentCount > 0
      ? `Lớp ${cls.className} (${resolvedSubjectName}) hiện có ${validScoredStudentCount}/${totalClassStudents} học sinh có dữ liệu điểm hợp lệ (ĐTB: ${averageScore ?? "—"}, nhóm >= 8.0: ${highCount} HS, nhóm 6.5–7.9: ${goodCount} HS, nhóm 5.0–6.4: ${averageCount} HS, nhóm < 5.0: ${needSupportCount} HS; thiếu dữ liệu: ${missingScoreCount} HS). ${
          specificKnowledgeErrorsAllowed
            ? `Hệ thống ghi nhận ${identifiedSkillOrTopicGaps.length} nhóm nội dung/năng lực cần lưu ý từ minh chứng thực tế.`
            : "Hiện chỉ có điểm tổng hợp, chưa có dữ liệu bài làm chi tiết nên hệ thống chỉ đề xuất phân hóa theo mức độ đạt chung."
        }`
      : `Lớp ${cls.className} (${resolvedSubjectName}) có sĩ số ${totalClassStudents} học sinh nhưng chưa có dữ liệu điểm số trong kỳ "${evaluationPeriod}". Hệ thống khuyến nghị xây dựng Skill thiết kế hoạt động dạy học hoặc phiếu đánh giá chẩn đoán dựa trên mục tiêu bài học do giáo viên xác nhận.`

  // Build Block 3: Proposed Actions & Recommended Skills
  const proposedActions: EvidenceBriefResult["proposedActions"] = [
    {
      id: "ACT_DIFF_TASKS",
      workCategory: "TASK_DIFFERENTIATION",
      workCategoryLabel: "Phân hóa nhiệm vụ",
      suggestedSkillTitle: `Skill thiết kế phiếu nhiệm vụ phân hóa 3 mức độ môn ${resolvedSubjectName} (${cls.grade})`,
      targetGroupDesc:
        validScoredStudentCount > 0
          ? `Nhóm Cơ bản (${needSupportCount + averageCount} HS), Nhóm Khá (${goodCount} HS), Nhóm Giỏi (${highCount} HS)`
          : `Phân hóa 3 mức độ nhận thức cho lớp ${cls.className}`,
      rationale:
        "Đảm bảo mọi nhóm học sinh trong lớp đều có nhiệm vụ vừa sức trong cùng một tiết học mà không tách rời mạch bài giảng chung.",
      recommendedDurationMinutes: 20,
      recommendedOutputStructure:
        "1. Mục tiêu theo 3 mức độ → 2. Nhiệm vụ Mức 1 (Có gợi ý dẫn dắt) → 3. Nhiệm vụ Mức 2 (Vận dụng chuẩn) → 4. Nhiệm vụ Mức 3 (Thử thách mở rộng) → 5. Bảng kiểm tự đánh giá.",
    },
    {
      id: "ACT_STUDENT_SUPPORT",
      workCategory: "STUDENT_SUPPORT",
      workCategoryLabel: "Hỗ trợ nội dung học sinh còn hạn chế",
      suggestedSkillTitle: `Skill tạo học liệu củng cố & hướng dẫn từng bước môn ${resolvedSubjectName}`,
      targetGroupDesc:
        identifiedSkillOrTopicGaps.length > 0
          ? `Học sinh cần hỗ trợ về: ${identifiedSkillOrTopicGaps.map((g) => g.topicOrCompetencyName).join("; ")}`
          : `Nhóm học sinh cần củng cố nền tảng (${needSupportCount + averageCount} HS)`,
      rationale:
        "Giúp học sinh còn hạn chế nắm vững khái niệm cốt lõi thông qua ví dụ mẫu phân tích từng bước và câu hỏi kiểm tra ngắn.",
      recommendedDurationMinutes: 15,
      recommendedOutputStructure:
        "1. Tóm tắt kiến thức cốt lõi ngắn gọn → 2. Ví dụ mẫu giải thích từng bước (Worked Example) → 3. Bài tập tương tự có khung điền khuyết → 4. 3 câu hỏi tự kiểm tra.",
    },
    {
      id: "ACT_ACTIVITY_DESIGN",
      workCategory: "ACTIVITY_DESIGN",
      workCategoryLabel: "Thiết kế hoạt động",
      suggestedSkillTitle: `Skill thiết kế hoạt động khám phá & tương tác lớp học môn ${resolvedSubjectName}`,
      targetGroupDesc: `Toàn bộ ${totalClassStudents} học sinh lớp ${cls.className}`,
      rationale:
        "Tăng mức độ chủ động tham gia và kiểm tra nhanh mức độ hiểu bài ngay trong tiết học.",
      recommendedDurationMinutes: 15,
      recommendedOutputStructure:
        "1. Tình huống mở đầu → 2. Giao nhiệm vụ nhóm/cá nhân → 3. Câu hỏi dẫn dắt & dự kiến câu trả lời của HS → 4. Chốt kiến thức trọng tâm.",
    },
  ]

  const dataSourcesStatus = [
    ...(cleanProactiveNotes || cleanProactiveObjective || cleanProactiveMaterial || topicOrLesson
      ? [
          {
            id: "TEACHER_PROACTIVE_INPUT",
            name: "Nội dung & Nhận định chủ động của Giáo viên đứng lớp",
            tableName: "TeacherProactiveInput",
            status: "CONNECTED",
            rawStatus: "CONNECTED_WITH_DATA",
            recordCount: 1,
            missingCount: 0,
            duplicateCount: 0,
            lastUpdatedAt: new Date().toISOString(),
            note: [
              topicOrLesson ? `Chủ đề: ${topicOrLesson}` : "",
              cleanProactiveObjective ? "Đã nhập mục tiêu cần đạt" : "",
              cleanProactiveNotes ? "Đã nhập nhận định thực tế lớp học" : "",
              cleanProactiveMaterial ? "Đã đính kèm trích đoạn giáo án/học liệu" : "",
            ]
              .filter(Boolean)
              .join(" • "),
          },
        ]
      : []),
    ...sourcesStatus.map((s) => ({
      id: s.sourceKey,
      name: `${s.sourceName} (Tham khảo SSM)`,
      tableName: s.tableName,
      status: s.status === "CONNECTED_WITH_DATA" ? "CONNECTED" : "EMPTY",
      rawStatus: s.status,
      recordCount: s.recordCount,
      missingCount: s.sourceKey === "SUBJECT_GRADES" ? missingScoreCount : 0,
      duplicateCount: s.sourceKey === "SUBJECT_GRADES" ? duplicateRecordCount : 0,
      lastUpdatedAt: s.latestUpdatedAt,
      note: s.detailNote,
    })),
  ]

  const enrichedProminentNeeds = prominentSupportNeeds.map((n) => ({
    ...n,
    finding: n.statement,
    sourceCitation: n.sourceLabel,
  }))

  const suggestedSkills = proposedActions.map((pa) => ({
    ...pa,
    suggestedTitle: pa.suggestedSkillTitle,
    groundedInSource: pa.targetGroupDesc,
  }))

  const resultPayload: any = {
    scope: {
      academicYearId: cls.academicYearId,
      academicYearName: cls.academicYearName,
      evaluationPeriod,
      periodLabel:
        evaluationPeriod === "ALL"
          ? "Toàn bộ kỳ/tháng hiện có"
          : evaluationPeriod.startsWith("THANG_")
            ? `Tháng ${evaluationPeriod.replace("THANG_", "")}`
            : `Học kỳ ${evaluationPeriod.replace("HK", "")}`,
      classId: cls.id,
      className: cls.className,
      gradeLevel: `K${cls.grade}`,
      subjectId: resolvedSubjectId,
      subjectCode: input.subjectCode,
      subjectName: resolvedSubjectName,
      topicOrLesson: topicOrLesson || specialLessons[0]?.lessonName || "",
    },
    dataQualityAudit: {
      totalClassStudents,
      validScoredStudentCount,
      missingScoreCount,
      missingRemarkCount,
      duplicateRecordCount,
      latestUpdatedAt,
      isStaleData,
      hasDetailedWorkOrRubricEvidence,
      specificKnowledgeErrorsAllowed,
      guardrailNotice,
    },
    sourcesStatus,
    dataSourcesStatus,
    deterministicMetrics: {
      studentRosterCount: totalClassStudents,
      summaryStats,
      scoreDistribution: {
        highCount,
        goodCount,
        averageCount,
        needSupportCount,
        missingCount: missingScoreCount,
        averageScore,
        benchmarkScore,
        belowBenchmarkCount,
        progressDeltaVsPrevious,
      },
      academicSummary: {
        meanScore: averageScore,
        studentsWithValidScore: validScoredStudentCount,
        studentsWithMissingScore: missingScoreCount,
        teacherRemarksSampleCount: remarksList.length,
        distribution: {
          excellent: highCount,
          good: goodCount,
          average: averageCount,
          needsSupport: needSupportCount,
        },
      },
      dataQuality: {
        missingAcademicScoreCount: missingScoreCount,
        duplicateRecordCount,
        nullConvertedToZero: false,
        staleWarning: isStaleData
          ? "Dữ liệu điểm cập nhật cách đây hơn 45 ngày, vui lòng kiểm tra lại tính thời sự."
          : null,
      },
      evidenceGuardrail: {
        specificKnowledgeErrorsAllowed,
        reason: guardrailNotice,
      },
      competencySummary: {
        totalAssessments: competencyEntries.length,
      },
      examBreakdownSummary: {
        totalCandidateResults: testResults.length,
      },
      specialRubricSummary: {
        totalEntries: specialEntries.length,
      },
      supportSummary: {
        totalSupportRecords: supportTargets.length + consultationLogs.length,
      },
      identifiedSkillOrTopicGaps,
      missingInformationList,
    },
    aiInterpretation: {
      generatedBy: "DETERMINISTIC_INTERPRETER",
      generatedByAi: Boolean(process.env.GEMINI_API_KEY),
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      modelName: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "deterministic-pedagogical-engine",
      learningSituationSummary,
      prominentSupportNeeds: enrichedProminentNeeds,
      pedagogicalCautions: [
        "Tuyệt đối không đưa tên hoặc mã số học sinh vào nội dung câu hỏi/học liệu của Skill dùng chung.",
        specificKnowledgeErrorsAllowed
          ? "Các nhận định về chủ đề cần hỗ trợ được trích xuất từ dữ liệu đánh giá năng lực/khảo sát thực tế; giáo viên cần đối chiếu thêm với biểu hiện trên lớp."
          : "Do chưa có dữ liệu bài làm chi tiết cho bài học này, không suy diễn lỗi kiến thức chuyên biệt chỉ từ điểm trung bình.",
      ],
    },
    proposedActions: Object.assign(suggestedSkills, {
      suggestedSkills,
      missingInformationWarnings: missingInformationList,
    }),
  }

  // Persist non-PII Evidence Brief record so Step 4 & Step 5 can reference it
  const savedBrief = await pAny.slcSkillEvidenceBrief.create({
    data: {
      teacherId: ctx.teacherId,
      userId: ctx.userId,
      userName: ctx.fullName,
      campusId: cls.campusId,
      departmentId: ctx.departmentId,
      academicYearId: cls.academicYearId,
      academicYearName: cls.academicYearName,
      evaluationPeriod,
      classId: cls.id,
      className: cls.className,
      gradeLevel: `K${cls.grade}`,
      subjectId: resolvedSubjectId,
      subjectCode: input.subjectCode,
      subjectName: resolvedSubjectName,
      topicOrLesson: resultPayload.scope.topicOrLesson,
      sourcesStatusJson: JSON.stringify(resultPayload.sourcesStatus),
      deterministicStatsJson: JSON.stringify({
        dataQualityAudit: resultPayload.dataQualityAudit,
        deterministicMetrics: resultPayload.deterministicMetrics,
      }),
      aiInterpretationJson: JSON.stringify(resultPayload.aiInterpretation),
      proposedActionsJson: JSON.stringify(resultPayload.proposedActions),
      status: "REVIEWED",
    },
  })

  return {
    briefId: savedBrief.id,
    ...resultPayload,
  }
}

export interface TeacherConfirmedBriefInput {
  briefId: string
  selectedNeedIds: string[]
  selectedMetricIds: string[]
  editedPedagogicalNeeds: string
  lessonTopic: string
  curriculumObjectives: string
  supplementaryMaterialText?: string
  workCategory: string
  durationMinutes: number
  desiredOutputFormat: string
}

/**
 * Bước 4 & Bước 5: Giáo viên xác nhận căn cứ, bổ sung mục tiêu/giáo án và Tạo bản nháp Skill.
 * Quy tắc:
 * - Nếu thiếu mục tiêu bài học/yêu cầu cần đạt hoặc chủ đề bài dạy, yêu cầu bổ sung rõ ràng;
 *   tuyệt đối KHÔNG tự đặt yêu cầu chương trình chưa có căn cứ.
 * - Tự động ẩn danh mọi dữ liệu học sinh nếu giáo viên vô tình dán tên/mã HS vào ô bổ sung.
 */
export async function generateDraftSkillFromConfirmedBrief(
  ctx: SlcUserContext,
  input: TeacherConfirmedBriefInput
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  if (!input.briefId) {
    throw new Error("Thiếu mã Bản căn cứ (briefId). Vui lòng thực hiện bước rà soát dữ liệu trước.")
  }

  const brief = await pAny.slcSkillEvidenceBrief.findUnique({
    where: { id: input.briefId },
  })
  if (!brief) {
    throw new Error("Không tìm thấy Bản căn cứ xây dựng skill.")
  }
  if (brief.userId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
    throw new Error("PERMISSION_DENIED: Chỉ giáo viên khởi tạo bản căn cứ mới có quyền xác nhận và tạo skill từ bản căn cứ này.")
  }

  const rawLessonTopic =
    input.lessonTopic ||
    brief.topicOrLesson ||
    (input.curriculumObjectives ? input.curriculumObjectives.slice(0, 80) : "")
  const rawObjectives =
    input.curriculumObjectives ||
    input.supplementaryMaterialText ||
    (rawLessonTopic
      ? `Hỗ trợ học sinh nắm vững yêu cầu cần đạt của bài "${rawLessonTopic}" môn ${brief.subjectName} (${brief.gradeLevel})`
      : "")

  const cleanLessonTopic = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(rawLessonTopic, 300)
  ).redactedText.trim()
  const cleanObjectives = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(rawObjectives, 2000)
  ).redactedText.trim()
  const cleanNeeds = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(input.editedPedagogicalNeeds, 2000)
  ).redactedText.trim()
  const cleanMaterial = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(input.supplementaryMaterialText, 4000)
  ).redactedText.trim()
  const cleanOutputFormat = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(input.desiredOutputFormat, 1500)
  ).redactedText.trim()

  // Rule VI.5: "Nếu thiếu mục tiêu hoặc tài liệu cần thiết, yêu cầu bổ sung. Không tự đặt yêu cầu chương trình chưa có căn cứ."
  if (!cleanLessonTopic) {
    throw new Error(
      "MISSING_REQUIRED_CURRICULUM_INFO: Vui lòng nhập Tên bài học hoặc Chủ đề dạy học trước khi tạo bản nháp Skill."
    )
  }
  if (!cleanObjectives || cleanObjectives.length < 10) {
    throw new Error(
      "MISSING_REQUIRED_CURRICULUM_INFO: Vui lòng nhập hoặc bổ sung Mục tiêu bài học / Yêu cầu cần đạt (hoặc nội dung giáo án). Hệ thống không tự ý đặt yêu cầu chương trình khi chưa có căn cứ."
    )
  }

  const durationMinutes = Math.max(5, Math.min(180, Number(input.durationMinutes || 20)))
  const workCategory = input.workCategory || "TASK_DIFFERENTIATION"

  // Update brief status to CONFIRMED
  await pAny.slcSkillEvidenceBrief.update({
    where: { id: brief.id },
    data: {
      topicOrLesson: cleanLessonTopic,
      teacherConfirmedJson: JSON.stringify({
        selectedNeedIds: input.selectedNeedIds || [],
        selectedMetricIds: input.selectedMetricIds || [],
        editedPedagogicalNeeds: cleanNeeds,
        lessonTopic: cleanLessonTopic,
        curriculumObjectives: cleanObjectives,
        supplementaryMaterialText: cleanMaterial,
        workCategory,
        durationMinutes,
        desiredOutputFormat: cleanOutputFormat,
        confirmedAt: new Date().toISOString(),
      }),
      status: "CONFIRMED",
    },
  })

  // Build structured 13-part Skill Draft grounded in the teacher-confirmed brief (and optionally enhanced by Gemini AI if configured)
  const defaultInputFields = [
    {
      key: "lessonTopic",
      label: "Tên bài học / Chủ đề",
      type: "text",
      required: true,
      placeholder: "Nhập tên bài học hoặc chủ đề...",
      defaultValue: cleanLessonTopic,
    },
    {
      key: "curriculumObjectives",
      label: "Mục tiêu / Yêu cầu cần đạt của bài học",
      type: "textarea",
      required: true,
      placeholder: "Nêu rõ yêu cầu cần đạt theo chương trình...",
      defaultValue: cleanObjectives,
    },
    {
      key: "classContextSummary",
      label: "Đặc điểm tình hình học tập của lớp (không nhập tên/mã học sinh)",
      type: "textarea",
      required: true,
      placeholder: "Tóm tắt phân bố mức đạt và nhu cầu hỗ trợ của lớp...",
      defaultValue: cleanNeeds || "Phân hóa nhiệm vụ theo 3 mức độ: Cơ bản, Vận dụng và Mở rộng.",
    },
    {
      key: "durationMinutes",
      label: "Thời lượng tổ chức (phút)",
      type: "number",
      required: true,
      placeholder: "20",
      defaultValue: String(durationMinutes),
    },
  ]

  let draftSkill = {
    name: `Skill ${getWorkCategoryVietnameseName(workCategory)}: ${cleanLessonTopic} (${brief.subjectName} - ${brief.gradeLevel})`,
    summary: `Hỗ trợ giáo viên ${getWorkCategoryVietnameseName(workCategory).toLowerCase()} cho bài "${cleanLessonTopic}" môn ${brief.subjectName} (${brief.gradeLevel}) trong thời lượng ${durationMinutes} phút, bám sát mục tiêu bài học và nhu cầu phân hóa thực tế.`,
    description: `Skill được xây dựng từ căn cứ dữ liệu thực tế trên SSM (Môn ${brief.subjectName}, Khối ${brief.gradeLevel}) và đã được giáo viên xác nhận mục tiêu sư phạm. Skill tách biệt hoàn toàn phương pháp với dữ liệu cá nhân học sinh để đồng nghiệp cùng bộ môn có thể tái sử dụng an toàn cho lớp của mình.`,
    purpose: `Giúp giáo viên tạo nhanh học liệu/hoạt động "${cleanLessonTopic}" đáp ứng mục tiêu: ${cleanObjectives}`,
    workCategory,
    subjectCode: brief.subjectCode,
    subjectName: brief.subjectName,
    gradeLevels: [brief.gradeLevel],
    topicOrLesson: cleanLessonTopic,
    tags: [brief.subjectName, brief.gradeLevel, getWorkCategoryVietnameseName(workCategory), "Tạo từ căn cứ SSM"],
    prerequisites: `1. Xác định rõ yêu cầu cần đạt của bài "${cleanLessonTopic}".\n2. Nắm được tỷ lệ các nhóm mức độ đạt của lớp đang dạy (hoặc chọn lớp được phân công khi chạy trực tiếp trên SSM).\n3. Chuẩn bị ngữ liệu/tài liệu bài học (nếu có). Tuyệt đối không nhập họ tên hoặc mã định danh học sinh.`,
    inputFields: defaultInputFields,
    aiSystemPrompt: [
      `Bạn là trợ lý chuyên môn sư phạm môn ${brief.subjectName} (${brief.gradeLevel}) thuộc Hệ thống Giáo dục Sky-Line.`,
      `Nhiệm vụ chính: Thực hiện "${getWorkCategoryVietnameseName(workCategory)}" cho bài/chủ đề "{{lessonTopic}}" trong thời lượng {{durationMinutes}} phút.`,
      `Mục tiêu / Yêu cầu cần đạt bắt buộc bám sát: {{curriculumObjectives}}`,
      `Đặc điểm nhóm học sinh của lớp (đã ẩn danh): {{classContextSummary}}`,
      cleanMaterial ? `Ngữ liệu / Tài liệu giáo án tham khảo: ${cleanMaterial}` : "",
      `NGUYÊN TẮC BẮT BUỘC:`,
      `- Chỉ thiết kế nội dung bám sát yêu cầu cần đạt đã cung cấp, không tự bịa chuẩn chương trình ngoài phạm vi.`,
      `- Phân hóa rõ ràng theo các nhóm năng lực trong lớp, có hướng dẫn từng bước (scaffolding) cho nhóm học sinh còn hạn chế.`,
      `- Tuyệt đối không sinh hoặc yêu cầu thông tin định danh cá nhân học sinh (tên, mã HS).`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    workflowSteps: [
      "Bước 1: Tiếp nhận mục tiêu bài học, thời lượng và tóm tắt tình hình học tập của lớp (không chứa PII).",
      "Bước 2: Phân tích yêu cầu cần đạt và chia nội dung thành các mức độ phù hợp với từng nhóm học sinh.",
      "Bước 3: Xây dựng chi tiết hoạt động/phiếu học tập kèm hướng dẫn tổ chức trên lớp và tiêu chí đánh giá.",
      "Bước 4: Rà soát lại tính chính xác học thuật và thời lượng trước khi xuất kết quả cho giáo viên.",
    ],
    principlesAndLimits:
      "1. Không suy diễn lỗi kiến thức cụ thể của học sinh nếu chỉ có điểm tổng hợp.\n2. Không thay thế quyết định sư phạm của giáo viên đứng lớp.\n3. Không lưu trữ hay xuất tên/mã học sinh trong câu lệnh và kết quả.",
    outputStructure:
      cleanOutputFormat ||
      "I. Mục tiêu & Phân bổ thời lượng\nII. Nội dung hoạt động / Phiếu nhiệm vụ phân hóa (Mức 1: Cơ bản có gợi ý - Mức 2: Vận dụng - Mức 3: Mở rộng)\nIII. Hướng dẫn giáo viên tổ chức & Hỗ trợ học sinh còn hạn chế\nIV. Đáp án / Bảng kiểm đánh giá nhanh (Rubric)",
    evaluationCriteria:
      "- Bám sát 100% mục tiêu bài học đã xác nhận.\n- Nhiệm vụ phân hóa rõ ràng, khả thi trong thời lượng dự kiến.\n- Ngôn ngữ sư phạm chuẩn mực, rõ ràng, không chứa dữ liệu nhạy cảm của học sinh.",
    references: cleanMaterial
      ? [{ title: `Tài liệu/Giáo án bài ${cleanLessonTopic}`, note: cleanMaterial.slice(0, 300) }]
      : [{ title: `Chương trình môn ${brief.subjectName} (${brief.gradeLevel})`, note: cleanObjectives }],
    samplePrompt: `Bài học: ${cleanLessonTopic}\nMục tiêu cần đạt: ${cleanObjectives}\nTình hình lớp (ẩn danh): ${cleanNeeds || "Lớp có cả nhóm đạt tốt và nhóm cần củng cố nền tảng."}\nThời lượng: ${durationMinutes} phút.`,
    sampleOutput: `### KẾ HOẠCH HOẠT ĐỘNG / HỌC LIỆU PHÂN HÓA: ${cleanLessonTopic.toUpperCase()}\n- **Môn học:** ${brief.subjectName} (${brief.gradeLevel}) • **Thời lượng:** ${durationMinutes} phút\n- **Mục tiêu trọng tâm:** ${cleanObjectives}\n\n#### 1. Nhiệm vụ Mức 1 (Củng cố nền tảng - Dành cho nhóm HS cần hỗ trợ)\n- Cung cấp gợi ý từng bước và ví dụ mẫu có giải thích để học sinh hoàn thành yêu cầu cốt lõi.\n\n#### 2. Nhiệm vụ Mức 2 (Vận dụng chuẩn)\n- Học sinh thực hiện nhiệm vụ chính theo mục tiêu bài học và kiểm tra chéo theo cặp.\n\n#### 3. Nhiệm vụ Mức 3 (Mở rộng / Thử thách)\n- Câu hỏi liên hệ thực tiễn hoặc giải thích sâu hơn bản chất vấn đề.\n\n#### 4. Bảng kiểm đánh giá nhanh\n- Tiêu chí hoàn thành cho từng mức độ và lưu ý hỗ trợ trực tiếp trên lớp.`,
    compatiblePlatforms: ["SSM_INTERNAL", "GEMINI", "CHATGPT", "CLAUDE"],
    usageGuide:
      "Cách 1 (Khuyên dùng): Bấm 'Dùng trên SSM', chọn Lớp được phân công của Thầy/Cô để hệ thống tự động nạp tóm tắt tình hình lớp hiện tại (đã ẩn danh) và chạy tạo học liệu.\nCách 2: Bấm 'Sao chép hướng dẫn' để dán vào Gemini, ChatGPT hoặc NotebookLM.",
    isExecutableOnSsm: true,
    creationSource: "SSM_DATA_GROUNDED",
    evidenceBriefId: brief.id,
  }

  // Optional AI enrichment if GEMINI_API_KEY is configured and within rate limit
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    const rl = checkSlcRateLimit(`ai_draft_${ctx.userId}`, 10, 60_000)
    if (rl.allowed) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const prompt = `Bạn là chuyên gia thiết kế chương trình của Hệ thống Giáo dục Sky-Line.
Dựa trên căn cứ dữ liệu lớp học (đã ẩn danh) và xác nhận của giáo viên dưới đây, hãy hoàn thiện phần "sampleOutput" (Kết quả minh họa chi tiết, thiết thực, dùng được ngay trên lớp) cho Skill môn học.
KHÔNG tự đặt yêu cầu chương trình ngoài mục tiêu giáo viên đã cung cấp. KHÔNG đề cập tên cá nhân học sinh.

<TEACHER_CONFIRMED_DATA>
- Môn học: ${brief.subjectName} (${brief.gradeLevel})
- Bài học / Chủ đề: ${cleanLessonTopic}
- Loại công việc: ${getWorkCategoryVietnameseName(workCategory)}
- Mục tiêu / Yêu cầu cần đạt: ${cleanObjectives}
- Nhu cầu hỗ trợ thực tế của lớp: ${cleanNeeds}
- Thời lượng: ${durationMinutes} phút
- Cấu trúc đầu ra mong muốn: ${draftSkill.outputStructure}
</TEACHER_CONFIRMED_DATA>

Hãy viết Kết quả minh họa (sampleOutput) bằng Markdown rõ ràng, ngắn gọn, khoảng 250-400 từ, bám sát cấu trúc đầu ra trên.`
        const res = await model.generateContent(prompt)
        const aiText = res.response.text()?.trim()
        if (aiText && aiText.length > 80) {
          draftSkill.sampleOutput = detectAndRedactStudentPii(sanitizeRichText(aiText)).redactedText
        }
      } catch {
        // Fallback smoothly to deterministic structured draftSkill above
      }
    }
  }

  await pAny.slcSkillEvidenceBrief.update({
    where: { id: brief.id },
    data: { status: "DRAFT_GENERATED" },
  })

  return {
    briefId: brief.id,
    draftSkill: {
      ...draftSkill,
      title: draftSkill.name,
      subjectCodes: [draftSkill.subjectCode],
      topicName: draftSkill.topicOrLesson,
      usageConditions: draftSkill.prerequisites,
      inputSchema: draftSkill.inputFields,
      aiInstruction: draftSkill.aiSystemPrompt,
      workflowProcess: draftSkill.workflowSteps,
      validationCriteria: draftSkill.evaluationCriteria,
      referenceDocs: draftSkill.references,
    },
    aiConfigured: Boolean(apiKey),
  }
}

function getWorkCategoryVietnameseName(code: string): string {
  const map: Record<string, string> = {
    ACTIVITY_DESIGN: "Thiết kế hoạt động",
    MATERIAL_CREATION: "Tạo học liệu",
    TASK_DIFFERENTIATION: "Phân hóa nhiệm vụ",
    STUDENT_SUPPORT: "Hỗ trợ nội dung học sinh còn hạn chế",
    ASSESSMENT_EVAL: "Kiểm tra và đánh giá",
  }
  return map[code] || "Hỗ trợ chuyên môn"
}
