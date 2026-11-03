import { prisma } from "@/lib/db"
import { getRoleReadableModules } from "@/lib/permissions"
import { UnifiedTeacherAssignmentProfile } from "./types"

const SPECIAL_SUBJECT_NAMES: Record<string, string> = {
  CXXH: "Giáo dục Cảm xúc - Xã hội (SEL)",
  GDGT: "Giáo dục giới tính",
  FIN_EDU: "Giáo dục tài chính cá nhân",
  GDHN: "Giáo dục hướng nghiệp",
}

/**
 * Assignment Mapping Service
 * Tự động nhận diện và hợp nhất toàn bộ vai trò, lớp chủ nhiệm, lớp giảng dạy (MOET, CTQT, Môn đặc thù),
 * khảo sát đầu vào, phụ đạo và vai trò quản lý (TTCM/TBP/GDCS) của một giáo viên trên nhiều cơ sở.
 * Bảo đảm chống trùng lặp (Deduplication) tuyệt đối theo khóa phức hợp.
 */
export async function resolveTeacherAssignmentProfile(
  userOrTeacherId: string,
  requestedAcademicYearId?: string
): Promise<UnifiedTeacherAssignmentProfile | null> {
  if (!userOrTeacherId) return null

  // 1. Tìm User và Teacher tương ứng
  let user: any = await prisma.user
    .findUnique({
      where: { id: userOrTeacherId },
      include: {
        campusAssignments: { include: { campus: true } },
        teacher: {
          include: {
            campus: true,
            departmentRel: true,
            departmentAssignments: { include: { department: true } },
            divisionAssignments: true,
          },
        },
      },
    })
    .catch(() => null)

  let teacher: any = user?.teacher || null

  if (!teacher) {
    const emailCandidate = user?.email ? String(user.email).trim() : ""
    const codeFromEmail = emailCandidate.includes("@")
      ? emailCandidate.split("@")[0]
      : emailCandidate

    const orFilters: any[] = [
      { id: userOrTeacherId },
      { userId: userOrTeacherId },
      { teacherCode: userOrTeacherId },
    ]
    if (emailCandidate) {
      orFilters.push({ email: emailCandidate })
      orFilters.push({ teacherCode: emailCandidate })
    }
    if (codeFromEmail) {
      orFilters.push({ teacherCode: codeFromEmail })
    }
    if (user?.fullName) {
      orFilters.push({ teacherName: user.fullName })
    }

    teacher = await prisma.teacher
      .findFirst({
        where: { OR: orFilters },
        include: {
          campus: true,
          departmentRel: true,
          departmentAssignments: { include: { department: true } },
          divisionAssignments: true,
        },
      })
      .catch(() => null)

    if (teacher?.userId && !user) {
      user = await prisma.user
        .findUnique({
          where: { id: teacher.userId },
          include: {
            campusAssignments: { include: { campus: true } },
          },
        })
        .catch(() => null)
    }
  }

  if (!user && !teacher) {
    return null
  }

  const effectiveUserId = user?.id || teacher?.userId || userOrTeacherId
  const effectiveTeacherId = teacher?.id || null

  // 2. Xác định Năm học hiệu lực (tương thích chuẩn AcademicYear.status="ACTIVE" & unit test mocks)
  let academicYear: any =
    requestedAcademicYearId && requestedAcademicYearId !== "ALL"
      ? await prisma.academicYear
          .findUnique({ where: { id: requestedAcademicYearId } })
          .catch(() => null)
      : null

  if (!academicYear) {
    academicYear = await prisma.academicYear
      .findFirst({
        where: { status: "ACTIVE", isOff: false },
        orderBy: { startDate: "desc" },
      })
      .catch(() => null)
  }

  if (!academicYear) {
    academicYear = await prisma.academicYear
      .findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      })
      .catch(() => null)
  }

  if (!academicYear) {
    academicYear = await prisma.academicYear
      .findFirst({
        orderBy: { startDate: "desc" },
      })
      .catch(() => null)
  }

  const academicYearId = academicYear?.id || "default-year"
  const academicYearName = academicYear?.name || academicYear?.yearName || "2026-2027"

  // 3. Tập hợp Cơ sở (Campuses) không trùng lặp
  const campusMap = new Map<
    string,
    { id: string; campusCode: string; campusName: string; isPrimary: boolean }
  >()

  if (teacher?.campus) {
    campusMap.set(teacher.campus.id, {
      id: teacher.campus.id,
      campusCode: teacher.campus.campusCode,
      campusName: teacher.campus.campusName,
      isPrimary: true,
    })
  }
  if (user?.campus && !campusMap.has(user.campus.id)) {
    campusMap.set(user.campus.id, {
      id: user.campus.id,
      campusCode: user.campus.campusCode,
      campusName: user.campus.campusName,
      isPrimary: campusMap.size === 0,
    })
  }
  if (user?.campusAssignments) {
    for (const ca of user.campusAssignments) {
      if (ca.campus && !campusMap.has(ca.campus.id)) {
        campusMap.set(ca.campus.id, {
          id: ca.campus.id,
          campusCode: ca.campus.campusCode,
          campusName: ca.campus.campusName,
          isPrimary: Boolean(ca.isPrimary && campusMap.size === 0),
        })
      }
    }
  }

  // 4. Hợp nhất Lớp Chủ Nhiệm (hỗ trợ homeroomTeacherId, teacherCode, TeacherClassAssignment & homeroomClass)
  const homeroomClassMap = new Map<
    string,
    {
      id: string
      classCode: string
      className: string
      grade: string
      level: string
      campusId: string
      campusName: string
      educationSystem: string
      studentCount: number
    }
  >()

  if (effectiveTeacherId) {
    const homeroomNameCandidates = (teacher?.homeroomClass || "")
      .split(/[,;|]/)
      .map((s: string) => s.trim())
      .filter(Boolean)

    const teacherCode = teacher?.teacherCode ? String(teacher.teacherCode).trim() : ""

    const classOrConditions: any[] = [
      { homeroomTeacherId: effectiveTeacherId },
      { homeroomTeacherId: { contains: effectiveTeacherId } },
    ]
    if (teacherCode) {
      classOrConditions.push({ homeroomTeacherId: teacherCode })
      classOrConditions.push({ homeroomTeacherId: { contains: teacherCode } })
    }
    if (homeroomNameCandidates.length > 0) {
      classOrConditions.push({ className: { in: homeroomNameCandidates } })
      classOrConditions.push({ classCode: { in: homeroomNameCandidates } })
    }

    const [directHomeroomClasses, classRoleAssignments] = await Promise.all([
      prisma.class
        .findMany({
          where: {
            status: "ACTIVE",
            ...(academicYearId !== "default-year" ? { academicYearId } : {}),
            OR: classOrConditions,
          },
          include: {
            campus: true,
            _count: {
              select: { students: { where: { status: "ACTIVE" } } },
            },
          },
        })
        .catch(() => []),

      prisma.teacherClassAssignment
        .findMany({
          where: {
            teacherId: effectiveTeacherId,
          },
          include: {
            class: {
              include: {
                campus: true,
                _count: {
                  select: { students: { where: { status: "ACTIVE" } } },
                },
              },
            },
          },
        })
        .catch(() => []),
    ])

    // Fallback nếu năm học được chọn chưa gán academicYearId trên Class
    let effectiveDirectClasses = directHomeroomClasses
    if (effectiveDirectClasses.length === 0 && academicYearId !== "default-year") {
      effectiveDirectClasses = await prisma.class
        .findMany({
          where: {
            status: "ACTIVE",
            OR: classOrConditions,
          },
          include: {
            campus: true,
            _count: {
              select: { students: { where: { status: "ACTIVE" } } },
            },
          },
        })
        .catch(() => [])
    }

    for (const cls of effectiveDirectClasses) {
      if (cls.homeroomTeacherId && cls.homeroomTeacherId.includes(",")) {
        const ids = cls.homeroomTeacherId.split(",").map((s: string) => s.trim())
        const nameMatch =
          homeroomNameCandidates.includes(cls.className) ||
          homeroomNameCandidates.includes(cls.classCode)
        if (
          !ids.includes(effectiveTeacherId) &&
          (!teacherCode || !ids.includes(teacherCode)) &&
          !nameMatch
        ) {
          continue
        }
      }

      homeroomClassMap.set(cls.id, {
        id: cls.id,
        classCode: cls.classCode,
        className: cls.className,
        grade: cls.grade,
        level: cls.level,
        campusId: cls.campusId,
        campusName: cls.campus?.campusName || "Sky-Line",
        educationSystem: cls.educationSystem || "CHAT_LUONG_CAO",
        studentCount: cls._count?.students ?? 0,
      })

      if (cls.campus && !campusMap.has(cls.campus.id)) {
        campusMap.set(cls.campus.id, {
          id: cls.campus.id,
          campusCode: cls.campus.campusCode,
          campusName: cls.campus.campusName,
          isPrimary: false,
        })
      }
    }

    for (const tca of classRoleAssignments) {
      const roleUpper = (tca.roleInClass || "").toUpperCase()
      const isHomeroomRole =
        roleUpper.includes("GVCN") ||
        roleUpper.includes("CHU_NHIEM") ||
        roleUpper.includes("CHỦ NHIỆM") ||
        roleUpper.includes("HOMEROOM")
      if (isHomeroomRole && tca.class && !homeroomClassMap.has(tca.class.id)) {
        homeroomClassMap.set(tca.class.id, {
          id: tca.class.id,
          classCode: tca.class.classCode,
          className: tca.class.className,
          grade: tca.class.grade,
          level: tca.class.level,
          campusId: tca.class.campusId,
          campusName: tca.class.campus?.campusName || "Sky-Line",
          educationSystem: tca.class.educationSystem || "CHAT_LUONG_CAO",
          studentCount: tca.class._count?.students ?? 0,
        })
      }
    }
  }

  // 5. Hợp nhất Phân công Giảng dạy Chương trình Việt Nam / MOET (TeachingAssignment)
  const teachingMap = new Map<
    string,
    {
      assignmentId: string
      classId: string
      className: string
      classCode: string
      grade: string
      campusId: string
      campusName: string
      subjectId: string
      subjectCode: string
      subjectName: string
      periodsPerWeek: number
    }
  >()

  // 6. Hợp nhất Phân công CTQT (CtqtTeachingAssignment - chính thức hoặc ủy quyền)
  const ctqtMap = new Map<
    string,
    {
      assignmentId: string
      classId: string
      className: string
      grade: string
      campusId: string
      campusName: string
      subjectId: string
      subjectCode: string
      subjectName: string
      isDelegated: boolean
    }
  >()

  // 7. Hợp nhất Phân công Môn Đặc Thù (SpecialTeachingAssignment)
  const specialMap = new Map<
    string,
    {
      assignmentId: string
      subjectCode: string
      subjectName: string
      grade: string
      classId: string | null
      className: string | null
      campusId: string | null
      campusName: string | null
      educationSystem: string
    }
  >()

  let learningSupportCount = 0

  if (effectiveTeacherId) {
    const [moetAssignments, ctqtAssignments, specialAssignments, supportCount] = await Promise.all([
      prisma.teachingAssignment
        .findMany({
          where: {
            teacherId: effectiveTeacherId,
            ...(academicYearId !== "default-year" ? { academicYearId } : {}),
          },
          include: {
            class: { include: { campus: true } },
            subject: true,
          },
        })
        .catch(() => []),

      prisma.ctqtTeachingAssignment
        .findMany({
          where: {
            OR: [
              { primaryTeacherId: effectiveTeacherId },
              { delegatedTeacherId: effectiveTeacherId },
            ],
          },
          include: {
            class: { include: { campus: true } },
          },
        })
        .catch(() => []),

      prisma.specialTeachingAssignment
        .findMany({
          where: {
            teacherId: effectiveTeacherId,
            status: "ACTIVE",
          },
          include: {
            class: { include: { campus: true } },
            subject: true,
          },
        })
        .catch(() => []),

      prisma.learningSupportAssignment
        .count({
          where: { teacherId: effectiveTeacherId },
        })
        .catch(() => 0),
    ])

    learningSupportCount = supportCount

    for (const a of moetAssignments) {
      if (!a.class || !a.subject) continue
      const subjAny = a.subject as any
      const aAny = a as any
      const subjectCode = subjAny.subjectCode || subjAny.code || a.subjectId
      const subjectName = subjAny.subjectName || subjAny.name || subjectCode
      const key = `${a.classId}::${a.subjectId}`
      if (!teachingMap.has(key)) {
        teachingMap.set(key, {
          assignmentId: a.id,
          classId: a.classId,
          className: a.class.className,
          classCode: a.class.classCode,
          grade: a.class.grade,
          campusId: a.class.campusId,
          campusName: a.class.campus?.campusName || "Sky-Line",
          subjectId: a.subjectId,
          subjectCode,
          subjectName,
          periodsPerWeek: aAny.periodsPerWeek || 0,
        })
      }
      if (a.class.campus && !campusMap.has(a.class.campus.id)) {
        campusMap.set(a.class.campus.id, {
          id: a.class.campus.id,
          campusCode: a.class.campus.campusCode,
          campusName: a.class.campus.campusName,
          isPrimary: false,
        })
      }
    }

    for (const c of ctqtAssignments) {
      const cAny = c as any
      if (!c.class) continue
      const subjId = cAny.subjectId || c.subjectCode
      const subjCode = c.subjectCode || cAny.subject?.code || cAny.subject?.subjectCode || subjId
      const subjName =
        cAny.subject?.name || cAny.subject?.subjectName || c.subjectCode || "Môn CTQT"
      const primaryId = c.primaryTeacherId || cAny.teacherId
      const key = `${c.classId}::${subjId}`
      if (!ctqtMap.has(key)) {
        ctqtMap.set(key, {
          assignmentId: c.id,
          classId: c.classId,
          className: c.class.className,
          grade: c.class.grade,
          campusId: c.class.campusId,
          campusName: c.class.campus?.campusName || "Sky-Line",
          subjectId: subjId,
          subjectCode: subjCode,
          subjectName: subjName,
          isDelegated:
            c.delegatedTeacherId === effectiveTeacherId && primaryId !== effectiveTeacherId,
        })
      }
    }

    for (const s of specialAssignments) {
      const sAny = s as any
      const rawCode =
        sAny.subject?.code ||
        sAny.subjectCode ||
        (s.subjectId ? s.subjectId.replace(/^spec_sub_/i, "").toUpperCase() : "MON_DAC_THU")
      const resolvedSubjectName =
        sAny.subject?.name || SPECIAL_SUBJECT_NAMES[rawCode] || rawCode
      const resolvedGrade = s.class?.grade || sAny.grade || ""
      const resolvedCampusId = s.class?.campusId || sAny.campusId || null
      const resolvedCampusName =
        s.class?.campus?.campusName || sAny.campus?.campusName || null
      const resolvedEduSystem = s.class?.educationSystem || sAny.educationSystem || "ALL"

      const key = `${rawCode}::${resolvedGrade}::${s.classId || "ALL"}::${resolvedCampusId || "ALL"}::${resolvedEduSystem}`
      if (!specialMap.has(key)) {
        specialMap.set(key, {
          assignmentId: s.id,
          subjectCode: rawCode,
          subjectName: resolvedSubjectName,
          grade: resolvedGrade,
          classId: s.classId || null,
          className: s.class?.className || null,
          campusId: resolvedCampusId,
          campusName: resolvedCampusName,
          educationSystem: resolvedEduSystem,
        })
      }
    }
  }

  // 8. Kiểm tra phân công Khảo sát định hướng đầu vào (liên kết qua userId & teacherId)
  const [
    generalInputCount,
    preschoolInputCount,
    generalExaminerCount,
    preschoolExaminerCount,
    orientationCount,
  ] = await Promise.all([
    prisma.inputAssessmentTeacherAssignment
      .count({
        where: { userId: effectiveUserId },
      })
      .catch(() => 0),

    prisma.preschoolInputAssessmentTeacherAssignment
      .count({
        where: {
          OR: [{ userId: effectiveUserId }, { delegatedUserId: effectiveUserId }],
        },
      })
      .catch(() => 0),

    prisma.inputAssessmentSessionExaminer
      .count({
        where: { userId: effectiveUserId },
      })
      .catch(() => 0),

    prisma.preschoolInputAssessmentSessionExaminer
      .count({
        where: { userId: effectiveUserId },
      })
      .catch(() => 0),

    prisma.studentOrientationRecord
      .count({
        where: {
          OR: [
            { interviewerId: effectiveUserId },
            { psychologyTeacherId: effectiveUserId },
            ...(effectiveTeacherId
              ? [{ interviewerId: effectiveTeacherId }, { psychologyTeacherId: effectiveTeacherId }]
              : []),
          ],
        },
      })
      .catch(() => 0),
  ])

  // 9. Nhận diện vai trò Quản lý (TTCM, TBP, GDCS, QLCM)
  const managedDepartmentMap = new Map<string, string>()
  if (effectiveTeacherId) {
    for (const da of teacher?.departmentAssignments || []) {
      const r = (da.role || da.position || "").toUpperCase()
      const deptName = da.department?.departmentName || da.department?.name
      if (
        (r.includes("TTCM") ||
          r.includes("TPCM") ||
          r.includes("TO_TRUONG") ||
          r.includes("QLCM") ||
          r.includes("HEAD")) &&
        da.department &&
        deptName
      ) {
        managedDepartmentMap.set(da.department.id, deptName)
      }
    }
    if (
      managedDepartmentMap.size === 0 &&
      teacher?.departmentRel &&
      (String(teacher?.position || "").toUpperCase().includes("TTCM") ||
        String(teacher?.position || "").toUpperCase().includes("QLCM"))
    ) {
      managedDepartmentMap.set(
        teacher.departmentRel.id,
        teacher.departmentRel.name || "Tổ chuyên môn"
      )
    }
  }

  let parsedPositions: string[] = []
  if (teacher?.positions) {
    try {
      const parsed = JSON.parse(teacher.positions)
      if (Array.isArray(parsed)) {
        parsedPositions = parsed.map((p) => String(p).trim()).filter(Boolean)
      } else {
        parsedPositions = String(teacher.positions)
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean)
      }
    } catch {
      parsedPositions = String(teacher.positions)
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
    }
  }

  const rawPositions = [
    teacher?.position || "",
    ...parsedPositions,
    user?.role || "",
  ].filter(Boolean)
  const uniquePositions = Array.from(new Set(rawPositions))
  const upperPosJoined = uniquePositions.join(" ").toUpperCase()

  const isTTCM =
    managedDepartmentMap.size > 0 ||
    upperPosJoined.includes("TTCM") ||
    upperPosJoined.includes("TPCM") ||
    upperPosJoined.includes("QLCM") ||
    upperPosJoined.includes("TỔ TRƯỞNG") ||
    upperPosJoined.includes("TO_TRUONG")

  const isTBP =
    (teacher?.divisionAssignments && teacher.divisionAssignments.length > 0) ||
    upperPosJoined.includes("TBP") ||
    upperPosJoined.includes("TRƯỞNG BỘ PHẬN") ||
    upperPosJoined.includes("TRUONG_BO_PHAN")

  const isGDCS =
    upperPosJoined.includes("GDCS") ||
    upperPosJoined.includes("GĐCS") ||
    upperPosJoined.includes("GIÁM ĐỐC CƠ SỞ") ||
    upperPosJoined.includes("BGH") ||
    upperPosJoined.includes("ADMIN") ||
    upperPosJoined.includes("KT_DBCL")

  const totalInputTasks =
    generalInputCount +
    preschoolInputCount +
    generalExaminerCount +
    preschoolExaminerCount +
    orientationCount

  const blockCMClean = (teacher?.departmentRel?.blockCM || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const deptNameClean = (teacher?.departmentRel?.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const normRoleCode = String(user?.role || "TEACHER").toUpperCase().trim()

  const isPreschoolTeacher =
    ["GV_MN", "BGH_MN", "MN", "MAM_NON", "BGH MAM NON", "BGH_MAM_NON"].includes(normRoleCode) ||
    blockCMClean.includes("mam non") ||
    deptNameClean.includes("mam non")

  const isForeignTeacher =
    normRoleCode.includes("GVNN") ||
    normRoleCode.includes("FOREIGN") ||
    upperPosJoined.includes("GVNN")

  const NON_CHUC_VU = [
    "",
    "gv",
    "gvbm",
    "gvcn",
    "giáo viên",
    "giao vien",
    "giáo viên bộ môn",
    "giáo viên chủ nhiệm",
    "teacher",
    "homeroom teacher",
  ]
  const LEADERSHIP_ROLES = [
    "ADMIN",
    "SUPER_ADMIN",
    "ADMINISTRATOR",
    "TTCM",
    "TPCM",
    "TO_TRUONG",
    "TO_PHO",
    "TBP",
    "TRUONG_BO_PHAN",
    "PHO_BO_PHAN",
    "GDCS",
    "GĐCS",
    "GD_CS",
    "GĐ_CS",
    "GIAM_DOC_CO_SO",
    "BAN_DHCM",
    "TB_DHCM",
    "QLCM",
    "BGH",
    "BGH_MN",
    "KT_DBCL",
    "NHOM_TRUONG",
    "NHOM_TRUONG_CM",
  ]

  const hasLeadershipPosition =
    isTTCM ||
    isTBP ||
    isGDCS ||
    LEADERSHIP_ROLES.includes(normRoleCode) ||
    Boolean(teacher?.position && !NON_CHUC_VU.includes(String(teacher.position).toLowerCase().trim())) ||
    Boolean(
      teacher?.departmentAssignments?.some(
        (da: any) => da.position && !NON_CHUC_VU.includes(String(da.position).toLowerCase().trim())
      )
    ) ||
    Boolean(teacher?.divisionAssignments && teacher.divisionAssignments.length > 0)

  const readableModules = await getRoleReadableModules(user?.role || "TEACHER").catch(() => [])

  return {
    userId: effectiveUserId,
    teacherId: effectiveTeacherId,
    teacherCode: teacher?.teacherCode || null,
    teacherName: teacher?.teacherName || user?.fullName || user?.name || "Giáo viên Sky-Line",
    email: teacher?.email || user?.email || null,
    systemRole: user?.role || "TEACHER",
    positions: uniquePositions,
    academicYearId,
    academicYearName,
    campuses: Array.from(campusMap.values()),
    rolesDetected: {
      isGVCN: homeroomClassMap.size > 0 || upperPosJoined.includes("GVCN"),
      isGVBM: teachingMap.size > 0 || upperPosJoined.includes("GVBM"),
      isGVMonDacThu: specialMap.size > 0,
      isGVCTQT: ctqtMap.size > 0,
      isGVKhachMoiKhaoSat: totalInputTasks > 0,
      isGVPhuDao: learningSupportCount > 0,
      isTTCM,
      isTBP,
      isGDCS,
      isPreschoolTeacher,
      isForeignTeacher,
      hasLeadershipPosition,
    },
    readableModules,
    homeroomClasses: Array.from(homeroomClassMap.values()),
    teachingAssignments: Array.from(teachingMap.values()),
    ctqtAssignments: Array.from(ctqtMap.values()),
    specialAssignments: Array.from(specialMap.values()),
    inputAssessmentAssignments: {
      generalCount: generalInputCount,
      preschoolCount: preschoolInputCount,
      examinerSessionsCount: generalExaminerCount + preschoolExaminerCount,
      orientationRecordsCount: orientationCount,
    },
    managedDepartmentIds: Array.from(managedDepartmentMap.keys()),
    managedDepartmentNames: Array.from(managedDepartmentMap.values()),
  }
}
