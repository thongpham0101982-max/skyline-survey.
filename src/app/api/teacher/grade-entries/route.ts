// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để truy cập sổ điểm" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const subjectId = searchParams.get("subjectId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"

    let teacher = null
    let userId = (session?.user as any)?.id
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
    }

    const isManage = searchParams.get("isManage") === "true" || searchParams.get("role") === "admin"
    const userRole = ((session?.user as any)?.role || "").toUpperCase().trim()
    const isPrivileged = isManage || ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "BAN_GIAM_HIEU", "BGH", "CM", "TO_TRUONG"].includes(userRole) || (userRole && userRole !== "TEACHER")

    // Action 1: Get list of assigned classes & subjects for teacher
    if (action === "getAssignments") {
      let teachingAssignments: any[] = []
      let availableClasses: any[] = []
      let availableSubjects: any[] = []

      if (teacher) {
        teachingAssignments = await prisma.teachingAssignment.findMany({
          where: academicYearId ? { teacherId: teacher.id, academicYearId } : { teacherId: teacher.id },
          include: { class: true, subject: true }
        })
      }

      if (teachingAssignments.length > 0) {
        const classMap = new Map()
        const subjectMap = new Map()
        teachingAssignments.forEach(ta => {
          if (ta.class) classMap.set(ta.class.id, ta.class)
          if (ta.subject) subjectMap.set(ta.subject.id, ta.subject)
        })
        availableClasses = Array.from(classMap.values())
        availableSubjects = Array.from(subjectMap.values())
      }

      // If privileged user has no personal teaching assignments, load all active classes and subjects
      if (isPrivileged && availableClasses.length === 0) {
        availableClasses = await prisma.class.findMany({
          where: academicYearId ? { academicYearId, status: "ACTIVE" } : { status: "ACTIVE" },
          orderBy: { className: "asc" }
        })
        availableSubjects = await prisma.subject.findMany({
          where: { status: "ACTIVE" },
          orderBy: { subjectName: "asc" }
        })
      }

      return NextResponse.json({
        success: true,
        assignments: teachingAssignments,
        classes: availableClasses,
        subjects: availableSubjects
      })
    }

    // Action 2: Get grade entries for specific classId + subjectId + evaluationPeriod
    if (!classId || !subjectId) {
      return NextResponse.json({ success: true, students: [], config: null, entries: [] })
    }

    // Verify teacher assignment for this class & subject ONLY IF user is strictly a regular teacher and NOT in management mode
    if (teacher && !isPrivileged && userRole === "TEACHER") {
      const isAssigned = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId,
          subjectId,
          ...(academicYearId ? { academicYearId } : {})
        }
      })
      if (!isAssigned) {
        return NextResponse.json({ success: true, students: [], config: null, entries: [], unassigned: true })
      }
    }

    const targetClass = await prisma.class.findUnique({ where: { id: classId } })
    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Lớp học không tồn tại" }, { status: 404 })
    }

    const classGrade = targetClass.grade || targetClass.className || "ALL"
    const targetAcademicYearId = academicYearId || targetClass.academicYearId

    // Extract normalized grade numbers for accurate matching
    let rawGrade = (targetClass.grade || "").trim()
    if (!rawGrade && targetClass.className) {
      const match = targetClass.className.match(/^(\d+)/)
      if (match) rawGrade = match[1]
    }
    const numMatch = rawGrade.match(/(\d+)/)
    const gradeNum = numMatch ? numMatch[1] : ""
    const candidateGrades = Array.from(new Set([
      rawGrade,
      `Khối ${gradeNum}`,
      `Khoi ${gradeNum}`,
      gradeNum,
      "ALL"
    ].filter(Boolean)))

    // Fetch evaluation configs, students, teaching assignment, homeroom teacher, and lock concurrently
    const [configs, students, assignment, clsObj, lock] = await Promise.all([
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: [evaluationPeriod, "ALL"] },
          subjectId,
          grade: { in: candidateGrades }
        }
      }),
      prisma.student.findMany({
        where: {
          classId,
          status: "ACTIVE"
        },
        orderBy: { studentName: "asc" },
        select: { id: true, studentCode: true, studentName: true, gender: true, dateOfBirth: true }
      }),
      prisma.teachingAssignment.findFirst({
        where: {
          classId,
          subjectId,
          academicYearId: targetAcademicYearId
        },
        include: { teacher: true }
      }),
      prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true }
      }),
      prisma.gradebookLock.findFirst({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod,
          OR: [
            { classId, subjectId },
            { classId: "ALL", subjectId: "ALL" }
          ],
          isLocked: true
        }
      })
    ])

    let config = configs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === evaluationPeriod)
      || configs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === "ALL")
      || configs.find(c => c.grade === "ALL" && c.evaluationPeriod === evaluationPeriod)
      || configs.find(c => c.grade === "ALL" && c.evaluationPeriod === "ALL")
      || configs[0] || null

    if (!config) {
      const generalConfigs = await prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: [evaluationPeriod, "ALL"] },
          subjectId: null,
          grade: { in: candidateGrades }
        }
      })
      config = generalConfigs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === evaluationPeriod)
        || generalConfigs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === "ALL")
        || generalConfigs.find(c => c.grade === "ALL" && c.evaluationPeriod === evaluationPeriod)
        || generalConfigs.find(c => c.grade === "ALL" && c.evaluationPeriod === "ALL")
        || generalConfigs[0] || null
    }

    let assignedTeacher = assignment?.teacher?.teacherName || ""
    if (!assignedTeacher && clsObj?.homeroomTeacherId) {
      const hr = await prisma.teacher.findUnique({ where: { id: clsObj.homeroomTeacherId } })
      assignedTeacher = hr?.teacherName || "Chưa phân công"
    } else if (!assignedTeacher) {
      assignedTeacher = "Chưa phân công"
    }

    const isLocked = Boolean(lock)
    const studentIds = students.map(s => s.id)

    // Get existing grade entries for this class and its active students
    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        academicYearId: targetAcademicYearId,
        subjectId,
        evaluationPeriod,
        OR: [
          { classId },
          { studentId: { in: studentIds } }
        ]
      }
    })

    return NextResponse.json({
      success: true,
      config,
      students,
      entries,
      assignedTeacher,
      isLocked,
      lockInfo: lock || null
    })

  } catch (error: any) {
    console.error("Lỗi lấy sổ điểm:", error)
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi khi tải dữ liệu sổ điểm. Vui lòng thử lại sau." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để thực hiện thao tác này" }, { status: 401 })
    }

    const body = await request.json()
    const { academicYearId, classId, subjectId, evaluationPeriod, entries } = body

    if (!classId || !subjectId || !evaluationPeriod || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: "Thiếu dữ liệu sổ điểm" }, { status: 400 })
    }

    const userRole = ((session?.user as any)?.role || "").toUpperCase().trim()
    const isPrivileged = ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "BAN_GIAM_HIEU", "BGH", "CM", "TO_TRUONG"].includes(userRole) || (userRole && userRole !== "TEACHER")

    let targetYearId = academicYearId
    if (!targetYearId && classId) {
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { academicYearId: true } })
      targetYearId = cls?.academicYearId || ""
    }
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { isDefault: true } })
      targetYearId = activeYear?.id || ""
    }
    if (!targetYearId) {
      return NextResponse.json({ success: false, error: "Không xác định được năm học" }, { status: 400 })
    }

    let teacherId = null
    const userId = (session?.user as any)?.id
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
      if (teacher) teacherId = teacher.id
    }

    // Authorization check: non-privileged teachers must be assigned to teach this class & subject
    if (!isPrivileged && userRole === "TEACHER") {
      if (!teacher) {
        return NextResponse.json({
          success: false,
          error: "Tài khoản giáo viên không tồn tại trong hệ thống hoặc chưa được liên kết"
        }, { status: 403 })
      }
      const isAssigned = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId,
          subjectId,
          academicYearId: targetYearId
        }
      })
      if (!isAssigned) {
        return NextResponse.json({
          success: false,
          error: "Bạn không được phân công giảng dạy môn học này cho lớp đã chọn"
        }, { status: 403 })
      }
    }

    // Check lock status before saving
    const lock = await prisma.gradebookLock.findFirst({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod,
        OR: [
          { classId, subjectId },
          { classId: "ALL", subjectId: "ALL" }
        ],
        isLocked: true
      }
    })

    if (lock && !isPrivileged) {
      return NextResponse.json({
        success: false,
        error: `Sổ điểm môn này trong kỳ ${evaluationPeriod} đã bị Khóa bởi ${lock.lockedBy || "Ban Khảo thí & ĐBCL"}. Bạn không thể chỉnh sửa hoặc lưu điểm lúc này.`
      }, { status: 403 })
    }

    // Validate students belong to this class to preserve data integrity
    const classStudents = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      select: { id: true }
    })
    const validStudentIds = new Set(classStudents.map(s => s.id))

    // Deduplicate entries and ensure student belongs to the class
    const cleanEntriesMap = new Map<string, any>()
    for (const entry of entries) {
      if (entry && entry.studentId) {
        const sId = String(entry.studentId).trim()
        if (validStudentIds.has(sId)) {
          cleanEntriesMap.set(sId, entry)
        }
      }
    }
    const cleanEntries = Array.from(cleanEntriesMap.values())

    if (entries.length > 0 && cleanEntries.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Danh sách học sinh không hợp lệ hoặc không thuộc lớp học này"
      }, { status: 400 })
    }

    // Upsert each grade entry atomically using transaction and compound unique key
    await prisma.$transaction(
      cleanEntries.map(entry => {
        const { studentId, componentScores, compositeScore, remark } = entry
        const parsedComposite =
          compositeScore !== "" && compositeScore !== null && compositeScore !== undefined
            ? parseFloat(compositeScore)
            : null
        const safeComposite = (parsedComposite !== null && !isNaN(parsedComposite)) ? parsedComposite : null

        let compScoresStr = "{}"
        if (componentScores) {
          if (typeof componentScores === "string") {
            try {
              JSON.parse(componentScores)
              compScoresStr = componentScores
            } catch {
              compScoresStr = "{}"
            }
          } else if (typeof componentScores === "object") {
            compScoresStr = JSON.stringify(componentScores)
          }
        }

        return prisma.subjectGradeEntry.upsert({
          where: {
            studentId_subjectId_evaluationPeriod_academicYearId: {
              studentId,
              subjectId,
              evaluationPeriod,
              academicYearId: targetYearId
            }
          },
          update: {
            classId, // Always keep classId up to date
            componentScores: compScoresStr,
            compositeScore: safeComposite,
            remark: typeof remark === "string" ? remark.slice(0, 1000) : "",
            ...(teacherId ? { teacherId } : {})
          },
          create: {
            academicYearId: targetYearId,
            classId,
            subjectId,
            evaluationPeriod,
            studentId,
            teacherId,
            componentScores: compScoresStr,
            compositeScore: safeComposite,
            remark: typeof remark === "string" ? remark.slice(0, 1000) : ""
          }
        })
      })
    )

    return NextResponse.json({ success: true, message: "Lưu sổ điểm thành công" })

  } catch (error: any) {
    console.error("Lỗi lưu sổ điểm:", error)
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi trong quá trình lưu sổ điểm. Vui lòng thử lại sau." }, { status: 500 })
  }
}
