import { prisma } from "@/lib/db"
import { ensureApiIntegrationTables } from "@/lib/api-auth"

/**
 * Xây dựng payload snapshot phẳng cho một Giáo viên
 */
export async function buildTeacherSnapshot(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      departmentRel: { select: { id: true, code: true, name: true } },
      mainSubjectRel: { select: { id: true, subjectCode: true, subjectName: true } },
      TeachingAssignment: {
        include: {
          class: { select: { id: true, className: true, grade: true } },
          subject: { select: { id: true, subjectCode: true, subjectName: true } },
          academicYear: { select: { id: true, name: true } },
        },
      },
      signatureProfile: {
        select: {
          provider: true,
          connectionStatus: true,
          validTo: true,
        },
      },
      academicYearTargets: {
        take: 1,
        select: {
          requiredObserved: true,
          requiredTaught: true,
          confirmed: true,
        },
      },
    },
  })

  if (!teacher) return null

  // Tổng hợp lịch phân công
  const assignments = ((teacher as any).TeachingAssignment || []).map((ta: any) => ({
    academicYear: ta.academicYear?.name || "",
    semester: ta.semester,
    classId: ta.classId,
    className: ta.class?.className || "",
    grade: ta.class?.grade || "",
    subjectId: ta.subjectId,
    subjectCode: ta.subject?.subjectCode || "",
    subjectName: ta.subject?.subjectName || "",
    role: "GVBM",
  }))

  const totalAssignments = assignments.length
  const classNames = Array.from(new Set(assignments.map((a: any) => a.className).filter(Boolean))).join(", ")

  let positionsArr: string[] = []
  try {
    if (teacher.positions) positionsArr = JSON.parse(teacher.positions)
  } catch {
    if (teacher.positions) positionsArr = [teacher.positions]
  }

  const sig = teacher.signatureProfile
  const qaTarget = teacher.academicYearTargets?.[0]

  return {
    id: `snap_tch_${teacher.id}`,
    teacherId: teacher.id,
    teacherCode: teacher.teacherCode,
    teacherName: teacher.teacherName,
    email: teacher.email,
    phone: teacher.phone,
    campusId: teacher.campusId,
    campusCode: teacher.campus?.campusCode || null,
    campusName: teacher.campus?.campusName || null,
    departmentId: teacher.departmentId,
    departmentCode: teacher.departmentRel?.code || null,
    departmentName: teacher.departmentRel?.name || null,
    position: teacher.position || "GV",
    positionsJson: JSON.stringify(positionsArr),
    mainSubjectId: teacher.mainSubjectId,
    mainSubjectCode: teacher.mainSubjectRel?.subjectCode || null,
    mainSubjectName: teacher.mainSubjectRel?.subjectName || null,
    homeroomClass: teacher.homeroomClass,
    status: teacher.status || "ACTIVE",
    assignmentsSummaryJson: JSON.stringify(assignments),
    totalPeriodsPerWeek: totalAssignments,
    classesTeachingList: classNames,
    digitalSignatureStatus: sig?.connectionStatus || "NOT_CONFIGURED",
    signatureProfileJson: JSON.stringify(sig || {}),
    qaObservedSummaryJson: JSON.stringify(qaTarget || {}),
  }
}

/**
 * Lưu hoặc cập nhật snapshot cho 1 giáo viên
 */
