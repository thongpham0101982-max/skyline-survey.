import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const campusId = searchParams.get("campusId") || ""
    let academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const status = searchParams.get("status") || "ALL" // ALL | CONSULTED | NOT_CONSULTED
    const search = (searchParams.get("search") || "").trim()

    // 1. Lấy Năm học mặc định nếu chưa truyền
    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) {
        academicYearId = activeYear.id
      }
    }

    // 2. Thiết lập điều kiện lọc học sinh (loại trừ Mầm non theo chuẩn phân hệ Cố vấn học tập)
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
        { studentCode: { contains: search } }
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

    // Lọc loại trừ thêm ở tầng JS để đảm bảo 100% không sót Mầm non
    const students = rawStudents.filter(st => {
      const clsName = (st.class?.className || "").toLowerCase()
      const lvl = (st.class?.level || "").toLowerCase()
      const grd = (st.class?.grade || "").toLowerCase()
      const isMamNon = lvl.includes("mầm") || lvl.includes("mam") || lvl.includes("preschool") ||
                       clsName.includes("mầm") || clsName.includes("mam") ||
                       ["mam", "choi", "la", "nha_tre", "mam_non"].includes(grd)
      return !isMamNon
    })

    const studentIds = students.map(s => s.id)

    // 3. Lấy toàn bộ nhật ký tham vấn của các học sinh này
    let consultationLogs: any[] = []
    if (studentIds.length > 0) {
      try {
        consultationLogs = await prisma.academicConsultationLog.findMany({
          where: {
            studentId: { in: studentIds },
            ...(academicYearId ? { academicYearId } : {})
          },
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: { meetingDate: "desc" }
        })
      } catch (err) {
        console.error("Lỗi lấy AcademicConsultationLog:", err)
      }
    }

    // 4. Nhóm nhật ký tư vấn theo studentId
    const studentConsultationMap: Record<string, any[]> = {}
    consultationLogs.forEach(log => {
      if (!studentConsultationMap[log.studentId]) {
        studentConsultationMap[log.studentId] = []
      }
      studentConsultationMap[log.studentId].push(log)
    })

    // 5. Lấy thông tin GVCN
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

    // 6. Xây dựng danh sách học sinh kèm chi tiết tư vấn
    const studentRows = students.map(st => {
      const logs = studentConsultationMap[st.id] || []
      const isConsulted = logs.length > 0
      const sessionCount = logs.length
      const latestLog = logs[0] || null

      return {
        id: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender || "—",
        dateOfBirth: st.dateOfBirth,
        classId: st.classId || st.class?.id || "",
        gradeLevel: (st.class as any)?.gradeLevel || st.class?.grade || st.class?.className || "Khối",
        className: st.class?.className || "Chưa xếp lớp",
        campusId: st.class?.campus?.id || "",
        campusName: st.class?.campus?.campusName || "Chưa xác định",
        campusCode: st.class?.campus?.campusCode || "CS",
        isConsulted,
        sessionCount,
        latestMeetingDate: latestLog ? latestLog.meetingDate : null,
        latestCounselor: latestLog?.teacher?.teacherName || null,
        logs: logs.map(l => ({
          id: l.id,
          meetingDate: l.meetingDate,
          content: l.content,
          difficulties: l.difficulties,
          nextActions: l.nextActions,
          deadline: l.deadline,
          notes: l.notes,
          studentReflection: l.studentReflection,
          teacherName: l.teacher?.teacherName || "Giáo viên Cố vấn",
          teacherEmail: l.teacher?.email || "",
          teacherPhone: l.teacher?.phone || ""
        }))
      }
    })

    // 7. Nhóm theo Lớp để tính toán thống kê
    const classGroupMap: Record<string, any> = {}

    studentRows.forEach(st => {
      const cId = st.classId || st.className
      if (!classGroupMap[cId]) {
        const matchingCls = st.classId ? students.find(s => s.class?.id === st.classId)?.class : null
        let gvcnName = ""
        let gvcnPhone = ""
        let gvcnEmail = ""

        // Cách 1: homeroomTeacherId từ Class
        if (matchingCls?.homeroomTeacherId && teacherMap[matchingCls.homeroomTeacherId]) {
          const t = teacherMap[matchingCls.homeroomTeacherId]
          gvcnName = t.teacherName
          gvcnPhone = t.phone || ""
          gvcnEmail = t.email || ""
        }

        // Cách 2: Phân công TeacherClassAssignment
        if (!gvcnName && classAssignmentMap[cId] && classAssignmentMap[cId].length > 0) {
          const gAss = classAssignmentMap[cId].find((ca: any) => ca.roleInClass === "GVCN" || ca.roleInClass === "HOMEROOM") || classAssignmentMap[cId][0]
          if (gAss?.teacher) {
            gvcnName = gAss.teacher.teacherName || ""
            gvcnPhone = gAss.teacher.phone || ""
            gvcnEmail = gAss.teacher.email || ""
          }
        }

        // Cách 3: homeroomClass trong Teacher
        if (!gvcnName && teacherMap[st.className]) {
          const t = teacherMap[st.className]
          gvcnName = t.teacherName
          gvcnPhone = t.phone || ""
          gvcnEmail = t.email || ""
        }

        classGroupMap[cId] = {
          classId: cId,
          className: st.className,
          gradeLevel: st.gradeLevel,
          campusId: st.campusId,
          campusName: st.campusName,
          campusCode: st.campusCode,
          homeroomTeacherName: gvcnName || "Chưa phân công",
          homeroomTeacherPhone: gvcnPhone,
          homeroomTeacherEmail: gvcnEmail,
          totalStudents: 0,
          consultedCount: 0,
          unconsultedCount: 0,
          consultedPercent: 0,
          totalSessions: 0,
          students: []
        }
      }

      const clsGroup = classGroupMap[cId]
      clsGroup.totalStudents += 1
      if (st.isConsulted) {
        clsGroup.consultedCount += 1
      } else {
        clsGroup.unconsultedCount += 1
      }
      clsGroup.totalSessions += st.sessionCount
      clsGroup.students.push(st)
    })

    // Tính % hoàn thành tư vấn cho từng lớp
    const classList = Object.values(classGroupMap).map((cls: any) => {
      cls.consultedPercent = cls.totalStudents > 0
        ? Math.round((cls.consultedCount / cls.totalStudents) * 1000) / 10
        : 0
      return cls
    }).sort((a: any, b: any) => {
      // Sắp xếp theo campusName, sau đó tên lớp
      if (a.campusName !== b.campusName) return a.campusName.localeCompare(b.campusName)
      return a.className.localeCompare(b.className)
    })

    // Lọc theo trạng thái tư vấn nếu người dùng chọn
    let filteredClasses = classList
    let filteredStudents = studentRows

    if (status === "CONSULTED") {
      filteredClasses = classList.filter(c => c.consultedCount > 0)
      filteredStudents = studentRows.filter(s => s.isConsulted)
    } else if (status === "NOT_CONSULTED") {
      filteredClasses = classList.filter(c => c.unconsultedCount > 0)
      filteredStudents = studentRows.filter(s => !s.isConsulted)
    }

    // 8. Thống kê KPI tổng quan toàn trường / cơ sở
    const totalStudents = students.length
    const totalConsulted = studentRows.filter(s => s.isConsulted).length
    const totalUnconsulted = totalStudents - totalConsulted
    const totalSessions = consultationLogs.length
    const overallPercent = totalStudents > 0 ? Math.round((totalConsulted / totalStudents) * 1000) / 10 : 0

    return jsonResponse({
      metrics: {
        totalStudents,
        totalConsulted,
        totalUnconsulted,
        consultedPercent: overallPercent,
        totalSessions,
        totalClasses: classList.length
      },
      classes: filteredClasses,
      students: filteredStudents
    })
  } catch (error: any) {
    console.error("Lỗi GET /api/admin/advisory/consultations/summary:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ nội bộ" }, 500)
  }
}
