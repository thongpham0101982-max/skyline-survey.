import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

function resolveGrade(grade?: string | null, className?: string | null): string {
  if (grade && !isNaN(Number(grade))) return String(Number(grade))
  if (className) {
    const match = className.match(/^(\d+)/)
    if (match) return String(Number(match[1]))
  }
  return ""
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const campusId = searchParams.get("campusId") || ""
    let academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const statusColor = searchParams.get("statusColor") || ""
    const search = (searchParams.get("search") || "").trim()
    const gradesParam = (searchParams.get("grades") || searchParams.get("grade") || "").trim()
    const selectedGrades = gradesParam
      ? gradesParam.split(",").map(g => g.trim().replace(/^[kK]/, "")).filter(Boolean)
      : []

    // 1. Tự động lấy Năm học hoạt động mặc định nếu không truyền academicYearId
    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) {
        academicYearId = activeYear.id
      }
    }

    // 2. Tìm kiếm đa trường: Tên HS, Mã HS, Tên Lớp, Tên GVCN
    let matchingClassIds: string[] = []
    let homeroomTeacherIds: string[] = []
    let homeroomClassNames: string[] = []

    if (search) {
      const matchedTeachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { teacherName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } }
          ]
        },
        select: { id: true, homeroomClass: true }
      }).catch(() => [])

      if (matchedTeachers.length > 0) {
        homeroomTeacherIds = matchedTeachers.map(t => t.id)
        homeroomClassNames = matchedTeachers.map(t => t.homeroomClass).filter(Boolean) as string[]

        const assignments = await prisma.teacherClassAssignment.findMany({
          where: { teacherId: { in: homeroomTeacherIds } },
          select: { classId: true }
        }).catch(() => [])
        matchingClassIds = assignments.map(a => a.classId)
      }
    }

    // 3. Thiết lập điều kiện lọc học sinh (Bao gồm Năm học, trạng thái ACTIVE và loại trừ Mầm non)
    const classConditions: any = {
      NOT: [
        { level: "Mam non" },
        { level: "Mầm non" },
        { level: "MAM_NON" },
        { level: "Preschool" },
        { level: "PRESCHOOL" },
        { className: { contains: "Mầm" } },
        { className: { contains: "mầm" } },
        { className: { contains: "Mam" } },
        { className: { contains: "mam" } },
        { grade: "MAM" },
        { grade: "CHOI" },
        { grade: "LA" },
        { grade: "NHA_TRE" },
        { grade: "MAM_NON" }
      ]
    }

    if (campusId) {
      classConditions.campusId = campusId
    }

    const whereStudent: any = {
      status: "ACTIVE",
      class: classConditions
    }

    if (academicYearId) {
      whereStudent.academicYearId = academicYearId
    }

    if (classId) {
      whereStudent.classId = classId
    }

    if (search) {
      whereStudent.OR = [
        { studentName: { contains: search } },
        { studentCode: { contains: search } },
        { class: { className: { contains: search } } },
        ...(matchingClassIds.length > 0 ? [{ classId: { in: matchingClassIds } }] : []),
        ...(homeroomTeacherIds.length > 0 ? [{ class: { homeroomTeacherId: { in: homeroomTeacherIds } } }] : []),
        ...(homeroomClassNames.length > 0 ? [{ class: { className: { in: homeroomClassNames } } }] : [])
      ]
    }

    const rawStudents = await prisma.student.findMany({
      where: whereStudent,
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        dateOfBirth: true,
        academicYearId: true,
        classId: true,
        class: {
          select: {
            id: true,
            className: true,
            level: true,
            grade: true,
            homeroomTeacherId: true,
            campus: { select: { id: true, campusName: true, campusCode: true } }
          }
        }
      },
      orderBy: { studentName: "asc" }
    })

    // Lọc loại trừ thêm ở tầng JS để đảm bảo 100% không sót bất kỳ lớp Mầm non nào
    const nonPreschoolStudents = rawStudents.filter(st => {
      const clsName = (st.class?.className || "").toLowerCase()
      const lvl = (st.class?.level || "").toLowerCase()
      const grd = (st.class?.grade || "").toLowerCase()
      const isMamNon = lvl.includes("mầm") || lvl.includes("mam") || lvl.includes("preschool") ||
                       clsName.includes("mầm") || clsName.includes("mam") ||
                       ["mam", "choi", "la", "nha_tre", "mam_non"].includes(grd)
      return !isMamNon
    })

    // Thu thập danh sách Khối có trong dữ liệu
    const availableGradesSet = new Set<string>()
    nonPreschoolStudents.forEach(st => {
      const g = resolveGrade(st.class?.grade, st.class?.className)
      if (g) availableGradesSet.add(g)
    })
    const availableGrades = Array.from(availableGradesSet).sort((a, b) => Number(a) - Number(b))

    // Lọc theo Khối nếu được chọn
    const students = selectedGrades.length > 0
      ? nonPreschoolStudents.filter(st => {
          const g = resolveGrade(st.class?.grade, st.class?.className)
          return selectedGrades.includes(g)
        })
      : nonPreschoolStudents

    const studentIds = students.map(s => s.id)
    const studentCodes = students.map(s => s.studentCode).filter(Boolean)

    // Lấy toàn bộ các ID học sinh (kể cả ID ở năm học trước) có cùng studentCode để tránh sót phiếu mục tiêu
    const relatedStudentRecords = await prisma.student.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true }
    }).catch(() => [])

    const codeToAllIdsMap: Record<string, string[]> = {}
    relatedStudentRecords.forEach(r => {
      if (!codeToAllIdsMap[r.studentCode]) codeToAllIdsMap[r.studentCode] = []
      codeToAllIdsMap[r.studentCode].push(r.id)
    })
    const allStudentIds = Array.from(new Set([...studentIds, ...relatedStudentRecords.map(r => r.id)]))

    // 4. Fetch goals for these students with academicYearId filter if provided
    const goals = await prisma.studentGoal.findMany({
      where: {
        studentId: { in: allStudentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      include: { actions: true }
    }).catch(() => [])

    // 5. Fetch warnings for these students
    const warnings = await prisma.studentAdvisoryStatus.findMany({
      where: { studentId: { in: allStudentIds } }
    }).catch(() => [])

    // 6. Fetch tracking logs
    const trackingLogs = await prisma.studentGoalTrackingLog.findMany({
      where: { studentId: { in: allStudentIds } }
    }).catch(() => [])

    // 7. Fetch Teachers and Class Assignments to resolve GVCN accurately
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        teacherName: true,
        email: true,
        phone: true,
        homeroomClass: true
      }
    }).catch(() => [])

    const teacherMap: Record<string, any> = {}
    teachers.forEach(t => {
      teacherMap[t.id] = t
      if (t.homeroomClass) {
        teacherMap[t.homeroomClass] = t
      }
    })

    const classIds = Array.from(new Set(students.map(s => s.class?.id).filter(Boolean))) as string[]
    const classAssignments = await prisma.teacherClassAssignment.findMany({
      where: { classId: { in: classIds } },
      include: { teacher: true }
    }).catch(() => [])

    const classAssignmentMap: Record<string, any[]> = {}
    classAssignments.forEach(ca => {
      if (!classAssignmentMap[ca.classId]) classAssignmentMap[ca.classId] = []
      classAssignmentMap[ca.classId].push(ca)
    })

    // Group goals by studentId
    const studentGoalMap: Record<string, any[]> = {}
    goals.forEach(g => {
      if (!studentGoalMap[g.studentId]) studentGoalMap[g.studentId] = []
      studentGoalMap[g.studentId].push(g)
    })

    // Map warnings by student
    const warningMap: Record<string, string> = {}
    warnings.forEach(w => {
      warningMap[w.studentId] = w.statusColor || "GREEN"
    })

    // Map tracking teacher notes
    const teacherNoteCountMap: Record<string, number> = {}
    trackingLogs.forEach(t => {
      if (t.teacherNotes && t.teacherNotes.trim()) {
        teacherNoteCountMap[t.studentId] = (teacherNoteCountMap[t.studentId] || 0) + 1
      }
    })

    // Build comprehensive student list
    const studentRows = students.map(st => {
      let stGoals = studentGoalMap[st.id] || []
      if (stGoals.length === 0 && st.studentCode && codeToAllIdsMap[st.studentCode]) {
        for (const altId of codeToAllIdsMap[st.studentCode]) {
          if (studentGoalMap[altId]?.length > 0) {
            stGoals = studentGoalMap[altId]
            break
          }
        }
      }

      const hasSubmitted = stGoals.length > 0
      const color = hasSubmitted ? (warningMap[st.id] || "GREEN") : "UNSUBMITTED"
      const parentSigned = stGoals.some(g => g.signedByParent)
      const signedByTeacher = stGoals.some(g => g.signedByTeacher)
      const teacherComment = stGoals.find(g => g.teacherComment && g.teacherComment.trim())?.teacherComment || ""
      const parentMessage = stGoals.find(g => g.parentMessage && g.parentMessage.trim())?.parentMessage || ""
      const studentCommitment = stGoals.find(g => g.studentCommitment && g.studentCommitment.trim())?.studentCommitment || ""
      const hasTeacherNotes = (teacherNoteCountMap[st.id] || 0) > 0 || signedByTeacher || teacherComment.length > 0

      const resolvedGrade = resolveGrade(st.class?.grade, st.class?.className)

      return {
        id: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender || "—",
        dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—",
        classId: st.classId || st.class?.id || "",
        gradeLevel: resolvedGrade ? `Khối ${resolvedGrade}` : ((st.class as any)?.gradeLevel || st.class?.grade || "Khối"),
        gradeNum: resolvedGrade ? Number(resolvedGrade) : 999,
        className: st.class?.className || "Chưa xếp lớp",
        campusName: st.class?.campus?.campusName || "Chưa xác định",
        campusCode: st.class?.campus?.campusCode || "CS",
        goalCount: stGoals.length,
        hasSubmitted,
        statusColor: color,
        studentCommitment,
        parentMessage,
        teacherComment,
        parentSigned,
        signedByTeacher,
        hasTeacherNotes,
        goals: stGoals
      }
    })

    // Group by Class to build Class-Level Summary
    const classGroupMap: Record<string, any> = {}
    studentRows.forEach(st => {
      const cId = st.classId || st.className
      if (!classGroupMap[cId]) {
        const matchingCls = st.classId ? students.find(s => s.class?.id === st.classId)?.class : null
        let gvcnName = ""
        let gvcnPhone = ""
        
        // 1. Check homeroomTeacherId from Class
        if (matchingCls?.homeroomTeacherId && teacherMap[matchingCls.homeroomTeacherId]) {
          gvcnName = teacherMap[matchingCls.homeroomTeacherId].teacherName
          gvcnPhone = teacherMap[matchingCls.homeroomTeacherId].phone || ""
        }
        
        // 2. Check TeacherClassAssignment
        if (!gvcnName && classAssignmentMap[cId] && classAssignmentMap[cId].length > 0) {
          const gAss = classAssignmentMap[cId].find((ca: any) => ca.roleInClass === "GVCN" || ca.roleInClass === "HOMEROOM") || classAssignmentMap[cId][0]
          gvcnName = gAss?.teacher?.teacherName || ""
          gvcnPhone = gAss?.teacher?.phone || ""
        }

        // 3. Check Teacher homeroomClass
        if (!gvcnName && teacherMap[st.className]) {
          gvcnName = teacherMap[st.className].teacherName
          gvcnPhone = teacherMap[st.className].phone || ""
        }

        classGroupMap[cId] = {
          classId: cId,
          className: st.className,
          gradeLevel: st.gradeLevel,
          gradeNum: st.gradeNum,
          campusName: st.campusName,
          campusCode: st.campusCode,
          homeroomTeacherName: gvcnName || "Chưa phân công",
          homeroomTeacherPhone: gvcnPhone,
          totalStudents: 0,
          submittedCount: 0,
          unsubmittedCount: 0,
          greenCount: 0,
          yellowCount: 0,
          redCount: 0,
          parentSignedCount: 0,
          reviewedByTeacherCount: 0,
          students: []
        }
      }

      classGroupMap[cId].totalStudents += 1
      if (st.hasSubmitted) {
        classGroupMap[cId].submittedCount += 1
        if (st.statusColor === "GREEN") classGroupMap[cId].greenCount += 1
        else if (st.statusColor === "YELLOW") classGroupMap[cId].yellowCount += 1
        else if (st.statusColor === "RED") classGroupMap[cId].redCount += 1
      } else {
        classGroupMap[cId].unsubmittedCount += 1
      }

      if (st.parentSigned) classGroupMap[cId].parentSignedCount += 1
      if (st.hasTeacherNotes) classGroupMap[cId].reviewedByTeacherCount += 1

      classGroupMap[cId].students.push(st)
    })

    // Sắp xếp các lớp theo thứ tự tự nhiên (Natural Pedagogical Sort: Khối 1..12 -> Cơ sở -> Tên lớp)
    const classRows = Object.values(classGroupMap).map(cls => ({
      ...cls,
      submissionPercent: cls.totalStudents > 0 ? Math.round((cls.submittedCount / cls.totalStudents) * 100) : 0
    })).sort((a, b) => {
      // 1. Thứ tự khối học 1 -> 12
      const gradeA = a.gradeNum || 999
      const gradeB = b.gradeNum || 999
      if (gradeA !== gradeB) return gradeA - gradeB
      
      // 2. Thứ tự Cơ sở (CS1, CS2, CS3, CS4, CS5...)
      const campusComp = (a.campusCode || "").localeCompare(b.campusCode || "")
      if (campusComp !== 0) return campusComp

      // 3. Thứ tự Tên lớp tự nhiên (ví dụ: 10.1 trước 10.2)
      return a.className.localeCompare(b.className, undefined, { numeric: true })
    })

    // Sắp xếp học sinh trong mỗi lớp theo tên tiếng Việt
    classRows.forEach(cls => {
      cls.students.sort((a: any, b: any) => a.studentName.localeCompare(b.studentName, "vi"))
    })

    // Filter students by statusColor if requested
    let finalRows = studentRows
    if (statusColor && statusColor !== "ALL") {
      finalRows = finalRows.filter(r => r.statusColor === statusColor)
    }

    // Calculate executive summary metrics
    const totalStudents = students.length
    const submittedCount = studentRows.filter(r => r.hasSubmitted).length
    const greenCount = studentRows.filter(r => r.statusColor === "GREEN").length
    const yellowCount = studentRows.filter(r => r.statusColor === "YELLOW").length
    const redCount = studentRows.filter(r => r.statusColor === "RED").length
    const parentSignedCount = studentRows.filter(r => r.parentSigned).length
    const reviewedByTeacherCount = studentRows.filter(r => r.hasTeacherNotes).length

    return jsonResponse({
      currentAcademicYearId: academicYearId,
      availableGrades,
      appliedGrades: selectedGrades,
      metrics: {
        totalStudents,
        submittedCount,
        unsubmittedCount: totalStudents - submittedCount,
        submissionPercent: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
        greenCount,
        yellowCount,
        redCount,
        parentSignedCount,
        reviewedByTeacherCount,
        totalClasses: classRows.length
      },
      classes: classRows,
      students: finalRows
    })
  } catch (e: any) {
    console.error("GET /api/admin/advisory/dashboard error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}