export async function upsertTeacherSnapshot(teacherId: string) {
  await ensureApiIntegrationTables()
  const payload = await buildTeacherSnapshot(teacherId)
  if (!payload) return null

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `
    INSERT INTO "api_snapshot_teachers" (
      "id", "teacherId", "teacherCode", "teacherName", "email", "phone",
      "campusId", "campusCode", "campusName", "departmentId", "departmentCode", "departmentName",
      "position", "positionsJson", "mainSubjectId", "mainSubjectCode", "mainSubjectName",
      "homeroomClass", "status", "assignmentsSummaryJson", "totalPeriodsPerWeek", "classesTeachingList",
      "digitalSignatureStatus", "signatureProfileJson", "qaObservedSummaryJson", "lastSyncedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT("teacherId") DO UPDATE SET
      "teacherCode" = excluded."teacherCode",
      "teacherName" = excluded."teacherName",
      "email" = excluded."email",
      "phone" = excluded."phone",
      "campusId" = excluded."campusId",
      "campusCode" = excluded."campusCode",
      "campusName" = excluded."campusName",
      "departmentId" = excluded."departmentId",
      "departmentCode" = excluded."departmentCode",
      "departmentName" = excluded."departmentName",
      "position" = excluded."position",
      "positionsJson" = excluded."positionsJson",
      "mainSubjectId" = excluded."mainSubjectId",
      "mainSubjectCode" = excluded."mainSubjectCode",
      "mainSubjectName" = excluded."mainSubjectName",
      "homeroomClass" = excluded."homeroomClass",
      "status" = excluded."status",
      "assignmentsSummaryJson" = excluded."assignmentsSummaryJson",
      "totalPeriodsPerWeek" = excluded."totalPeriodsPerWeek",
      "classesTeachingList" = excluded."classesTeachingList",
      "digitalSignatureStatus" = excluded."digitalSignatureStatus",
      "signatureProfileJson" = excluded."signatureProfileJson",
      "qaObservedSummaryJson" = excluded."qaObservedSummaryJson",
      "snapshotVersion" = "api_snapshot_teachers"."snapshotVersion" + 1,
      "lastSyncedAt" = CURRENT_TIMESTAMP
  `,
    payload.id,
    payload.teacherId,
    payload.teacherCode,
    payload.teacherName,
    payload.email,
    payload.phone,
    payload.campusId,
    payload.campusCode,
    payload.campusName,
    payload.departmentId,
    payload.departmentCode,
    payload.departmentName,
    payload.position,
    payload.positionsJson,
    payload.mainSubjectId,
    payload.mainSubjectCode,
    payload.mainSubjectName,
    payload.homeroomClass,
    payload.status,
    payload.assignmentsSummaryJson,
    payload.totalPeriodsPerWeek,
    payload.classesTeachingList,
    payload.digitalSignatureStatus,
    payload.signatureProfileJson,
    payload.qaObservedSummaryJson
  )

  return payload
}

/**
 * Xây dựng payload snapshot phẳng cho một Học sinh
 */
export async function buildStudentSnapshot(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      class: { select: { id: true, className: true, grade: true } },
      academicYear: { select: { id: true, name: true } },
      parents: {
        include: {
          parent: {
            select: {
              id: true,
              parentCode: true,
              parentName: true,
              phone: true,
              email: true,
              status: true,
            },
          },
        },
      },
      termSummaries: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      achievements: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          achievement: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
      },
    },
  })

  if (!student) return null

  // Danh sách phụ huynh
  const parentsList = (student.parents || [])
    .map((pLink: any) => {
      const p = pLink.parent
      if (!p) return null
      return {
        parentId: p.id,
        parentCode: p.parentCode,
        parentName: p.parentName,
        relationship: pLink.relationship || "Phụ huynh",
        phone: p.phone,
        email: p.email,
        status: p.status,
      }
    })
    .filter(Boolean)

  // Điểm tổng kết học kỳ gần nhất
  const latestSummary = (student as any).termSummaries?.[0]
  const termGradesSummary = latestSummary
    ? {
        semester: latestSummary.semester,
        gpa: latestSummary.gpa,
        academicRating: latestSummary.academicRating,
        conductRating: latestSummary.conductRating,
        reward: latestSummary.reward,
        absencesTotal: latestSummary.absencesTotal,
      }
    : {}

  // Danh sách thành tích
  const achievementsList = (student.achievements || [])
    .map((sa: any) => ({
      id: sa.achievement?.id || sa.id,
      title: sa.achievement?.name || "Khen thưởng",
      level: sa.achievement?.level || "",
      category: sa.achievement?.category || "",
    }))

  return {
    id: `snap_std_${student.id}`,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    englishName: student.englishName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    status: student.status || "ACTIVE",
    studentType: student.studentType || "CHINH_KHOA",
    campusId: student.campusId,
    campusCode: student.campus?.campusCode || null,
    campusName: student.campus?.campusName || null,
    classId: student.classId,
    className: student.class?.className || "",
    grade: student.class?.grade || "",
    academicYearId: student.academicYearId,
    academicYearName: student.academicYear?.name || "",
    homeroomTeacherName: null, // Có thể bổ sung từ bảng Class nếu có homeroomTeacher
    homeroomTeacherEmail: null,
    parentsContactJson: JSON.stringify(parentsList),
    termGradesSummaryJson: JSON.stringify(termGradesSummary),
    achievementsJson: JSON.stringify(achievementsList),
    hollandOrientationJson: "{}",
  }
}

