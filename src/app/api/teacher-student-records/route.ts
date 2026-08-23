import { parseCommittedSubjects } from "@/lib/subject-mapping"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function normalizeClassName(cName: string | null | undefined): string {
  if (!cName) return ""
  return cName.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(lop|class|co so|cs)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
}

function cleanString(str: string | null | undefined): string {
  if (!str) return ""
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
}


function safeJsonParse(val: any, fallback: any = {}) {
  if (!val) return fallback
  if (typeof val === "object") return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}

function safeDateToISO(dateVal: any): string {
  if (!dateVal) return ""
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ""
    return d.toISOString().split("T")[0]
  } catch {
    return ""
  }
}


export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    if (action === "getHomeroomStudents") {
      const academicYearId = searchParams.get("academicYearId")

      // Find classes where teacher is GVCN in the given academic year
      const classes = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ],
          ...(academicYearId ? { academicYearId } : {})
        },
        include: {
          students: {
            where: {
              NOT: {
                studentCode: { startsWith: "2" }
              }
            },
            orderBy: { studentName: "asc" }
          }
        }
      })
      
      const students = classes.flatMap(c => c.students.map(s => ({
        ...s,
        className: c.className,
        classCode: c.classCode,
        educationSystem: c.educationSystem
      })))

      // Batch query to find if students were admitted via entrance survey
      // Strategy: match by code first, then fallback by DOB+Name for students whose survey code differs from official code
      const studentCodes = students.map(s => s.studentCode).filter(Boolean)
      const studentDOBs = students.map(s => s.dateOfBirth).filter(Boolean)

      // Code-based match
      const k12ByCode = await prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { studentCode: { in: studentCodes } },
            { enrollmentCode: { in: studentCodes } }
          ]
        },
        select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
      })

      // DOB-based fallback - fetch candidates born on same dates as our students
      const k12ByDOB = studentDOBs.length > 0 ? await prisma.inputAssessmentStudent.findMany({
        where: { dateOfBirth: { in: studentDOBs as any[] } },
        select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
      }) : []

      // Merge and deduplicate
      const k12CandidateMap = new Map<string, any>()
      ;[...k12ByCode, ...k12ByDOB].forEach(c => k12CandidateMap.set(c.studentCode + '|' + c.fullName, c))
      const k12Candidates = Array.from(k12CandidateMap.values())

      // Same for preschool
      const preschoolByCode = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where: {
          OR: [
            { studentCode: { in: studentCodes } },
            { enrollmentCode: { in: studentCodes } }
          ]
        },
        select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
      })

      const preschoolByDOB = studentDOBs.length > 0 ? await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where: { dateOfBirth: { in: studentDOBs } },
        select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
      }) : []

      const preschoolCandidateMap = new Map<string, any>()
      ;[...preschoolByCode, ...preschoolByDOB].forEach((c: any) => preschoolCandidateMap.set(c.studentCode + '|' + c.fullName, c))
      const preschoolCandidates = Array.from(preschoolCandidateMap.values())

      const normName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ')
      const sameTime = (a: any, b: any) => a && b && new Date(a).getTime() === new Date(b).getTime()

      const enrichedStudents = students.map(s => {
        const isK12Candidate = k12Candidates.some(c =>
          c.studentCode === s.studentCode ||
          c.enrollmentCode === s.studentCode ||
          (normName(c.fullName) === normName(s.studentName) && sameTime(c.dateOfBirth, s.dateOfBirth))
        )

        const isPreschoolCandidate = preschoolCandidates.some((c: any) =>
          c.studentCode === s.studentCode ||
          c.enrollmentCode === s.studentCode ||
          (normName(c.fullName) === normName(s.studentName) && sameTime(c.dateOfBirth, s.dateOfBirth))
        )

        return {
          ...s,
          isEntranceAdmitted: isK12Candidate || isPreschoolCandidate
        }
      })

      return NextResponse.json(enrichedStudents)
    }

    if (action === "getAssignedClasses") {
      const subject = searchParams.get("subject")
      const academicYearId = searchParams.get("academicYearId")

      // Find all matching subject IDs if we are targeting a specific subject
      let subjectIds: string[] | undefined = undefined;
      if (subject === "orientation") {
        const allSubjects = await prisma.subject.findMany()
        subjectIds = allSubjects
          .filter(s => {
            const name = (s.subjectName || s.name || "").toLowerCase()
            return name.includes("hướng nghiệp") || name.includes("huong nghiep")
          })
          .map(s => s.id)
      }

      // Query teaching assignments in this academic year
      const assignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId: teacher.id,
          ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
          ...(academicYearId ? { academicYearId } : {})
        },
        include: {
          subject: true
        }
      })

      const assignedClassIds = assignments.map(a => a.classId)

      // Query homeroom classes in this academic year
      const homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ],
          ...(academicYearId ? { academicYearId } : {})
        },
        select: { id: true }
      })

      const homeroomClassIds = homeroomClasses.map(c => c.id)

      // Union class IDs
      const allClassIds = Array.from(new Set([...assignedClassIds, ...homeroomClassIds]))

      const classes = await prisma.class.findMany({
        where: { id: { in: allClassIds } },
        orderBy: { className: "asc" }
      })

      const result = classes.map(c => {
        const classAssignments = assignments.filter(a => a.classId === c.id)
        const isHomeroom = homeroomClassIds.includes(c.id)
        return {
          id: c.id,
          className: c.className,
          isHomeroom,
          educationSystem: c.educationSystem || "",
          subjects: classAssignments.map(a => a.subject)
        }
      })

      return NextResponse.json(result)
    }

    if (action === "getClassStudents") {
      const classId = searchParams.get("classId")
      if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

      const students = await prisma.student.findMany({
        where: {
          classId,
          NOT: {
            studentCode: { startsWith: "2" }
          }
        },
        orderBy: { studentName: "asc" }
      })

      // Fetch input assessment records for all candidates with commitment notes or matching results
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { admissionResult: { in: ["Đạt cam kết", "Đạt - Cam kết"] } },
            { directorNote: { contains: "Môn cam kết" } }
          ]
        },
        select: {
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          directorNote: true,
          admissionResult: true,
          enrollmentDate: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true,
          psychologyScore: true,
          scores: { include: { subject: true } }
        }
      })

      const result = students.map(s => {
        const assessment = inputAssessments.find((a) => {
          if (a.studentCode === s.studentCode || a.enrollmentCode === s.studentCode) {
            return true
          }
          return cleanString(a.fullName) === cleanString(s.studentName)
        })
        return {
          ...s,
          entranceCommitmentSubjects: assessment ? parseCommittedSubjects(assessment.directorNote, assessment.admissionResult) : []
        }
      })

      return NextResponse.json(result)
    }

    // NEW: Get students in a class with learning commitments matching the teacher's assigned subjects
    if (action === "getCommitmentCandidates") {
      const classId = searchParams.get("classId")
      const subjectsParam = searchParams.get("subjects") // comma separated list of subject names
      const academicYearId = searchParams.get("academicYearId")
      const teacherId = searchParams.get("teacherId")
      if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

      const subjectNames = (subjectsParam || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)

      // Fetch homeroom classes for this teacher (if any)
      let homeroomClasses: any[] = []
      if (academicYearId && teacherId) {
        homeroomClasses = await prisma.class.findMany({
          where: {
            academicYearId,
            OR: [
              { homeroomTeacherId: teacherId },
              { homeroomTeacherId: { contains: teacherId } }
            ]
          }
        })
      }

      // Fetch all students in the class
      const students = await prisma.student.findMany({
        where: {
          classId,
          NOT: {
            studentCode: { startsWith: "2" }
          }
        },
        orderBy: { studentName: "asc" }
      })

      // Fetch input assessment records for all candidates with commitment notes or matching results
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { admissionResult: { in: ["Đạt cam kết", "Đạt - Cam kết"] } },
            { directorNote: { contains: "Môn cam kết" } }
          ]
        },
        select: {
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          directorNote: true,
          admissionResult: true,
          enrollmentDate: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true,
          psychologyScore: true,
          scores: { include: { subject: true } }
        }
      })

      // Filter students whose input assessment commitment matches the subjects Param
      const candidates = students
        .map((s) => {
          const assessment = inputAssessments.find((a) => {
            if (a.studentCode === s.studentCode || a.enrollmentCode === s.studentCode) {
              return true
            }
            return cleanString(a.fullName) === cleanString(s.studentName)
          })
          if (!assessment) return null

          const committedSubjects = parseCommittedSubjects(assessment.directorNote, assessment.admissionResult)
          if (committedSubjects.length === 0) return null

          const isHomeroom = homeroomClasses.some(c => c.id === s.classId)
          const matchedSubjects = []

          for (const subName of subjectNames) {
            const cleanSub = subName.toLowerCase()
            const hasMatch = committedSubjects.some((cs: string) => {
              const cleanCS = cs.toLowerCase()
              if (cleanSub.includes("toán")) {
                return cleanCS.includes("môn toán") || cleanCS.includes("toán")
              }
              if (cleanSub.includes("tiếng việt") || cleanSub.includes("ngữ văn") || cleanSub.includes("văn")) {
                return cleanCS.includes("tiếng việt") || cleanCS.includes("ngữ văn") || cleanCS.includes("văn")
              }
              if (cleanSub.includes("tiếng anh") || cleanSub.includes("anh")) {
                return cleanCS.includes("tiếng anh") || cleanCS.includes("anh")
              }
              return cleanCS.includes(cleanSub) || cleanSub.includes(cleanCS)
            })
            if (hasMatch) {
              matchedSubjects.push(subName)
            }
          }

          if (!isHomeroom && subjectNames.length > 0 && matchedSubjects.length === 0) return null

          return {
            id: s.id,
            studentName: s.studentName,
            studentCode: s.studentCode,
            gender: s.gender,
            commitmentContent: committedSubjects.length > 0 
              ? `Cam kết Khảo sát đầu vào các môn: ${committedSubjects.join(", ")}`
              : "Có cam kết đầu vào",
            matchedSubjects: matchedSubjects.length > 0 ? matchedSubjects : committedSubjects
          }
        })
        .filter(Boolean)

      return NextResponse.json(candidates)
    }

    if (action === "getEntranceCommitments") {
      const academicYearId = searchParams.get("academicYearId")
      const teacherId = searchParams.get("teacherId")

      const userRole = (session.user as any)?.role || ""
      const isManagement = ["ADMIN", "KT_DBCL", "KTDBCL", "GDCS", "GĐ_CS", "BGH", "MANAGEMENT"].includes(userRole)

      // 1. Fetch teacher record
      const teacherObj = await prisma.teacher.findFirst({
        where: {
          OR: [
            ...(teacherId ? [{ id: teacherId }] : []),
            { userId: session.user.id }
          ]
        }
      })

      const actualTeacherId = teacherObj?.id || teacherId || ""

      // 2. Fetch all teachers for homeroom lookup
      const allTeachers = await prisma.teacher.findMany({
        include: { user: true }
      })

      // 3. Find assignments for this teacher
      const assignments = await prisma.teachingAssignment.findMany({
        where: {
          OR: [
            ...(actualTeacherId ? [{ teacherId: actualTeacherId }] : []),
            { teacher: { userId: session.user.id } }
          ]
        },
        include: {
          class: true,
          subject: true
        }
      })

      const teacherClassAssignments = await prisma.teacherClassAssignment.findMany({
        where: {
          OR: [
            ...(actualTeacherId ? [{ teacherId: actualTeacherId }] : []),
            { teacher: { userId: session.user.id } }
          ]
        },
        include: {
          class: true
        }
      })

      const homeroomClasses = await prisma.class.findMany({
        where: {
          academicYearId: academicYearId || undefined,
          OR: [
            ...(actualTeacherId ? [{ homeroomTeacherId: actualTeacherId }, { homeroomTeacherId: { contains: actualTeacherId } }] : [])
          ]
        }
      })

      // Collect class IDs
      let classIds = Array.from(new Set([
        ...assignments.map(a => a.classId),
        ...teacherClassAssignments.map(t => t.classId),
        ...homeroomClasses.map(c => c.id)
      ])).filter(Boolean)

      // If management role OR if no classIds found for teacher, fetch all classes in academicYearId
      if (isManagement || classIds.length === 0) {
        const allYearClasses = await prisma.class.findMany({
          where: academicYearId ? { academicYearId } : {},
          select: { id: true }
        })
        classIds = allYearClasses.map(c => c.id)
      }

      if (classIds.length === 0) {
        return NextResponse.json([])
      }

      // Fetch ALL teaching assignments for these classIds
      const allClassTeachingAssignments = await prisma.teachingAssignment.findMany({
        where: {
          classId: { in: classIds }
        },
        include: {
          class: true,
          subject: true,
          teacher: { include: { user: true } }
        }
      })

      // Fetch ALL teacher class assignments
      const allClassTeacherClassAssignments = await prisma.teacherClassAssignment.findMany({
        where: {
          classId: { in: classIds }
        },
        include: {
          class: true,
          teacher: { include: { user: true } }
        }
      })

      // Fetch class details
      const classDetails = await prisma.class.findMany({
        where: { id: { in: classIds } },
        include: { homeroomTeacher: true }
      })

      // Helper to resolve assigned teacher per class and subject
      const resolveAssignedTeacher = (classId: string | null | undefined, className: string, subName: string, homeroomTeacherId?: string | null) => {
        const subLower = subName.toLowerCase().trim()
        const normTargetClass = normalizeClassName(className)
        const cleanTargetClass = cleanString(className)

        // Find homeroom teacher name if applicable
        const hrTeacherObj = homeroomTeacherId ? allTeachers.find(t => t.id === homeroomTeacherId) : null
        const hrTeacherName = hrTeacherObj?.user?.fullName || hrTeacherObj?.teacherName || null

        // For Tâm lý (Psychology)
        if (subLower.includes("tâm lý") || subLower.includes("psychology")) {
          const psychTa = allClassTeachingAssignments.find(ta => {
            const taClassId = ta.classId
            const taClassName = ta.class?.className || ""
            const taClassCode = ta.class?.classCode || ""

            const normTaName = normalizeClassName(taClassName)
            const normTaCode = normalizeClassName(taClassCode)
            const cleanTaName = cleanString(taClassName)
            const cleanTaCode = cleanString(taClassCode)

            const classMatches = (classId && taClassId === classId) || 
              (normTargetClass && (
                normTaName === normTargetClass || 
                normTaCode === normTargetClass || 
                (normTaName.length >= 2 && normTargetClass.includes(normTaName)) ||
                (normTargetClass.length >= 2 && normTaName.includes(normTargetClass)) ||
                cleanTaName === cleanTargetClass ||
                cleanTaCode === cleanTargetClass
              ))

            if (!classMatches) return false

            const code = (ta.subject?.code || ta.subject?.subjectCode || "").toUpperCase()
            const name = (ta.subject?.name || ta.subject?.subjectName || "").toLowerCase()
            return code === "TLY" || code.startsWith("TLY") || name.includes("tâm lý") || name.includes("psychology")
          })

          if (psychTa?.teacher) {
            return psychTa.teacher.user?.fullName || psychTa.teacher.teacherName || "Chưa phân công"
          }

          if (hrTeacherName) return hrTeacherName

          const gvcnClassAssign = allClassTeacherClassAssignments.find(tca => {
            if (classId && tca.classId === classId) return true
            const cName = tca.class?.className || tca.class?.classCode || ""
            const role = (tca.roleInClass || "").toLowerCase()
            const classMatches = normalizeClassName(cName) === normTargetClass || cleanString(cName) === cleanTargetClass
            return classMatches && (role.includes("tâm lý") || role.includes("gvcn") || role.includes("chủ nhiệm"))
          })
          if (gvcnClassAssign?.teacher) {
            return gvcnClassAssign.teacher.user?.fullName || gvcnClassAssign.teacher.teacherName || "Chưa phân công"
          }
          return "Chưa phân công"
        }

        // Search in TeachingAssignments
        const matchingTa = allClassTeachingAssignments.find(ta => {
          const taClassId = ta.classId
          const taClassName = ta.class?.className || ""
          const taClassCode = ta.class?.classCode || ""

          const normTaName = normalizeClassName(taClassName)
          const normTaCode = normalizeClassName(taClassCode)
          const cleanTaName = cleanString(taClassName)
          const cleanTaCode = cleanString(taClassCode)

          const classMatches = (classId && taClassId === classId) || 
            (normTargetClass && (
              normTaName === normTargetClass || 
              normTaCode === normTargetClass || 
              (normTaName.length >= 2 && normTargetClass.includes(normTaName)) ||
              (normTargetClass.length >= 2 && normTaName.includes(normTargetClass)) ||
              cleanTaName === cleanTargetClass ||
              cleanTaCode === cleanTargetClass
            ))

          if (!classMatches) return false

          const code = (ta.subject?.code || ta.subject?.subjectCode || "").toUpperCase()
          const name = (ta.subject?.name || ta.subject?.subjectName || "").toLowerCase()

          // 1. Math
          if (subLower.includes("toán") || subLower.includes("math")) {
            return code === "TOA" || code.startsWith("TOA") || name.includes("toán") || name.includes("math")
          }
          // 2. English
          if (subLower.includes("anh") || subLower.includes("english") || subLower.includes("esl")) {
            return code === "TA" || code.startsWith("TA") || code.startsWith("ENG") || code.startsWith("ESL") || name.includes("anh") || name.includes("english") || name.includes("esl")
          }
          // 3. Tiếng Việt (Mã TVI)
          if (subLower.includes("tiếng việt") || (subLower.includes("việt") && !subLower.includes("văn"))) {
            return code === "TVI" || code.startsWith("TVI") || name.includes("tiếng việt") || (name.includes("việt") && !name.includes("văn"))
          }
          // 4. Ngữ Văn (Mã NVA)
          if (subLower.includes("ngữ văn") || subLower.includes("văn") || subLower.includes("literature")) {
            return code === "NVA" || code.startsWith("NVA") || name.includes("ngữ văn") || name.includes("văn") || name.includes("literature")
          }
          return false
        })

        if (matchingTa?.teacher) {
          return matchingTa.teacher.user?.fullName || matchingTa.teacher.teacherName || "Chưa phân công"
        }

        // Search in TeacherClassAssignments
        const matchingTca = allClassTeacherClassAssignments.find(tca => {
          const tcaClassId = tca.classId
          const normTcaName = normalizeClassName(tca.class?.className || "")
          const normTcaCode = normalizeClassName(tca.class?.classCode || "")

          const classMatches = (classId && tcaClassId === classId) || 
            (normTargetClass && (normTcaName === normTargetClass || normTcaCode === normTargetClass))
          if (!classMatches) return false

          const role = (tca.roleInClass || "").toLowerCase()
          if ((subLower.includes("toán") || subLower.includes("math")) && (role.includes("toán") || role.includes("math"))) return true
          if ((subLower.includes("anh") || subLower.includes("english")) && (role.includes("anh") || role.includes("english"))) return true
          if (subLower.includes("việt") && role.includes("việt")) return true
          if (subLower.includes("văn") && role.includes("văn")) return true
          return false
        })

        if (matchingTca?.teacher) {
          return matchingTca.teacher.user?.fullName || matchingTca.teacher.teacherName || "Chưa phân công"
        }

        return "Chưa phân công"
      }

      // Fetch all students in these classes
      const students = await prisma.student.findMany({
        where: {
          classId: { in: classIds },
          NOT: {
            studentCode: { startsWith: "2" }
          }
        },
        include: {
          class: true
        },
        orderBy: {
          studentName: "asc"
        }
      })

      // Fetch input assessment records for candidates
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        select: {
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          directorNote: true,
          admissionResult: true,
          enrollmentDate: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true,
          psychologyScore: true,
          scores: { include: { subject: true } }
        }
      })

      // Filter and construct candidates
      const candidates = students
        .map((s) => {
          const assessment = inputAssessments.find((a) => {
            if (a.studentCode === s.studentCode || a.enrollmentCode === s.studentCode) {
              return true
            }
            return cleanString(a.fullName) === cleanString(s.studentName)
          })
          if (!assessment) return null

          const committedSubjects = parseCommittedSubjects(assessment.directorNote, assessment.admissionResult)
          if (committedSubjects.length === 0) return null

          const isHomeroom = homeroomClasses.some(c => c.id === s.classId)
          const teacherSubjectsInClass = assignments
            .filter(a => a.classId === s.classId)
            .map(a => a.subject?.name || a.subject?.subjectName || "")

          const matchedSubjects = committedSubjects.filter((cs: string) => {
            const subLower = cs.toLowerCase().trim()
            if (isManagement || isHomeroom || assignments.length === 0) return true

            if (subLower.includes("tâm lý") || subLower.includes("psychology")) {
              const teachesPsych = teacherSubjectsInClass.some(ts => {
                const cleanTS = ts.toLowerCase()
                return cleanTS.includes("tâm lý") || cleanTS.includes("psychology")
              })
              return isHomeroom || teachesPsych
            }

            if (subLower.includes("toán") || subLower.includes("math")) {
              return teacherSubjectsInClass.some(ts => ts.toLowerCase().includes("toán") || ts.toLowerCase().includes("math"))
            }

            if (subLower.includes("tiếng việt") || (subLower.includes("việt") && !subLower.includes("văn"))) {
              return teacherSubjectsInClass.some(ts => {
                const cleanTS = ts.toLowerCase()
                return cleanTS.includes("tiếng việt") || (cleanTS.includes("việt") && !cleanTS.includes("văn"))
              })
            }

            if (subLower.includes("ngữ văn") || subLower.includes("văn") || subLower.includes("literature")) {
              return teacherSubjectsInClass.some(ts => {
                const cleanTS = ts.toLowerCase()
                return cleanTS.includes("ngữ văn") || cleanTS.includes("văn") || cleanTS.includes("literature")
              })
            }

            if (subLower.includes("anh") || subLower.includes("english") || subLower.includes("esl")) {
              return teacherSubjectsInClass.some(ts => {
                const cleanTS = ts.toLowerCase()
                return cleanTS.includes("anh") || cleanTS.includes("english") || cleanTS.includes("esl")
              })
            }

            return teacherSubjectsInClass.some(ts => {
              const cleanTS = ts.toLowerCase()
              return subLower.includes(cleanTS) || cleanTS.includes(subLower)
            })
          })

          if (matchedSubjects.length === 0) return null

          const classObj = classDetails.find(c => c.id === s.classId)
          const homeroomTeacherName = classObj?.homeroomTeacher?.name || classObj?.homeroomTeacher?.fullName || ""
          
          const studentClassAssignments = allClassTeachingAssignments
            .filter(ta => ta.classId === s.classId)
            .map(ta => ({
              teacherId: ta.teacherId,
              teacherName: ta.teacher?.user?.fullName || ta.teacher?.teacherName || "",
              subjectId: ta.subjectId,
              subjectName: ta.subject?.name || ta.subject?.subjectName || ""
            }))

          const assignedTeacherMap: Record<string, string> = {}
          committedSubjects.forEach(sub => {
            assignedTeacherMap[sub] = resolveAssignedTeacher(
              s.classId,
              s.class?.className || "",
              sub,
              s.class?.homeroomTeacherId
            )
          })

          return {
            id: s.id,
            studentName: s.studentName,
            studentCode: s.studentCode,
            classId: s.classId,
            className: s.class?.className || "",
            homeroomTeacherName,
            assignedTeachers: studentClassAssignments,
            assignedTeacherMap,
            committedSubjects,
            matchedSubjects,
            isHomeroom,
            admissionResult: assessment.admissionResult,
            directorNote: assessment.directorNote,
            enrollmentDate: assessment.enrollmentDate,
            mathScore: assessment.mathScore,
            literatureScore: assessment.literatureScore,
            writtenEnglishScore: assessment.writtenEnglishScore,
            oralEnglishScore: assessment.oralEnglishScore,
            psychologyScore: assessment.psychologyScore,
            scores: assessment.scores
          }
        })
        .filter(Boolean)

      return NextResponse.json(candidates)
    }

    if (action === "getStudentRecord") {
      const studentId = searchParams.get("studentId")
      const academicYearId = searchParams.get("academicYearId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      let student: any = null
      try {
        student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            class: true,
            campus: true,
            academicYear: true,
            termScores: {
              include: {
                subject: true
              }
            },
            termSummaries: true
          }
        })
      } catch (err) {
        console.error("Error fetching student in getStudentRecord:", err)
      }

      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

      // Default safe fallback structure
      const fallbackProfile = {
        student,
        termScores: student?.termScores || [],
        termSummaries: student?.termSummaries || [],
        achievements: [],
        orientation: null,
        projects: [],
        experientialActivities: [],
        commitment: null,
        highlightComments: [],
        entranceSurvey: null,
        transfers: [],
        learningSupportTargets: []
      }

      try {
        // Fetch achievements
        let achievements: any[] = []
        try {
          achievements = await prisma.studentAchievement.findMany({
            where: { studentId },
            include: { achievement: true }
          })
        } catch (err) {
          console.error("Error fetching achievements:", err)
        }

        // Fetch career orientation
        let orientation: any = null
        try {
          orientation = await prisma.studentCareerOrientation.findUnique({
            where: { studentId }
          })
        } catch (err) {
          console.error("Error fetching orientation:", err)
        }

        // Fetch projects
        let projects: any[] = []
        try {
          projects = await prisma.studentProjectExperience.findMany({
            where: { studentId },
            orderBy: { createdAt: "desc" }
          })
        } catch (err) {
          console.error("Error fetching projects:", err)
        }

        // Fetch experiential activities
        let experientialActivities: any[] = []
        try {
          const normName = (str: string) => (str || "").trim().toLowerCase().replace(/\s+/g, ' ')
          const cleanStudentName = normName(student?.studentName)

          let allParticipants: any[] = []
          try {
            allParticipants = await prisma.activityParticipant.findMany({
              include: {
                record: {
                  include: {
                    catalog: {
                      include: { group: true }
                    }
                  }
                },
                student: true
              },
              orderBy: { createdAt: "desc" }
            })
          } catch (err) {
            console.error("Error fetching all activityParticipants in getStudentRecord:", err)
          }

          const activityParticipants = allParticipants.filter(p => {
            if (!p) return false
            if (p.studentId === student.id) return true
            if (student.studentCode && p.student?.studentCode === student.studentCode) return true
            if (cleanStudentName && p.student?.studentName && normName(p.student.studentName) === cleanStudentName) return true
            return false
          })

          let categories: any[] = []
          try {
            categories = await prisma.activityCategory.findMany()
          } catch (err) {
            console.error("Error fetching activity categories:", err)
          }

          const roleDict: Record<string, string> = {
            TGIA: "Tham gia",
            TV: "Thành viên",
            NT: "Nhóm trưởng",
            PNT: "Phó nhóm trưởng",
            BTC: "Ban tổ chức"
          }

          const evalDict: Record<string, string> = {
            XS: "Xuất sắc",
            TO: "Tốt",
            DA: "Đạt",
            KDA: "Chưa đạt",
            EXCELLENT: "Xuất sắc",
            GOOD: "Tốt",
            SATISFACTORY: "Đạt"
          }

          experientialActivities = (activityParticipants || []).map((p, idx) => {
            const roleCat = categories.find(c => c?.id === p?.roleId || c?.code === p?.roleId)
            const evalCat = categories.find(c => c?.id === p?.evalLevelId || c?.code === p?.evalLevelId)
            const groupCat = categories.find(c => c?.id === p?.record?.catalog?.groupId || c?.code === p?.record?.catalog?.groupId)

            const resolvedRole = roleCat?.name || (p?.roleId ? roleDict[p.roleId] || p.roleId : "Tham gia")
            const resolvedEval = evalCat?.name || (p?.evalLevelId ? evalDict[p.evalLevelId] || p.evalLevelId : "Đạt")
            const resolvedGroup = groupCat?.name || p?.record?.catalog?.group?.name || "Hoạt động trải nghiệm"
            const resolvedName = p?.record?.name || p?.record?.catalog?.name || "Hoạt động trải nghiệm"

            return {
              id: p?.id || String(idx),
              stt: idx + 1,
              activityName: (resolvedName || "").trim(),
              groupName: (resolvedGroup || "").trim(),
              role: (resolvedRole || "").trim(),
              evalLevel: (resolvedEval || "").trim(),
              date: safeDateToISO(p?.record?.date)
            }
          })
        } catch (err) {
          console.error("Error processing experiential activities:", err)
        }

        // Fetch commitment
        let commitment: any = null
        try {
          commitment = await prisma.studentLearningCommitment.findFirst({
            where: { studentId, ...(academicYearId ? { academicYearId } : {}) }
          })
        } catch (err) {
          console.error("Error fetching commitment:", err)
        }

        // Fetch learning support targets & evaluations across ALL years by studentCode
        let learningSupportTargets: any[] = []
        try {
          if (student?.studentCode) {
            learningSupportTargets = await prisma.learningSupportTarget.findMany({
              where: {
                student: {
                  studentCode: student.studentCode
                }
              },
              include: {
                academicYear: true,
                assignments: {
                  include: {
                    teacher: { select: { teacherName: true } },
                    subject: { select: { subjectName: true } }
                  }
                },
                evaluations: {
                  orderBy: { createdAt: "desc" }
                }
              },
              orderBy: { createdAt: "desc" }
            })
          }
        } catch (err) {
          console.error("Error fetching learning support targets:", err)
        }

        // Fetch highlight comments
        let highlightComments: any[] = []
        try {
          highlightComments = await prisma.studentHighlightComment.findMany({
            where: { studentId },
            orderBy: { createdAt: "desc" }
          })
        } catch (err) {
          console.error("Error fetching highlight comments:", err)
        }

        // Fetch entrance survey
        let entranceSurvey: any = null
        try {
          let generalSurvey: any = null
          if (student?.studentCode) {
            generalSurvey = await prisma.inputAssessmentStudent.findFirst({
              where: {
                OR: [
                  { studentCode: student.studentCode },
                  { enrollmentCode: student.studentCode }
                ]
              },
              include: {
                scores: {
                  include: { subject: true }
                },
                period: true,
                batch: true
              }
            })
          }

          if (!generalSurvey) {
            const cleanStudentName = (student?.studentName || "").trim().toLowerCase().replace(/\s+/g, ' ')
            const allPossible = await prisma.inputAssessmentStudent.findMany({
              where: {
                dateOfBirth: student?.dateOfBirth || undefined
              },
              include: {
                scores: {
                  include: { subject: true }
                },
                period: true,
                batch: true
              }
            })

            generalSurvey = allPossible.find(x =>
              (x?.fullName || "").trim().toLowerCase().replace(/\s+/g, ' ') === cleanStudentName
            ) || null
          }

          if (generalSurvey) {
            entranceSurvey = {
              ...generalSurvey,
              type: "K12",
              scores: (generalSurvey.scores || []).map((s: any) => ({
                subjectName: s?.subject?.name || s?.subjectName || "",
                scores: safeJsonParse(s?.scores, {}),
                comments: safeJsonParse(s?.comments, {})
              }))
            }
          } else {
            let preschoolSurvey: any = null
            if (student?.studentCode && (prisma as any).preschoolInputAssessmentStudent) {
              preschoolSurvey = await (prisma as any).preschoolInputAssessmentStudent.findFirst({
                where: {
                  OR: [
                    { studentCode: student.studentCode },
                    { enrollmentCode: student.studentCode }
                  ]
                },
                include: {
                  period: true,
                  batch: true
                }
              })
            }

            if (!preschoolSurvey && (prisma as any).preschoolInputAssessmentStudent) {
              const cleanStudentName = (student?.studentName || "").trim().toLowerCase().replace(/\s+/g, ' ')
              const allPossiblePre = await (prisma as any).preschoolInputAssessmentStudent.findMany({
                where: {
                  dateOfBirth: student?.dateOfBirth || undefined
                },
                include: {
                  period: true,
                  batch: true
                }
              })

              preschoolSurvey = allPossiblePre.find((x: any) =>
                (x?.fullName || "").trim().toLowerCase().replace(/\s+/g, ' ') === cleanStudentName
              ) || null
            }

            if (preschoolSurvey) {
              let pScores: any[] = []
              if ((prisma as any).preschoolDevScore) {
                pScores = await (prisma as any).preschoolDevScore.findMany({
                  where: { studentId: preschoolSurvey.id },
                  include: { criteria: { include: { area: true } } }
                })
              }

              entranceSurvey = {
                ...preschoolSurvey,
                type: "PRESCHOOL",
                scores: pScores.map((s: any) => ({
                  areaName: s?.criteria?.area?.name || "",
                  criterionName: s?.criteria?.name || "",
                  result: s?.result || "",
                  note: s?.note || ""
                }))
              }
            }
          }
        } catch (err) {
          console.error("Error fetching entrance survey:", err)
        }

        // Fetch transfer info
        let transfers: any[] = []
        try {
          transfers = await prisma.studentTransfer.findMany({
            where: { studentId },
            orderBy: { transferDate: "desc" }
          })
        } catch (err) {
          console.error("Error fetching transfers:", err)
        }

        return NextResponse.json({
          student,
          termScores: student?.termScores || [],
          termSummaries: student?.termSummaries || [],
          achievements: achievements || [],
          orientation: orientation || null,
          projects: projects || [],
          experientialActivities: experientialActivities || [],
          commitment: commitment || null,
          highlightComments: highlightComments || [],
          entranceSurvey: entranceSurvey || null,
          transfers: transfers || [],
          learningSupportTargets: learningSupportTargets || []
        })
      } catch (err) {
        console.error("Error building student record response:", err)
        return NextResponse.json(fallbackProfile)
      }
    }

    if (action === "getProfiles") {
      const studentId = searchParams.get("studentId")
      const classId = searchParams.get("classId")
      const academicYearId = searchParams.get("academicYearId")

      // Find all homeroom and assigned classes for the teacher in this year
      const homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ],
          ...(academicYearId ? { academicYearId } : {})
        },
        select: { id: true }
      })

      const assignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId: teacher.id,
          ...(academicYearId ? { academicYearId } : {})
        },
        select: { classId: true }
      })

      const assignedClassIds = Array.from(new Set([
        ...homeroomClasses.map(c => c.id),
        ...assignments.map(a => a.classId)
      ]))

      const where: any = {}
      if (studentId) {
        where.id = studentId
        where.classId = { in: assignedClassIds }
      } else if (classId) {
        if (!assignedClassIds.includes(classId)) {
          return NextResponse.json({ error: "Forbidden: Access denied to this class" }, { status: 403 })
        }
        where.classId = classId
      } else {
        where.classId = { in: assignedClassIds }
      }

      if (academicYearId) where.academicYearId = academicYearId

      // Fetch students using same structure as admin student profiles endpoint
      const students = await prisma.student.findMany({
        where,
        include: {
          class: true,
          campus: true,
          academicYear: true,
          learningCommitments: true,
          careerOrientations: true,
          highlightComments: true,
          studentTransfers: true,
          achievements: {
          include: {
            achievement: {
              include: {
                exam: {
                  include: {
                    round: true,
                    category: true
                  }
                }
              }
            }
          }
        },
          projectExperiences: true,
          learningSupportTargets: {
            include: {
              assignments: {
                include: {
                  teacher: true,
                  subject: true
                }
              },
              evaluations: {
                orderBy: { createdAt: "desc" }
              }
            }
          }
        },
        orderBy: [
          { academicYear: { name: "desc" } },
          { campus: { campusName: "asc" } },
          { class: { className: "asc" } },
          { studentName: "asc" }
        ]
      })

      // Fetch K12 and Preschool entrance surveys to match
      const k12Surveys = await prisma.inputAssessmentStudent.findMany({
        include: {
          scores: {
            include: { subject: true }
          }
        }
      })

      const pAny = prisma as any
      const preschoolSurveys = pAny.preschoolInputAssessmentStudent 
        ? await pAny.preschoolInputAssessmentStudent.findMany() 
        : []
      const preschoolScores = pAny.preschoolDevScore 
        ? await pAny.preschoolDevScore.findMany({
            include: {
              criteria: {
                include: { area: true }
              }
            }
          }) 
        : []

      // Group preschool scores by studentId
      const preschoolScoresMap = new Map()
      preschoolScores.forEach((score) => {
        if (!preschoolScoresMap.has(score.studentId)) {
          preschoolScoresMap.set(score.studentId, [])
        }
        preschoolScoresMap.get(score.studentId).push(score)
      })

      // Fetch all activity participants for these students
      const studentIds = students.map(s => s.id)
      const studentCodes = students.map(s => s.studentCode).filter(Boolean)

      const allParticipants = await prisma.activityParticipant.findMany({
        where: {
          OR: [
            { studentId: { in: studentIds } },
            { student: { studentCode: { in: studentCodes } } }
          ]
        },
        include: {
          record: {
            include: {
              catalog: {
                include: { group: true }
              }
            }
          },
          student: true
        },
        orderBy: { createdAt: "desc" }
      })

      const categories = await prisma.activityCategory.findMany()

      const roleDict: Record<string, string> = {
        TGIA: "Tham gia",
        TV: "Thành viên",
        NT: "Nhóm trưởng",
        PNT: "Phó nhóm trưởng",
        BTC: "Ban tổ chức"
      }

      const evalDict: Record<string, string> = {
        XS: "Xuất sắc",
        TO: "Tốt",
        DA: "Đạt",
        KDA: "Chưa đạt",
        EXCELLENT: "Xuất sắc",
        GOOD: "Tốt",
        SATISFACTORY: "Đạt"
      }

      const localNormName = (n: any) => n ? String(n).trim().toLowerCase().replace(/\s+/g, " ") : ""
      const localSameTime = (a: any, b: any) => {
        if (!a || !b) return false
        return new Date(a).toDateString() === new Date(b).toDateString()
      }

      // Helper to process student record
      const processedStudents = students.map((s) => {
        // 1. Basic Info
        const yearName = s.academicYear?.name || ""
        const campusName = s.campus?.campusName || ""
        const classCode = s.class?.classCode || ""
        const className = s.class?.className || ""
        const studentCode = s.studentCode || ""
        const studentName = s.studentName || ""
        const gender = s.gender || ""
        const dob = safeDateToISO(s.dateOfBirth)
        const status = s.status || ""

        // 2. Career Orientation
        const orientation = s.careerOrientations?.[0]?.result || ""

        // 3. GVCN Comment
        const latestGvcnCommentObj = s.highlightComments
          ?.filter((c) => c.category !== "ANNOUNCEMENT")
          ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())?.[0]
        const latestGvcnComment = latestGvcnCommentObj ? `${latestGvcnCommentObj.comment} (Bởi ${latestGvcnCommentObj.teacherName})` : ""

        // 4. Learning Commitment
        const commitment = s.learningCommitments?.[0]
        const commitmentContent = commitment ? commitment.content : ""
        const commitmentStatus = commitment ? (commitment.status === "COMPLETED" ? "Hoàn thành" : commitment.status === "VIOLATED" ? "Vi phạm" : "Đang thực hiện") : ""

        // 5. Learning Support Target
        const supportObj = s.learningSupportTargets?.[0]
        const supportReason = supportObj ? `${supportObj.reason} (${supportObj.supportType === "ACADEMIC" ? "Học thuật" : "Tâm lý"})` : ""
        const supportTeacher = supportObj?.assignments?.[0]?.teacher?.teacherName || ""

        // 6. Match Entrance Survey
        let matchedSurvey = null
        let surveyType = ""
        
        matchedSurvey = k12Surveys.find((x) => x.studentCode === s.studentCode || x.enrollmentCode === s.studentCode)
        if (matchedSurvey) {
          surveyType = "K12"
        } else {
          matchedSurvey = preschoolSurveys.find((x) => x.studentCode === s.studentCode || x.enrollmentCode === s.studentCode)
          if (matchedSurvey) {
            surveyType = "PRESCHOOL"
          } else {
            matchedSurvey = k12Surveys.find((x) => localNormName(x.fullName) === localNormName(s.studentName) && localSameTime(x.dateOfBirth, s.dateOfBirth))
            if (matchedSurvey) {
              surveyType = "K12"
            } else {
              matchedSurvey = preschoolSurveys.find((x) => localNormName(x.fullName) === localNormName(s.studentName) && localSameTime(x.dateOfBirth, s.dateOfBirth))
              if (matchedSurvey) {
                surveyType = "PRESCHOOL"
              }
            }
          }
        }

        let admitted = "Không"
        let devAssessment = ""
        let probationaryComment = ""
        let mathScore = ""
        let literatureScore = ""
        let writtenEnglishScore = ""
        let oralEnglishScore = ""

        if (matchedSurvey) {
          admitted = matchedSurvey.admissionResult || "Đã trúng tuyển"

          if (surveyType === "K12") {
            const scores = matchedSurvey.scores || []
            let math = matchedSurvey.mathScore
            let lit = matchedSurvey.literatureScore
            let wEng = matchedSurvey.writtenEnglishScore
            let oEng = matchedSurvey.oralEnglishScore
            
            scores.forEach((sc) => {
              const sName = localNormName(sc.subject?.name)
              const scArr = sc.scores ? safeJsonParse(sc.scores, []) : []
              const scVal = Array.isArray(scArr) ? scArr.find((v) => v !== null && v !== undefined) : null
              if (sName.includes("toán") || sName.includes("math")) {
                if (scVal !== null) math = scVal
              } else if (sName.includes("tiếng việt") || sName.includes("ngữ văn") || sName.includes("literature")) {
                if (scVal !== null) lit = scVal
              } else if (sName.includes("tiếng anh")) {
                if (sName.includes("viết") || sName.includes("written")) {
                  if (scVal !== null) wEng = scVal
                } else if (sName.includes("vấn đáp") || sName.includes("nói") || sName.includes("oral")) {
                  if (scVal !== null) oEng = scVal
                }
              }
            })

            mathScore = math !== null && math !== undefined ? math : ""
            literatureScore = lit !== null && lit !== undefined ? lit : ""
            writtenEnglishScore = wEng !== null && wEng !== undefined ? wEng : ""
            oralEnglishScore = oEng !== null && oEng !== undefined ? oEng : ""
          } else if (surveyType === "PRESCHOOL") {
            probationaryComment = matchedSurvey.probationaryComment || ""
            const scores = preschoolScoresMap.get(matchedSurvey.id) || []
            devAssessment = scores.map((sc) => `${sc.criteria?.area?.name} - dots: ${sc.result}`).join("; ")
            if (!devAssessment) {
              devAssessment = matchedSurvey.devAssessmentResult || ""
            }
          }
        }

        return {
          id: s.id,
          yearName,
          campusName,
          classCode,
          className,
          class: s.class,
          studentCode,
          studentName,
          gender,
          dob,
          status,
          student: s,
          commitment: s.learningCommitments?.[0] || null,
          commitmentContent,
          commitmentStatus,
          orientation: s.careerOrientations?.[0] || null,
          achievements: s.achievements || [],
          projects: s.projectExperiences || [],
          experientialActivities: (() => {
            const studentP = allParticipants.filter((p) => {
              if (!p.student) return false
              return p.studentId === s.id || p.student.studentCode === s.studentCode || localNormName(p.student.studentName) === localNormName(s.studentName)
            })

            return studentP.map((p, idx) => {
              const roleCat = categories.find(c => c.id === p.roleId || c.code === p.roleId)
              const evalCat = categories.find(c => c.id === p.evalLevelId || c.code === p.evalLevelId)
              const groupCat = categories.find(c => c.id === p.record?.catalog?.groupId || c.code === p.record?.catalog?.groupId)

              const resolvedRole = roleCat?.name || (p.roleId ? roleDict[p.roleId] || p.roleId : "Tham gia")
              const resolvedEval = evalCat?.name || (p.evalLevelId ? evalDict[p.evalLevelId] || p.evalLevelId : "Đạt")
              const resolvedGroup = groupCat?.name || p.record?.catalog?.group?.name || "Hoạt động trải nghiệm"
              const resolvedName = p.record?.name || p.record?.catalog?.name || "Hoạt động trải nghiệm"

              return {
                id: p.id,
                stt: idx + 1,
                activityName: resolvedName.trim(),
                groupName: resolvedGroup.trim(),
                role: resolvedRole.trim(),
                evalLevel: resolvedEval.trim(),
                date: safeDateToISO(p.record?.date)
              }
            })
          })(),
          learningSupportTargets: s.learningSupportTargets || [],
          highlightComments: s.highlightComments || [],
          entranceSurvey: matchedSurvey ? {
            ...matchedSurvey,
            type: surveyType,
            scores: surveyType === "K12" ? (matchedSurvey.scores || []).map((sc) => ({
              subjectName: sc.subject?.name,
              scores: safeJsonParse(sc.scores, {}),
              comments: safeJsonParse(sc.comments, {})
            })) : (preschoolScoresMap.get(matchedSurvey.id) || []).map((s) => ({
              areaName: s.criteria?.area?.name,
              criterionName: s.criteria?.name,
              result: s.result,
              note: s.note
            }))
          } : null,
          transfers: s.studentTransfers || [],
          supportReason,
          supportTeacher,
          admitted,
          mathScore,
          literatureScore,
          writtenEnglishScore,
          oralEnglishScore,
          devAssessment,
          probationaryComment
        }
      })

      return NextResponse.json({
        success: true,
        count: processedStudents.length,
        data: processedStudents
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    if (action === "uploadAvatar") {
      const studentId = searchParams.get("studentId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const formData = await req.formData()
      const file = formData.get("file") as File
      if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const path = require("path")
      const fs = require("fs")
      const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filePath = path.join(uploadDir, `${studentId}.jpg`)
      fs.writeFileSync(filePath, buffer)

      return NextResponse.json({ success: true, url: `/uploads/students/${studentId}.jpg?t=${Date.now()}` })
    }

    const body = await req.json()

    if (action === "saveOrientation") {
      const { studentId, result, notes } = body
      if (!studentId || !result) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      const orientation = await prisma.studentCareerOrientation.upsert({
        where: { studentId },
        create: {
          studentId,
          result,
          notes,
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        },
        update: {
          result,
          notes,
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        }
      })
      return NextResponse.json(orientation)
    }

    if (action === "saveProjectExperience") {
      const { id, studentId, projectName, role, result, notes } = body
      if (!studentId || !projectName || !result) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (id) {
        // Edit existing project
        const project = await prisma.studentProjectExperience.update({
          where: { id },
          data: {
            projectName,
            role,
            result,
            notes,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(project)
      } else {
        // Create new project
        const project = await prisma.studentProjectExperience.create({
          data: {
            studentId,
            projectName,
            role,
            result,
            notes,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(project)
      }
    }

    if (action === "deleteProjectExperience") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

      await prisma.studentProjectExperience.delete({
        where: { id }
      })
      return NextResponse.json({ success: true })
    }

    if (action === "saveCommitment") {
      const { studentId, content, status, academicYearId } = body
      if (!studentId || !content || !academicYearId) {
        return NextResponse.json({ error: "Missing required fields: studentId, content, academicYearId" }, { status: 400 })
      }

      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      let commitment;
      if (existing) {
        commitment = await prisma.studentLearningCommitment.update({
          where: { id: existing.id },
          data: {
            content,
            status: status || "ACTIVE",
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
      } else {
        commitment = await prisma.studentLearningCommitment.create({
          data: {
            studentId,
            academicYearId,
            content,
            status: status || "ACTIVE",
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
      }
      return NextResponse.json(commitment)
    }

    if (action === "inheritCommitment") {
      const { studentId, academicYearId } = body
      if (!studentId || !academicYearId) {
        return NextResponse.json({ error: "Missing required fields: studentId, academicYearId" }, { status: 400 })
      }

      const previousCommitment = await prisma.studentLearningCommitment.findFirst({
        where: {
          studentId,
          academicYearId: { not: academicYearId }
        },
        orderBy: { createdAt: "desc" }
      })

      if (!previousCommitment) {
        return NextResponse.json({ error: "Không tìm thấy cam kết năm học cũ để kế thừa" }, { status: 404 })
      }

      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        return NextResponse.json({ error: "Cam kết cho năm học hiện tại đã tồn tại" }, { status: 400 })
      }

      const commitment = await prisma.studentLearningCommitment.create({
        data: {
          studentId,
          academicYearId,
          content: previousCommitment.content,
          status: "ACTIVE",
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        }
      })
      return NextResponse.json(commitment)
    }

    if (action === "saveHighlightComment") {
      const { id, studentId, comment, category } = body
      if (!studentId || !comment) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Verify that this teacher is the GVCN of this student
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true }
      })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      const isHomeroom = student.class.homeroomTeacherId === teacher.id || 
                         (student.class.homeroomTeacherId && student.class.homeroomTeacherId.includes(teacher.id))
      
      if (!isHomeroom) {
        return NextResponse.json({ error: "Only homeroom teacher (GVCN) can add outstanding comments" }, { status: 403 })
      }

      if (id) {
        const record = await prisma.studentHighlightComment.update({
          where: { id },
          data: {
            comment,
            category,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(record)
      } else {
        const record = await prisma.studentHighlightComment.create({
          data: {
            studentId,
            comment,
            category,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(record)
      }
    }

    if (action === "deleteHighlightComment") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

      await prisma.studentHighlightComment.delete({
        where: { id }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
