// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

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

function parseCommittedSubjects(note?: string | null, resultStr?: string | null, className?: string): string[] {
  const text = `${note || ""} ${resultStr || ""}`.trim()
  if (!text) return []
  
  let rawSubs: string[] = []
  const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i)
  if (match && match[1]) {
    rawSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  }

  if (rawSubs.length === 0) {
    if (/Toán|Math/i.test(text)) rawSubs.push("Môn Toán")
    if (/Tiếng Việt/i.test(text)) rawSubs.push("Tiếng Việt")
    else if (/Ngữ văn|Literature/i.test(text)) rawSubs.push("Ngữ Văn")
    else if (/Văn/i.test(text)) {
      if (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) rawSubs.push("Tiếng Việt")
      else rawSubs.push("Ngữ Văn")
    }
    if (/Tiếng Anh\s*\(viết\)|Anh\s*\(viết\)|English\s*\(written\)/i.test(text)) {
      rawSubs.push("Tiếng Anh (viết)")
    }
    if (/Tiếng Anh\s*\(vấn đáp\)|Anh\s*\(vấn đáp\)|English\s*\(oral\)/i.test(text)) {
      rawSubs.push("Tiếng Anh (vấn đáp)")
    }
    if (rawSubs.every(s => !s.includes("Tiếng Anh")) && /Anh|English/i.test(text)) {
      rawSubs.push("Tiếng Anh")
    }
    if (/Tâm lý|Psychology/i.test(text)) rawSubs.push("Tâm lý")
  }

  const finalSubs: string[] = []
  rawSubs.forEach((s) => {
    const clean = s.trim().replace(/^môn\s+/i, "")
    const lower = clean.toLowerCase()
    if (lower.includes("tiếng việt") || lower === "tv") {
      if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt")
    } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature")) {
      if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn")
    } else if (lower === "văn" || lower.includes("văn")) {
      if (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) {
        if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt")
      } else {
        if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn")
      }
    } else if (lower.includes("toán") || lower.includes("math")) {
      if (!finalSubs.includes("Môn Toán")) finalSubs.push("Môn Toán")
    } else if (lower.includes("anh") || lower.includes("english")) {
      if (!finalSubs.includes(clean)) finalSubs.push(clean)
    } else if (lower.includes("tâm lý") || lower.includes("psychology")) {
      if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý")
    } else {
      if (!finalSubs.includes(clean)) finalSubs.push(clean)
    }
  })

  return finalSubs
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true
      }
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
              ...(academicYearId ? { academicYearId } : {}),
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

      // Parallel batch query for entrance survey match (K12 & Preschool)
      const pAny = prisma as any
      const [k12ByCode, k12ByDOB, preschoolByCode, preschoolByDOB] = await Promise.all([
        studentCodes.length > 0
          ? prisma.inputAssessmentStudent.findMany({
              where: {
                OR: [
                  { studentCode: { in: studentCodes } },
                  { enrollmentCode: { in: studentCodes } }
                ]
              },
              select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
            })
          : Promise.resolve([]),
        studentDOBs.length > 0
          ? prisma.inputAssessmentStudent.findMany({
              where: { dateOfBirth: { in: studentDOBs as any[] } },
              select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
            })
          : Promise.resolve([]),
        pAny.preschoolInputAssessmentStudent && studentCodes.length > 0
          ? pAny.preschoolInputAssessmentStudent.findMany({
              where: {
                OR: [
                  { studentCode: { in: studentCodes } },
                  { enrollmentCode: { in: studentCodes } }
                ]
              },
              select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
            })
          : Promise.resolve([]),
        pAny.preschoolInputAssessmentStudent && studentDOBs.length > 0
          ? pAny.preschoolInputAssessmentStudent.findMany({
              where: { dateOfBirth: { in: studentDOBs } },
              select: { studentCode: true, enrollmentCode: true, fullName: true, dateOfBirth: true }
            })
          : Promise.resolve([])
      ])

      // Merge and deduplicate
      const k12CandidateMap = new Map<string, any>()
      ;[...k12ByCode, ...k12ByDOB].forEach(c => k12CandidateMap.set(c.studentCode + '|' + c.fullName, c))
      const k12Candidates = Array.from(k12CandidateMap.values())

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

      const cleanString = (str: string) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

      const result = students.map(s => {
        const assessment = inputAssessments.find((a) => {
          if (a.studentCode === s.studentCode || a.enrollmentCode === s.studentCode) {
            return true
          }
          return cleanString(a.fullName) === cleanString(s.studentName)
        })
        return {
          ...s,
          entranceCommitmentSubjects: assessment ? parseCommittedSubjects(assessment.directorNote, assessment.admissionResult, s.class?.className || s.className || "") : []
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

      const cleanString = (str: string) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

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

          const committedSubjects = parseCommittedSubjects(assessment.directorNote, assessment.admissionResult, s.class?.className || s.className || "")
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
      if (!teacherId || !academicYearId) {
        return NextResponse.json({ error: "Missing teacherId or academicYearId" }, { status: 400 })
      }

      // Find all teaching assignments for this teacher in this academic year
      const assignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId,
          class: {
            academicYearId
          }
        },
        include: {
          class: true,
          subject: true
        }
      })

      // Find all homeroom classes for this teacher in this academic year
      const homeroomClasses = await prisma.class.findMany({
        where: {
          academicYearId,
          OR: [
            { homeroomTeacherId: teacherId },
            { homeroomTeacherId: { contains: teacherId } }
          ]
        }
      })

      // Collect all class IDs
      const classIds = Array.from(new Set([
        ...assignments.map(a => a.classId),
        ...homeroomClasses.map(c => c.id)
      ]))

      if (classIds.length === 0) {
        return NextResponse.json([])
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

      const cleanString = (str: string) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

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

          // Determine if the teacher teaches any of the committed subjects in this student's class
          const isHomeroom = homeroomClasses.some(c => c.id === s.classId)
          const teacherSubjectsInClass = assignments
            .filter(a => a.classId === s.classId)
            .map(a => a.subject?.name || a.subject?.subjectName || "")

          const matchedSubjects = committedSubjects.filter((cs: string) => {
            const cleanCS = cs.toLowerCase()
            return teacherSubjectsInClass.some(ts => {
              const cleanTS = ts.toLowerCase()
              if (cleanTS.includes("toán")) {
                return cleanCS.includes("môn toán") || cleanCS.includes("toán")
              }
              if (cleanTS.includes("tiếng việt") || cleanTS.includes("ngữ văn") || cleanTS.includes("văn")) {
                return cleanCS.includes("tiếng việt") || cleanCS.includes("ngữ văn") || cleanCS.includes("văn")
              }
              if (cleanTS.includes("tiếng anh") || cleanTS.includes("anh")) {
                return cleanCS.includes("tiếng anh") || cleanCS.includes("anh")
              }
              return cleanCS.includes(cleanTS) || cleanTS.includes(cleanCS)
            })
          })

          // Include if it is Homeroom class OR if there is at least one matched subject
          if (!isHomeroom && matchedSubjects.length === 0) return null

          // Resolve scores from assessment.scores if root fields are null
          let mathScore = assessment.mathScore
          let literatureScore = assessment.literatureScore
          let writtenEnglishScore = assessment.writtenEnglishScore
          let oralEnglishScore = assessment.oralEnglishScore
          let psychologyScore = assessment.psychologyScore

          if (assessment.scores && assessment.scores.length > 0) {
            assessment.scores.forEach((sc: any) => {
              const sName = (sc.subject?.name || sc.subjectName || "").toLowerCase().normalize("NFC")
              const sCode = (sc.subject?.code || "").toLowerCase()
              let val: any = null
              try {
                if (sc.scores) {
                  const parsed = JSON.parse(sc.scores)
                  const vArr = Array.isArray(parsed) ? parsed : [parsed]
                  val = vArr.find((x: any) => x !== undefined && x !== "" && x !== null)
                }
              } catch {
                val = sc.scores
              }
              if (val !== null && val !== undefined && val !== "") {
                const numVal = parseFloat(val)
                const finalVal = isNaN(numVal) ? val : numVal
                if (sName.includes("toán") || sCode.includes("math") || sCode.includes("toa")) {
                  if (mathScore == null) mathScore = finalVal
                } else if (sName.includes("tiếng việt") || sName.includes("ngữ văn") || sCode.includes("lit") || sCode.includes("nva") || sCode.includes("van")) {
                  if (literatureScore == null) literatureScore = finalVal
                } else if (sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("tav") || sCode.includes("esl")) {
                  if (sName.includes("viết") || sName.includes("written") || sCode.includes("vt") || sCode === "tav") {
                    if (writtenEnglishScore == null) writtenEnglishScore = finalVal
                  } else if (sName.includes("vấn đáp") || sName.includes("nói") || sName.includes("oral") || sCode.includes("vd") || sCode === "tavd") {
                    if (oralEnglishScore == null) oralEnglishScore = finalVal
                  }
                }
              }
            })
          }

          const wNum = parseFloat(writtenEnglishScore)
          const oNum = parseFloat(oralEnglishScore)
          const totalEnglishScore = (!isNaN(wNum) || !isNaN(oNum)) ? (isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum) : null

          return {
            id: s.id,
            studentName: s.studentName,
            studentCode: s.studentCode,
            classId: s.classId,
            className: s.class?.className || "",
            committedSubjects,
            matchedSubjects,
            isHomeroom,
            admissionResult: assessment.admissionResult,
            directorNote: assessment.directorNote,
            enrollmentDate: assessment.enrollmentDate,
            mathScore,
            literatureScore,
            writtenEnglishScore,
            oralEnglishScore,
            totalEnglishScore,
            psychologyScore,
            scores: assessment.scores
          }
        })
        .filter(Boolean)

      return NextResponse.json(candidates)
    }

    if (action === "getPsychologicalSupportStudents") {
      let academicYearId = searchParams.get("academicYearId")
      const classIdParam = searchParams.get("classId")
      if (!academicYearId) {
        const activeYear = await prisma.academicYear.findFirst({
          where: { status: "ACTIVE", isOff: false }
        }) || await prisma.academicYear.findFirst({ orderBy: { startDate: "desc" } })
        academicYearId = activeYear?.id
      }
      if (!academicYearId) {
        return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
      }

      // 1. Homeroom classes of this teacher in the given academic year
      const hrClasses = await prisma.class.findMany({
        where: {
          academicYearId,
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ]
        },
        select: { id: true }
      })

      // 2. Teaching assignments of this teacher in the given academic year
      const teachingAssignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId: teacher.id,
          academicYearId
        },
        select: { classId: true }
      })

      // 3. Learning support assignments for this teacher in the given academic year
      const supportAssignments = await prisma.learningSupportAssignment.findMany({
        where: {
          teacherId: teacher.id,
          target: {
            academicYearId,
            supportType: "PSYCHOLOGICAL"
          }
        },
        include: {
          target: {
            select: {
              studentId: true,
              student: { select: { classId: true } }
            }
          }
        }
      })

      const roleParam = searchParams.get("role")
      const deptName = (teacher.departmentRel?.name || "").toLowerCase()
      const isPsychSpecialist = 
        deptName.includes("tlhn") || 
        deptName.includes("tâm lý") || 
        deptName.includes("tư vấn") ||
        ["ADMIN", "BGH", "BGH_MN", "TVAN"].includes(session.user?.role) ||
        ["TTCM", "QLCM", "HT", "HP"].includes(teacher.position)

      let targetClassIds = Array.from(new Set([
        ...hrClasses.map(c => c.id),
        ...teachingAssignments.map(ta => ta.classId),
        ...supportAssignments.map(sa => sa.target?.student?.classId).filter(Boolean)
      ]))

      // If viewing in HOMEROOM mode, strictly only query homeroom classes of this teacher
      if (roleParam === "HOMEROOM") {
        targetClassIds = hrClasses.map(c => c.id)
      } else if (roleParam === "ASSIGNED") {
        const hrIds = new Set(hrClasses.map(c => c.id))
        targetClassIds = teachingAssignments.map(ta => ta.classId).filter(id => !hrIds.has(id))
      }

      // If user is admin or psych specialist and has no specific classes assigned:
      if ((targetClassIds.length === 0 && isPsychSpecialist) || session.user?.role === "ADMIN") {
        const allClassesWithPsych = await prisma.learningSupportTarget.findMany({
          where: {
            academicYearId,
            supportType: "PSYCHOLOGICAL"
          },
          select: {
            student: { select: { classId: true } }
          }
        })
        const psychClassIds = allClassesWithPsych.map(t => t.student?.classId).filter(Boolean)
        targetClassIds = Array.from(new Set(psychClassIds))
      }

      if (classIdParam && classIdParam !== "ALL") {
        targetClassIds = targetClassIds.filter(id => id === classIdParam)
        if (targetClassIds.length === 0) {
          targetClassIds = [classIdParam]
        }
      }

      if (targetClassIds.length === 0) {
        return NextResponse.json([])
      }

      // Fetch all students in these target classes
      const students = await prisma.student.findMany({
        where: {
          classId: { in: targetClassIds },
          academicYearId
        },
        include: {
          class: {
            include: {
              campus: true,
              teachingAssignments: {
                include: {
                  teacher: true,
                  subject: true
                }
              }
            }
          },
          campus: true
        },
        orderBy: {
          studentName: "asc"
        }
      })

      // Also include any students explicitly assigned to this teacher who might be in another class (non-homeroom only)
      const assignedTargetStudentIds = roleParam === "HOMEROOM" ? [] : supportAssignments.map(sa => sa.target?.studentId).filter(Boolean)
      const existingStudentIds = new Set(students.map(s => s.id))
      const extraStudentIds = assignedTargetStudentIds.filter(id => !existingStudentIds.has(id))
      if (extraStudentIds.length > 0) {
        const extraStudents = await prisma.student.findMany({
          where: { id: { in: extraStudentIds }, academicYearId },
          include: {
            class: {
              include: {
                campus: true,
                teachingAssignments: {
                  include: {
                    teacher: true,
                    subject: true
                  }
                }
              }
            },
            campus: true
          }
        })
        students.push(...extraStudents)
      }

      const studentIds = students.map(s => s.id)
      const studentCodes = students.map(s => s.studentCode).filter(Boolean)
      const studentNames = students.map(s => s.studentName).filter(Boolean)

      // Fetch psychological targets for these students
      const targets = await prisma.learningSupportTarget.findMany({
        where: {
          studentId: { in: studentIds },
          academicYearId,
          supportType: "PSYCHOLOGICAL"
        },
        include: {
          assignments: {
            include: {
              teacher: true
            }
          },
          evaluations: {
            orderBy: { createdAt: "desc" }
          },
          createdBy: true
        }
      })

      // Fetch InputAssessmentStudent records for these students
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { studentCode: { in: studentCodes } },
            { enrollmentCode: { in: studentCodes } },
            { fullName: { in: studentNames } }
          ]
        },
        include: {
          period: true,
          batch: true,
          scores: {
            include: {
              subject: true
            }
          }
        }
      })

      // Fetch InputAssessmentTeacherAssignments for TLY
      const psychTeacherAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
        where: {
          subject: {
            code: "TLY"
          }
        },
        include: {
          user: true
        }
      })

      const OFFICIAL_DIMENSIONS = [
        { id: 1, title: "Cảm xúc và điều hòa cảm xúc (4 mục)", maxScore: 16 },
        { id: 2, title: "Hành vi - Kiểm soát bản thân (3 mục)", maxScore: 12 },
        { id: 3, title: "Quan hệ xã hội & tương tác nhóm (3 mục)", maxScore: 12 },
        { id: 4, title: "Học tập & khả năng tự định hướng / Chú ý (4 mục)", maxScore: 16 },
        { id: 5, title: "Tự nhận thức / Ngôn ngữ & Tư duy (3 mục)", maxScore: 12 },
        { id: 6, title: "Động lực & định hướng tương lai (3 mục)", maxScore: 12 }
      ]

      const cleanString = (str: string) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

      const result = []

      for (const student of students) {
        const studentTargets = targets.filter(t => t.studentId === student.id)
        const primaryTarget = studentTargets[0] || null

        const assessment = inputAssessments.find(a => 
          a.studentCode === student.studentCode || 
          a.enrollmentCode === student.studentCode ||
          cleanString(a.fullName) === cleanString(student.studentName)
        )

        // Find score for subject TLY
        const psychScoreRecord = assessment?.scores?.find(sc => 
          sc.subject?.code === "TLY" || 
          sc.subject?.name?.toLowerCase().includes("tâm lý")
        )

        // Only include students who have a psychological score OR a psychological support target
        if (!psychScoreRecord && !primaryTarget) {
          continue
        }

        // 1. Resolve Teacher: get the real teacher assigned to the Psychology subject
        let counselorName = ""
        let counselorRole = "GV Phụ trách Môn Tâm lý"

        // Priority 1: From the actual StudentAssessmentScore record
        if (psychScoreRecord?.teacherName && psychScoreRecord.teacherName.trim()) {
          counselorName = psychScoreRecord.teacherName.trim()
        }

        // Priority 2: From InputAssessmentTeacherAssignment matching period, batch, grade
        if (!counselorName && assessment) {
          const matchIata = psychTeacherAssignments.find(a => 
            a.periodId === assessment.periodId &&
            (!a.batchId || a.batchId === assessment.batchId) &&
            (!a.grade || a.grade === student.class?.grade || a.grade === assessment.grade)
          )
          if (matchIata?.user?.fullName) {
            counselorName = matchIata.user.fullName.trim()
          }
        }

        // Priority 3: From class teaching assignments for subject Tâm lý
        if (!counselorName) {
          const classPsychTa = student.class?.teachingAssignments?.find(ta => 
            ta.subject?.code === "TLY" || 
            ta.subject?.subjectCode === "TLY" ||
            (ta.subject?.name || "").toLowerCase().includes("tâm lý") ||
            (ta.subject?.subjectName || "").toLowerCase().includes("tâm lý")
          )
          if (classPsychTa?.teacher?.teacherName || classPsychTa?.teacher?.fullName) {
            counselorName = (classPsychTa.teacher.teacherName || classPsychTa.teacher.fullName).trim()
          }
        }

        // Priority 3.5: If logged in teacher is assigned to teach Tâm lý for this class
        if (!counselorName && teacher?.teacherName) {
          const isCurrentTeacherPsych = student.class?.teachingAssignments?.some(ta =>
            ta.teacherId === teacher.id &&
            (ta.subject?.code === "TLY" || ta.subject?.subjectCode === "TLY" || (ta.subject?.subjectName || "").toLowerCase().includes("tâm lý"))
          )
          if (isCurrentTeacherPsych) {
            counselorName = teacher.teacherName.trim()
          }
        }

        // Priority 4: From LearningSupportTarget assignments
        if (!counselorName && primaryTarget?.assignments?.[0]?.teacher) {
          const t = primaryTarget.assignments[0].teacher
          counselorName = (t.teacherName || t.fullName || "").trim()
          if (counselorName) counselorRole = "GV Tham vấn / Hỗ trợ Tâm lý"
        }

        if (!counselorName) {
          counselorName = "Chưa phân công"
          counselorRole = "Môn Tâm lý"
        }

        // 2. Parse scores and comments strictly from the teacher's evaluation
        let parsedScores: any[] = []
        let parsedComments: any[] = []
        if (psychScoreRecord?.scores) {
          try {
            const raw = JSON.parse(psychScoreRecord.scores)
            parsedScores = Array.isArray(raw) ? raw : [raw]
          } catch {
            parsedScores = []
          }
        }
        if (psychScoreRecord?.comments) {
          try {
            const raw = JSON.parse(psychScoreRecord.comments)
            parsedComments = Array.isArray(raw) ? raw : [raw]
          } catch {
            parsedComments = []
          }
        }

        // 6 Dimensions scores from official schema
        const dimensionScores = OFFICIAL_DIMENSIONS.map((dim, idx) => ({
          ...dim,
          score: parsedScores[idx] !== undefined && parsedScores[idx] !== null && parsedScores[idx] !== "" ? Number(parsedScores[idx]) : null
        }))

        // Total score is at index 6 in the official schema
        const totalScore = parsedScores[6] !== undefined && parsedScores[6] !== null && parsedScores[6] !== "" 
          ? Number(parsedScores[6]) 
          : (assessment?.psychologyScore ?? null)

        const teacherLevelComment = (parsedComments[0] || "").trim()
        const teacherConclusion = (parsedComments[1] || "").trim()

        // 3. Resolve "Vấn đề / Lý do hỗ trợ" strictly from teacher evaluation or target reason
        let displayReason = ""
        if (teacherLevelComment) {
          displayReason = teacherLevelComment
          if (teacherConclusion && teacherConclusion !== teacherLevelComment) {
            displayReason += ` - ${teacherConclusion}`
          }
        } else if (primaryTarget?.reason) {
          displayReason = primaryTarget.reason
        } else if (teacherConclusion) {
          displayReason = teacherConclusion
        } else {
          displayReason = "Chưa có nhận xét tâm lý"
        }

        // 4. Resolve status strictly based on real evaluation / target
        let displayStatus = "BÌNH THƯỜNG"
        if (primaryTarget?.status) {
          displayStatus = primaryTarget.status
        } else if (totalScore !== null && totalScore < 0) {
          displayStatus = "CẦN THEO DÕI"
        } else if (teacherLevelComment && (
          teacherLevelComment.toLowerCase().includes("thấp") || 
          teacherLevelComment.toLowerCase().includes("hạn chế") || 
          teacherLevelComment.toLowerCase().includes("khó khăn") || 
          teacherLevelComment.toLowerCase().includes("chú ý") ||
          teacherLevelComment.toLowerCase().includes("chưa")
        )) {
          displayStatus = "CẦN THEO DÕI"
        } else if (totalScore === 0 || teacherLevelComment.toLowerCase().includes("bình thường") || teacherLevelComment.toLowerCase().includes("đạt")) {
          displayStatus = "ĐÃ ỔN ĐỊNH"
        } else {
          displayStatus = "ĐANG THEO DÕI"
        }

        // 5. Start Date: actual date teacher evaluated
        const startDate = psychScoreRecord?.updatedAt || primaryTarget?.startDate || assessment?.enrollmentDate || student.createdAt

        result.push({
          id: primaryTarget?.id || `psych_${student.id}`,
          targetId: primaryTarget?.id || null,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          classId: student.classId,
          className: student.class?.className || "",
          campusId: student.campusId || student.class?.campusId || "",
          campusName: student.campus?.campusName || student.class?.campus?.campusName || "Sky-Line",
          counselorName,
          counselorRole,
          startDate,
          reason: displayReason,
          notes: primaryTarget?.notes || "",
          totalScore,
          status: displayStatus,
          terminationStatus: primaryTarget?.terminationStatus || "ACTIVE",
          evaluations: primaryTarget?.evaluations || [],
          psychologyAssessment: {
            hasAssessment: !!psychScoreRecord,
            evaluatorName: counselorName,
            evaluatorRole: counselorRole,
            evaluatedAt: psychScoreRecord?.updatedAt || null,
            totalScore,
            levelComment: teacherLevelComment,
            conclusion: teacherConclusion,
            dimensionScores,
            rawScores: parsedScores,
            rawComments: parsedComments,
            directorNote: assessment?.directorNote || "",
            admissionResult: assessment?.admissionResult || ""
          }
        })
      }

      return NextResponse.json(result)
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
          orientation = await prisma.studentCareerOrientation.findFirst({
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
              where: {
                OR: [
                  { studentId: student.id },
                  ...(student.studentCode ? [{ student: { studentCode: student.studentCode } }] : [])
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
          } catch (err) {
            console.error("Error fetching scoped activityParticipants in getStudentRecord:", err)
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
          };

          const strandDict: Record<string, string> = {
            BAN_THAN: "Hướng vào bản thân",
            XA_HOI: "Hướng đến xã hội",
            TU_NHIEN: "Hướng đến tự nhiên",
            HUONG_NGHIEP: "Hướng nghiệp"
          };

          const evalResultDict: Record<string, string> = {
            DAT_XUAT_SAC: "Xuất sắc",
            DAT_TOT: "Tốt",
            DAT: "Đạt",
            CAN_HO_TRO: "Cần hỗ trợ",
            CHUA_DAT: "Chưa đạt",
            THAM_GIA: "Tham gia",
            CHUA_DANH_GIA: "Đang thực hiện",
            XS: "Xuất sắc",
            TO: "Tốt",
            DA: "Đạt",
            KDA: "Chưa đạt",
            EXCELLENT: "Xuất sắc",
            GOOD: "Tốt",
            SATISFACTORY: "Đạt"
          };

          experientialActivities = (activityParticipants || []).map((p, idx) => {
            let pNote: any = {};
            try {
              if (p?.note && typeof p.note === "string" && p.note.startsWith("{")) {
                pNote = JSON.parse(p.note);
              } else if (p?.note && typeof p.note === "object") {
                pNote = p.note;
              }
            } catch {}

            let recMeta: any = {};
            try {
              if (p?.record?.locationId && typeof p.record.locationId === "string" && p.record.locationId.startsWith("{")) {
                recMeta = JSON.parse(p.record.locationId);
              }
            } catch {}

            const roleCat = categories.find(c => c?.id === p?.roleId || c?.code === p?.roleId);
            const evalCat = categories.find(c => c?.id === p?.evalLevelId || c?.code === p?.evalLevelId);
            const groupCat = categories.find(c => c?.id === p?.record?.catalog?.groupId || c?.code === p?.record?.catalog?.groupId);

            let resolvedRole = "Thành viên";
            if (Array.isArray(pNote.roles) && pNote.roles.length > 0) {
              resolvedRole = pNote.roles.join(", ");
            } else {
              resolvedRole = roleCat?.name || (p?.roleId ? roleDict[p.roleId] || p.roleId : "Thành viên");
            }

            let resolvedEval = "Đang tham gia";
            if (pNote.finalResult) {
              resolvedEval = evalResultDict[pNote.finalResult] || pNote.finalResult;
            } else {
              resolvedEval = evalCat?.name || (p?.evalLevelId ? evalDict[p.evalLevelId] || evalResultDict[p.evalLevelId] || p.evalLevelId : "Đạt");
            }

            const resolvedGroup = (recMeta.strand && strandDict[recMeta.strand])
              || recMeta.activityTypeName
              || groupCat?.name
              || p?.record?.catalog?.group?.name
              || "Hoạt động trải nghiệm";

            const resolvedName = p?.record?.name || recMeta.activityName || p?.record?.catalog?.name || "Hoạt động trải nghiệm";

            return {
              id: p?.id || String(idx),
              stt: idx + 1,
              activityId: p?.recordId || p?.record?.id,
              activityName: (resolvedName || "").trim(),
              groupName: (resolvedGroup || "").trim(),
              strand: recMeta.strand || undefined,
              role: (resolvedRole || "").trim(),
              evalLevel: (resolvedEval || "").trim(),
              score: pNote.calculatedPercent !== null && pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : undefined,
              attendance: pNote.attendance || "PRESENT",
              remarks: [...(pNote.remarksQuick || []), pNote.remarksCustom].filter(Boolean).join("; ") || undefined,
              date: safeDateToISO(p?.record?.date)
            };
          });
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
            let mathScore = generalSurvey.mathScore
            let literatureScore = generalSurvey.literatureScore
            let writtenEnglishScore = generalSurvey.writtenEnglishScore
            let oralEnglishScore = generalSurvey.oralEnglishScore
            let psychologyScore = generalSurvey.psychologyScore

            if (generalSurvey.scores && generalSurvey.scores.length > 0) {
              generalSurvey.scores.forEach((sc: any) => {
                const sName = (sc.subject?.name || sc.subjectName || "").toLowerCase().normalize("NFC")
                const sCode = (sc.subject?.code || "").toLowerCase()
                let val: any = null
                try {
                  if (sc.scores) {
                    const parsed = JSON.parse(sc.scores)
                    const vArr = Array.isArray(parsed) ? parsed : [parsed]
                    val = vArr.find((x: any) => x !== undefined && x !== "" && x !== null)
                  }
                } catch {
                  val = sc.scores
                }
                if (val !== null && val !== undefined && val !== "") {
                  const numVal = parseFloat(val)
                  const finalVal = isNaN(numVal) ? val : numVal
                  if (sName.includes("toán") || sCode.includes("math") || sCode.includes("toa")) {
                    if (mathScore == null) mathScore = finalVal
                  } else if (sName.includes("tiếng việt") || sName.includes("ngữ văn") || sCode.includes("lit") || sCode.includes("nva") || sCode.includes("van")) {
                    if (literatureScore == null) literatureScore = finalVal
                  } else if (sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("tav") || sCode.includes("esl")) {
                    if (sName.includes("viết") || sName.includes("written") || sCode.includes("vt") || sCode === "tav") {
                      if (writtenEnglishScore == null) writtenEnglishScore = finalVal
                    } else if (sName.includes("vấn đáp") || sName.includes("nói") || sName.includes("oral") || sCode.includes("vd") || sCode === "tavd") {
                      if (oralEnglishScore == null) oralEnglishScore = finalVal
                    }
                  }
                }
              })
            }

            const wNum = parseFloat(writtenEnglishScore)
            const oNum = parseFloat(oralEnglishScore)
            const totalEnglishScore = (!isNaN(wNum) || !isNaN(oNum)) ? (isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum) : null

            entranceSurvey = {
              ...generalSurvey,
              mathScore,
              literatureScore,
              writtenEnglishScore,
              oralEnglishScore,
              totalEnglishScore,
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

      // Fetch all teachers to resolve homeroom teachers (GVCN)
      const allTeachersList = await prisma.teacher.findMany({
        select: {
          id: true,
          teacherName: true,
          homeroomClass: true,
        }
      });
      const tMap = new Map<string, string>();
      for (const t of allTeachersList) {
        if (t.id && t.teacherName) tMap.set(t.id, t.teacherName);
      }

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

        let homeroomTeacherName = "";
        if (s.class?.homeroomTeacherId) {
          const ids = s.class.homeroomTeacherId.split(",").map((id: string) => id.trim()).filter(Boolean);
          const names = ids.map((id: string) => tMap.get(id)).filter(Boolean);
          if (names.length > 0) homeroomTeacherName = names.join(", ");
        }
        if (!homeroomTeacherName) homeroomTeacherName = "Chưa phân công";

        return {
          id: s.id,
          homeroomTeacherName,
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

            const strandDict: Record<string, string> = {
              BAN_THAN: "Hướng vào bản thân",
              XA_HOI: "Hướng đến xã hội",
              TU_NHIEN: "Hướng đến tự nhiên",
              HUONG_NGHIEP: "Hướng nghiệp"
            };

            const evalResultDict: Record<string, string> = {
              DAT_XUAT_SAC: "Xuất sắc",
              DAT_TOT: "Tốt",
              DAT: "Đạt",
              CAN_HO_TRO: "Cần hỗ trợ",
              CHUA_DAT: "Chưa đạt",
              THAM_GIA: "Tham gia",
              CHUA_DANH_GIA: "Đang thực hiện",
              XS: "Xuất sắc",
              TO: "Tốt",
              DA: "Đạt",
              KDA: "Chưa đạt",
              EXCELLENT: "Xuất sắc",
              GOOD: "Tốt",
              SATISFACTORY: "Đạt"
            };

            return studentP.map((p, idx) => {
              let pNote: any = {};
              try {
                if (p?.note && typeof p.note === "string" && p.note.startsWith("{")) {
                  pNote = JSON.parse(p.note);
                } else if (p?.note && typeof p.note === "object") {
                  pNote = p.note;
                }
              } catch {}

              let recMeta: any = {};
              try {
                if (p?.record?.locationId && typeof p.record.locationId === "string" && p.record.locationId.startsWith("{")) {
                  recMeta = JSON.parse(p.record.locationId);
                }
              } catch {}

              const roleCat = categories.find(c => c.id === p.roleId || c.code === p.roleId);
              const evalCat = categories.find(c => c.id === p.evalLevelId || c.code === p.evalLevelId);
              const groupCat = categories.find(c => c.id === p.record?.catalog?.groupId || c.code === p.record?.catalog?.groupId);

              let resolvedRole = "Thành viên";
              if (Array.isArray(pNote.roles) && pNote.roles.length > 0) {
                resolvedRole = pNote.roles.join(", ");
              } else {
                resolvedRole = roleCat?.name || (p.roleId ? roleDict[p.roleId] || p.roleId : "Thành viên");
              }

              let resolvedEval = "Đang tham gia";
              if (pNote.finalResult) {
                resolvedEval = evalResultDict[pNote.finalResult] || pNote.finalResult;
              } else {
                resolvedEval = evalCat?.name || (p.evalLevelId ? evalDict[p.evalLevelId] || evalResultDict[p.evalLevelId] || p.evalLevelId : "Đạt");
              }

              const resolvedGroup = (recMeta.strand && strandDict[recMeta.strand])
                || recMeta.activityTypeName
                || groupCat?.name
                || p.record?.catalog?.group?.name
                || "Hoạt động trải nghiệm";

              const resolvedName = p.record?.name || recMeta.activityName || p.record?.catalog?.name || "Hoạt động trải nghiệm";

              return {
                id: p.id,
                stt: idx + 1,
                activityId: p.recordId || p.record?.id,
                activityName: (resolvedName || "").trim(),
                groupName: (resolvedGroup || "").trim(),
                strand: recMeta.strand || undefined,
                role: (resolvedRole || "").trim(),
                evalLevel: (resolvedEval || "").trim(),
                score: pNote.calculatedPercent !== null && pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : undefined,
                attendance: pNote.attendance || "PRESENT",
                remarks: [...(pNote.remarksQuick || []), pNote.remarksCustom].filter(Boolean).join("; ") || undefined,
                date: safeDateToISO(p.record?.date)
              };
            });
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