/**
 * Lưu hoặc cập nhật snapshot cho 1 học sinh
 */
export async function upsertStudentSnapshot(studentId: string) {
  await ensureApiIntegrationTables()
  const payload = await buildStudentSnapshot(studentId)
  if (!payload) return null

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `
    INSERT INTO "api_snapshot_students" (
      "id", "studentId", "studentCode", "studentName", "englishName", "gender",
      "dateOfBirth", "status", "studentType", "campusId", "campusCode", "campusName",
      "classId", "className", "grade", "academicYearId", "academicYearName",
      "homeroomTeacherName", "homeroomTeacherEmail", "parentsContactJson",
      "termGradesSummaryJson", "achievementsJson", "hollandOrientationJson", "lastSyncedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT("studentCode") DO UPDATE SET
      "studentId" = excluded."studentId",
      "studentName" = excluded."studentName",
      "englishName" = excluded."englishName",
      "gender" = excluded."gender",
      "dateOfBirth" = excluded."dateOfBirth",
      "status" = excluded."status",
      "studentType" = excluded."studentType",
      "campusId" = excluded."campusId",
      "campusCode" = excluded."campusCode",
      "campusName" = excluded."campusName",
      "classId" = excluded."classId",
      "className" = excluded."className",
      "grade" = excluded."grade",
      "academicYearId" = excluded."academicYearId",
      "academicYearName" = excluded."academicYearName",
      "homeroomTeacherName" = excluded."homeroomTeacherName",
      "homeroomTeacherEmail" = excluded."homeroomTeacherEmail",
      "parentsContactJson" = excluded."parentsContactJson",
      "termGradesSummaryJson" = excluded."termGradesSummaryJson",
      "achievementsJson" = excluded."achievementsJson",
      "hollandOrientationJson" = excluded."hollandOrientationJson",
      "snapshotVersion" = "api_snapshot_students"."snapshotVersion" + 1,
      "lastSyncedAt" = CURRENT_TIMESTAMP
  `,
    payload.id,
    payload.studentId,
    payload.studentCode,
    payload.studentName,
    payload.englishName,
    payload.gender,
    payload.dateOfBirth ? payload.dateOfBirth.toISOString() : null,
    payload.status,
    payload.studentType,
    payload.campusId,
    payload.campusCode,
    payload.campusName,
    payload.classId,
    payload.className,
    payload.grade,
    payload.academicYearId,
    payload.academicYearName,
    payload.homeroomTeacherName,
    payload.homeroomTeacherEmail,
    payload.parentsContactJson,
    payload.termGradesSummaryJson,
    payload.achievementsJson,
    payload.hollandOrientationJson
  )

  return payload
}

/**
 * Đồng bộ toàn bộ giáo viên vào bảng snapshot
 */
export async function syncAllTeachers(campusId?: string) {
  await ensureApiIntegrationTables()
  const where: any = {}
  if (campusId) where.campusId = campusId

  const teachers = await prisma.teacher.findMany({
    where,
    select: { id: true },
  })

  let count = 0
  for (const t of teachers) {
    await upsertTeacherSnapshot(t.id)
    count++
  }
  return { syncedCount: count }
}

/**
 * Đồng bộ toàn bộ học sinh vào bảng snapshot
 */
export async function syncAllStudents(classId?: string, campusId?: string) {
  await ensureApiIntegrationTables()
  const where: any = {}
  if (classId) where.classId = classId
  if (campusId) where.campusId = campusId

  const students = await prisma.student.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: "asc" },
  })

  let count = 0
  for (const s of students) {
    await upsertStudentSnapshot(s.id)
    count++
  }

  // Lấy tổng số học sinh duy nhất đã được đồng bộ vào bảng snapshot
  const pAny = prisma as any
  try {
    const countRes: any[] = await pAny.$queryRawUnsafe(`SELECT COUNT(*) as total FROM "api_snapshot_students"`)
    return { syncedCount: Number(countRes[0]?.total || count) }
  } catch {
    return { syncedCount: count }
  }
}
