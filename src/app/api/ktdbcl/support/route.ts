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


export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const academicYearId = searchParams.get("academicYearId")

  if (!academicYearId) {
    return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
  }

  try {
    const userRole = (session.user as any)?.role || ""
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

    // 1. Action: getConfigs
    if (action === "getConfigs") {
      const configs = await prisma.learningSupportOutcomeConfig.findMany({
        where: { academicYearId },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(configs)
    }

    // 2. Action: getTargets
    if (action === "getTargets") {
      // For teachers: filter to only targets relevant to this teacher
      // For admin/GDCS/KTDBCL: return all targets
      const callerTeacher = (!isGDCS && !isKTDBCL)
        ? await prisma.teacher.findUnique({ where: { userId: session.user.id } })
        : null

      let teacherClassIds: string[] = []
      if (callerTeacher) {
        const [assignments, homeroomClasses] = await Promise.all([
          prisma.teachingAssignment.findMany({
            where: { teacherId: callerTeacher.id, academicYearId },
            select: { classId: true }
          }),
          prisma.class.findMany({
            where: {
              academicYearId,
              OR: [
                { homeroomTeacherId: callerTeacher.id },
                { homeroomTeacherId: { contains: callerTeacher.id } }
              ]
            },
            select: { id: true }
          })
        ])
        teacherClassIds = Array.from(new Set([
          ...assignments.map((a: any) => a.classId),
          ...homeroomClasses.map((c: any) => c.id)
        ]))
      }

      const whereClause: any = { academicYearId }
      if (callerTeacher) {
        const orConditions: any[] = [
          { createdById: callerTeacher.id },
          { assignments: { some: { teacherId: callerTeacher.id } } }
        ]
        if (teacherClassIds.length > 0) {
          orConditions.push({ student: { classId: { in: teacherClassIds } } })
        }
        whereClause.OR = orConditions
      }

      const targets = await prisma.learningSupportTarget.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              gender: true,
              classId: true,
              class: {
                select: {
                  className: true,
                  classCode: true,
                  campusId: true,
                  campus: { select: { campusName: true } }
                }
              }
            }
          },
          assignments: {
            include: {
              teacher: { select: { id: true, teacherName: true } },
              subject: { select: { id: true, subjectName: true } }
            }
          },
          evaluations: true,
          createdBy: {
            select: {
              id: true,
              teacherName: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })

      // Fetch student commitments from input assessment student records
      const studentCodes = targets.map((t) => t.student?.studentCode).filter(Boolean);
      const studentNames = targets.map((t) => t.student?.studentName).filter(Boolean);

      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { studentCode: { in: studentCodes } },
            { enrollmentCode: { in: studentCodes } },
            { fullName: { in: studentNames } }
          ]
        },
        select: {
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          directorNote: true
        }
      });

      const parseCommittedSubjects = (note: any) => {
        if (!note) return []
        const match = note.match(/Môn cam kết:\s*\[([^\]]+)\]/i)
        if (match && match[1]) {
          return match[1].split(",").map((s: any) => s.trim())
        }
        return []
      }

      const targetsWithCommitment = targets.map((t) => {
        const assessment = inputAssessments.find((a) => {
          if (a.studentCode === t.student?.studentCode || a.enrollmentCode === t.student?.studentCode) {
            return true;
          }
          return cleanString(a.fullName) === cleanString(t.student?.studentName);
        });

        const committedSubjects = assessment ? parseCommittedSubjects(assessment.directorNote || "") : [];

        return {
          ...t,
          commitmentSubjects: committedSubjects,
            assignedTeacherMap,
          commitmentNote: committedSubjects.length > 0 
            ? committedSubjects.join(", ") 
            : ""
        };
      });

      return NextResponse.json(targetsWithCommitment)
    }

    // 3. Action: getAssignments
    if (action === "getAssignments") {
      const assignments = await prisma.learningSupportAssignment.findMany({
        where: { academicYearId },
        include: {
          teacher: { select: { id: true, teacherName: true } },
          target: {
            include: {
              student: { select: { id: true, studentName: true, studentCode: true } }
            }
          },
          subject: { select: { id: true, subjectName: true } }
        }
      })
      return NextResponse.json(assignments)
    }

    // 4. Action: getClassSyncCandidates
    if (action === "getClassSyncCandidates") {
      const classId = searchParams.get("classId")
      if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

      // Fetch all students in the class
      const students = await prisma.student.findMany({
        where: { classId },
        select: {
          id: true,
          studentName: true,
          studentCode: true,
          gender: true
        }
      })

      // Fetch input assessments for these students
      const studentCodes = students.map(s => s.studentCode)
      const inputAssessments = await prisma.inputAssessmentStudent.findMany({
        where: {
          studentCode: { in: studentCodes }
        }
      })

      // Map candidates
      const candidates = students.map(s => {
        const assessment = inputAssessments.find(a => a.studentCode === s.studentCode)
        return {
          id: s.id,
          studentName: s.studentName,
          studentCode: s.studentCode,
          gender: s.gender,
          mathScore: (assessment as any)?.mathScore || null,
          literatureScore: (assessment as any)?.literatureScore || null,
          englishScore: (assessment as any)?.englishScore || null,
          mathTarget: (assessment as any)?.mathTarget || false,
          literatureTarget: (assessment as any)?.literatureTarget || false,
          englishTarget: (assessment as any)?.englishTarget || false,
          psychologyTarget: (assessment as any)?.psychologyTarget || false,
          notes: (assessment as any)?.note || ""
        }
      }).filter(c => c.mathTarget || c.literatureTarget || c.englishTarget || c.psychologyTarget)

      return NextResponse.json(candidates)
    }

   // 4.5. Action: getCommitmentCandidates
    if (action === "getCommitmentCandidates") {
      const periods = await prisma.inputAssessmentPeriod.findMany({
        where: { academicYearId },
        select: { id: true }
      })
      const periodIds = periods.map(p => p.id)

      const inputStudents = await prisma.inputAssessmentStudent.findMany({
        where: {
          periodId: { in: periodIds },
          OR: [
            { admissionResult: { contains: "cam kết" } },
            { admissionResult: { contains: "Cam kết" } },
            { directorNote: { contains: "Môn cam kết" } },
            { directorNote: { contains: "Mon cam ket" } },
            { directorNote: { contains: "cam kết" } },
            { directorNote: { contains: "Cam kết" } }
          ]
        },
        include: {
          enrollmentClass: {
            include: {
              campus: true
            }
          }
        }
      })

      const preschoolStudents = await prisma.preschoolInputAssessmentStudent.findMany({
        where: {
          periodId: { in: periodIds },
          OR: [
            { admissionResult: { contains: "cam kết" } },
            { admissionResult: { contains: "Cam kết" } },
            { directorNote: { contains: "Môn cam kết" } },
            { directorNote: { contains: "Mon cam ket" } },
            { directorNote: { contains: "cam kết" } },
            { directorNote: { contains: "Cam kết" } }
          ]
        },
        include: {
          enrollmentClass: {
            include: {
              campus: true
            }
          }
        }
      })

      const allStudentCodes = [
        ...inputStudents.map(s => s.studentCode),
        ...preschoolStudents.map(s => s.studentCode)
      ].filter(Boolean)

      const allFullNames = [
        ...inputStudents.map(s => s.fullName),
        ...preschoolStudents.map(s => s.fullName)
      ].filter(Boolean)

      const systemStudents = await prisma.student.findMany({
        where: {
          OR: [
            { studentCode: { in: allStudentCodes } },
            { studentName: { in: allFullNames } }
          ],
          academicYearId
        },
        include: {
          class: {
            include: {
              campus: true
            }
          }
        }
      })

      // 1. Fetch all teachers for homeroom lookup
      const allTeachers = await prisma.teacher.findMany({
        include: { user: true }
      })

      // 2. Fetch teaching assignments
      const teachingAssignments = await prisma.teachingAssignment.findMany({
        include: {
          class: true,
          subject: true,
          teacher: {
            include: { user: true }
          }
        }
      })

      // 3. Fetch teacher class assignments
      const teacherClassAssignments = await prisma.teacherClassAssignment.findMany({
        include: {
          class: true,
          teacher: {
            include: { user: true }
          }
        }
      })

      // Helper to resolve assigned teacher per class and subject
      const resolveAssignedTeacher = (classId: string | null | undefined, className: string, subName: string, homeroomTeacherId?: string | null) => {
        const subLower = subName.toLowerCase().trim()
        const normTargetClass = normalizeClassName(className)
        const cleanTargetClass = cleanString(className)

        // Find homeroom teacher name if applicable
        const hrTeacherObj = homeroomTeacherId ? allTeachers.find(t => t.id === homeroomTeacherId) : null
        const hrTeacherName = hrTeacherObj?.user?.fullName || hrTeacherObj?.teacherName || null

        // For Tâm lý (Psychology): Search TeachingAssignments first, then GVCN, then TeacherClassAssignments
        if (subLower.includes("tâm lý") || subLower.includes("psychology")) {
          const psychTa = teachingAssignments.find(ta => {
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

          const gvcnClassAssign = teacherClassAssignments.find(tca => {
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

        // Search in TeachingAssignments (Phân công giảng dạy)
        const matchingTa = teachingAssignments.find(ta => {
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
          // 3. Tiếng Việt (Dành riêng cho môn Tiếng Việt - Mã TVI)
          if (subLower.includes("tiếng việt") || (subLower.includes("việt") && !subLower.includes("văn"))) {
            return code === "TVI" || code.startsWith("TVI") || name.includes("tiếng việt") || (name.includes("việt") && !name.includes("văn"))
          }
          // 4. Ngữ Văn (Dành riêng cho môn Ngữ Văn - Mã NVA)
          if (subLower.includes("ngữ văn") || subLower.includes("văn") || subLower.includes("literature")) {
            return code === "NVA" || code.startsWith("NVA") || name.includes("ngữ văn") || name.includes("văn") || name.includes("literature")
          }
          return false
        })

        if (matchingTa?.teacher) {
          return matchingTa.teacher.user?.fullName || matchingTa.teacher.teacherName || "Chưa phân công"
        }

        // Search in TeacherClassAssignments (Phân công lớp/bộ môn)
        const matchingTca = teacherClassAssignments.find(tca => {
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

const result = [
        ...inputStudents.map(is => {
          const matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && is.studentCode && ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
            cleanString(ss.studentName) === cleanString(is.fullName)
          )
          
          const committedSubjects = parseCommittedSubjects(is.directorNote, is.admissionResult)

          const resolvedClassName = 
            matchingStudent?.class?.className ||
            matchingStudent?.class?.classCode ||
            is.enrollmentClass?.className ||
            is.enrollmentClass?.classCode ||
            (is.enrollmentClassId && !is.enrollmentClassId.startsWith("c") ? is.enrollmentClassId : null) ||
            (is.className && is.className !== "Chưa xếp lớp" ? is.className : null) ||
            "Chưa xếp lớp"

          const resolvedCampus = 
            matchingStudent?.class?.campus?.campusName ||
            is.enrollmentClass?.campus?.campusName ||
            is.registeredCampus ||
            is.admissionCampus ||
            ""

          const assignedTeacherMap: Record<string, string> = {}
          committedSubjects.forEach(sub => {
            assignedTeacherMap[sub] = resolveAssignedTeacher(
              matchingStudent?.classId || matchingStudent?.class?.id,
              resolvedClassName,
              sub,
              matchingStudent?.class?.homeroomTeacherId
            )
          })

          return {
            id: is.id,
            studentCode: is.studentCode,
            fullName: is.fullName,
            gender: is.gender,
            admissionResult: is.admissionResult,
            directorNote: is.directorNote,
            systemStudentId: matchingStudent?.id || null,
            classId: matchingStudent?.classId || matchingStudent?.class?.id || null,
            homeroomTeacherName: matchingStudent?.class?.homeroomTeacher?.user?.fullName || null,
            className: resolvedClassName,
            campusName: resolvedCampus,
            committedSubjects,
            assignedTeacherMap,
            mathScore: is.mathScore,
            literatureScore: is.literatureScore,
            writtenEnglishScore: is.writtenEnglishScore,
            oralEnglishScore: is.oralEnglishScore,
            psychologyScore: is.psychologyScore
          }
        }),
        ...preschoolStudents.map(ps => {
          const matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && ps.studentCode && ss.studentCode.trim().toLowerCase() === ps.studentCode.trim().toLowerCase()) ||
            cleanString(ss.studentName) === cleanString(ps.fullName)
          )
          
          const committedSubjects = parseCommittedSubjects(ps.directorNote, ps.admissionResult)

          const resolvedClassName = 
            matchingStudent?.class?.className ||
            matchingStudent?.class?.classCode ||
            ps.enrollmentClass?.className ||
            ps.enrollmentClass?.classCode ||
            (ps.enrollmentClassId && !ps.enrollmentClassId.startsWith("c") ? ps.enrollmentClassId : null) ||
            "Chưa xếp lớp"

          const resolvedCampus = 
            matchingStudent?.class?.campus?.campusName ||
            ps.enrollmentClass?.campus?.campusName ||
            ps.admissionCampus ||
            ""

          const assignedTeacherMap: Record<string, string> = {}
          committedSubjects.forEach(sub => {
            assignedTeacherMap[sub] = resolveAssignedTeacher(
              matchingStudent?.classId || matchingStudent?.class?.id,
              resolvedClassName,
              sub,
              matchingStudent?.class?.homeroomTeacherId
            )
          })

          return {
            id: ps.id,
            studentCode: ps.studentCode,
            fullName: ps.fullName,
            gender: ps.gender,
            admissionResult: ps.admissionResult,
            directorNote: ps.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            campusName: resolvedCampus,
            committedSubjects,
            assignedTeacherMap,
            mathScore: null,
            literatureScore: null,
            writtenEnglishScore: null,
            oralEnglishScore: null,
            psychologyScore: null
          }
        })
      ]

      const validResult = result.filter((item: any) => item.className && item.className !== "Chưa xếp lớp" && !item.className.includes("Chưa xếp lớp"))
      return NextResponse.json(validResult)
    }

    // 5. Action: getCommitment
    if (action === "getCommitment") {
      const studentId = searchParams.get("studentId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const commitment = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      // Also look up previous year's commitment for inheritance
      const previousCommitment = await prisma.studentLearningCommitment.findFirst({
        where: {
          studentId,
          academicYearId: { not: academicYearId }
        },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json({ commitment, hasPrevious: !!previousCommitment, previousCommitment })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action, academicYearId } = body

    if (!academicYearId) {
      return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
    }

    const userRole = (session.user as any)?.role || ""
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

    // 1. Action: saveConfig
    if (action === "saveConfig") {
      const { id, supportType, code, outcomeLabel, description } = body
      if (!supportType || !code || !outcomeLabel) {
        return NextResponse.json({ error: "Missing required config fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportOutcomeConfig.update({
          where: { id },
          data: { supportType, code, outcomeLabel, description }
        })
        await autoAssignTeachersForTarget(updated.id, studentId, supportType, reason, academicYearId)
          return NextResponse.json(updated)
      } else {
        const created = await prisma.learningSupportOutcomeConfig.create({
          data: { supportType, code, outcomeLabel, description, academicYearId }
        })
        await autoAssignTeachersForTarget(created.id, studentId, supportType, reason, academicYearId)
        return NextResponse.json(created)
      }
    }

    // 2. Action: deleteConfig
    if (action === "deleteConfig") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing config ID" }, { status: 400 })
      await prisma.learningSupportOutcomeConfig.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // 3. Action: saveTarget (includes edit & manual creation)
    if (action === "saveTarget") {
      const { id, studentId, supportType, sourceType, status, reason, notes, startDate } = body
      if (!studentId || !supportType || !sourceType) {
        return NextResponse.json({ error: "Missing required target fields" }, { status: 400 })
      }

      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      })

      if (id) {
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: { status, reason, notes, startDate: startDate ? new Date(startDate) : undefined }
        })
        return NextResponse.json(updated)
      } else {
        // Check if unique target already exists
        const existing = await prisma.learningSupportTarget.findUnique({
          where: {
            studentId_supportType_academicYearId: {
              studentId,
              supportType,
              academicYearId
            }
          }
        })

        if (existing) {
          const updated = await prisma.learningSupportTarget.update({
            where: { id: existing.id },
            data: {
              status: status || "TIẾP TỤC THEO TUẦN",
              terminationStatus: "ACTIVE",
              reason: reason || existing.reason,
              notes: notes || existing.notes,
              createdById: existing.createdById || (teacher ? teacher.id : null)
            }
          })
          if (teacher) {
            const existingAssign = await prisma.learningSupportAssignment.findFirst({
              where: {
                targetId: updated.id,
                teacherId: teacher.id
              }
            })
            if (!existingAssign) {
              await prisma.learningSupportAssignment.create({
                data: {
                  targetId: updated.id,
                  teacherId: teacher.id,
                  academicYearId: academicYearId || updated.academicYearId
                }
              })
            }
          }
          return NextResponse.json(updated)
        }

        const created = await prisma.learningSupportTarget.create({
          data: {
            studentId,
            supportType,
            sourceType,
            status,
            reason,
            notes,
            academicYearId,
            startDate: startDate ? new Date(startDate) : new Date(),
            terminationStatus: "ACTIVE",
            createdById: teacher ? teacher.id : null
          }
        })
        if (teacher) {
          const existingAssign = await prisma.learningSupportAssignment.findFirst({
            where: {
              targetId: created.id,
              teacherId: teacher.id
            }
          })
          if (!existingAssign) {
            await prisma.learningSupportAssignment.create({
              data: {
                targetId: created.id,
                teacherId: teacher.id,
                academicYearId: academicYearId || created.academicYearId
              }
            })
          }
        }
        return NextResponse.json(created)
      }
    }

    // 4. Action: deleteTarget (supports single id or array of ids for returning students)
    if (action === "deleteTarget") {
      const { id, ids } = body
      const targetIds = Array.isArray(ids) ? ids : (id ? [id] : [])
      if (targetIds.length === 0) return NextResponse.json({ error: "Missing target IDs" }, { status: 400 })

      await prisma.learningSupportTarget.deleteMany({
        where: { id: { in: targetIds } }
      })
      return NextResponse.json({ success: true, count: targetIds.length })
    }

    // 5. Action: syncAdmission (Bulk sync from input assessment)
    if (action === "syncAdmission") {
      const { candidates } = body // Array of candidate targets
      if (!Array.isArray(candidates)) return NextResponse.json({ error: "Candidates must be an array" }, { status: 400 })

      const createdTargets = []
      for (const cand of candidates) {
        try {
          const newTarget = await prisma.learningSupportTarget.create({
            data: {
              studentId: cand.studentId,
              supportType: cand.supportType, // "ACADEMIC" or "PSYCHOLOGICAL"
              sourceType: "ADMISSION",
              status: "TIẾP TỤC THEO TUẦN",
              reason: cand.reason,
              notes: cand.notes || "Đồng bộ tự động từ Khảo sát đầu vào",
              academicYearId,
              startDate: new Date(),
              terminationStatus: "ACTIVE"
            }
          })
          createdTargets.push(newTarget)
        } catch (e) {
          // Ignore duplicates (unique index will trigger error if studentId & supportType already registered for this year)
        }
      }
      return NextResponse.json({ success: true, count: createdTargets.length })
    }

    // 6. Action: saveAssignment
    if (action === "saveAssignment") {
      const { id, teacherId, targetId, subjectId, notes } = body
      if (!teacherId || !targetId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportAssignment.update({
          where: { id },
          data: { teacherId, subjectId, notes }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.learningSupportAssignment.create({
          data: { teacherId, targetId, subjectId, notes, academicYearId }
        })
        return NextResponse.json(created)
      }
    }

    // Action: bulkApproveTargets
    if (action === "bulkApproveTargets") {
      const { targetIds, approve } = body
      if (!Array.isArray(targetIds)) return NextResponse.json({ error: "targetIds must be an array" }, { status: 400 })

      if (approve) {
        // Fetch all targets to check their createdById (include student to find classId)
        const targets = await prisma.learningSupportTarget.findMany({
          where: { id: { in: targetIds } },
          include: { student: true }
        })

        const existingAssigns = await prisma.learningSupportAssignment.findMany({
          where: { targetId: { in: targetIds } }
        });
        const existingAssignMap = new Set(existingAssigns.map(a => a.targetId));
        
        // Find psychology subject
        const psychSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { subjectName: { contains: "Tâm lý" } },
              { subjectName: { contains: "Tâm Lý" } },
              { subjectName: { contains: "tâm lý" } }
            ]
          }
        });

        const txOperations = [];
        for (const target of targets) {
          if (!existingAssignMap.has(target.id)) {
            if (target.supportType === "PSYCHOLOGICAL") {
              // Auto-assign to the psychology subject teacher (GVBM) of the student's class
              if (target.student?.classId && psychSubject) {
                const psychAssignment = await prisma.teachingAssignment.findFirst({
                  where: {
                    classId: target.student.classId,
                    subjectId: psychSubject.id,
                    academicYearId: target.academicYearId
                  }
                });

                if (psychAssignment) {
                  txOperations.push(prisma.learningSupportAssignment.create({
                    data: {
                      teacherId: psychAssignment.teacherId,
                      targetId: target.id,
                      academicYearId: target.academicYearId,
                      notes: "Tự động phân công cho GVBM giảng dạy môn Tâm lý của lớp"
                    }
                  }));
                }
              }
            } else if (target.createdById) {
              // Academic support: auto-assign to proposing teacher
              txOperations.push(prisma.learningSupportAssignment.create({
                data: {
                  teacherId: target.createdById,
                  targetId: target.id,
                  academicYearId: target.academicYearId,
                  notes: "Tự động phân công cho giáo viên đề xuất"
                }
              }));
            }
          }
          
          txOperations.push(prisma.learningSupportTarget.update({
            where: { id: target.id },
            data: { status: "ĐÃ DUYỆT" }
          }));
        }
        await prisma.$transaction(txOperations);
      } else {
        // Reject - update status
        await prisma.learningSupportTarget.updateMany({
          where: { id: { in: targetIds } },
          data: { status: "TỪ CHỐI", terminationStatus: "TERMINATED" }
        })
      }
      return NextResponse.json({ success: true })
    }

    // 7. Action: deleteAssignment
    if (action === "deleteAssignment") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 })
      await prisma.learningSupportAssignment.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // 8. Action: requestTermination (Teacher/Psychologist requests completion)
    if (action === "requestTermination") {
      const { id, outcome, notes } = body
      if (!id) return NextResponse.json({ error: "Missing target ID" }, { status: 400 })
      
      const updated = await prisma.learningSupportTarget.update({
        where: { id },
        data: {
          terminationStatus: "PENDING_TERMINATION",
          outcome: outcome || "Hoàn thành bồi dưỡng",
          notes: notes || undefined
        }
      })
      return NextResponse.json(updated)
    }

    // 9. Action: approveTermination (GĐCS/BGH approves completion)
    if (action === "approveTermination") {
      if (!isGDCS && !isKTDBCL) {
        return NextResponse.json({ error: "Chỉ Giám đốc Cơ sở (GĐCS) hoặc Ban KT&ĐBCL mới có quyền duyệt kết thúc" }, { status: 403 })
      }

      const { id, approve, outcome } = body
      if (!id) return NextResponse.json({ error: "Missing target ID" }, { status: 400 })

      if (approve) {
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: {
            terminationStatus: "TERMINATED",
            status: "KẾT THÚC BỒI DƯỠNG",
            endDate: new Date(),
            outcome: outcome || "Đã duyệt kết thúc",
            terminationApprovedById: session.user.id,
            terminationApprovedAt: new Date()
          }
        })
        return NextResponse.json(updated)
      } else {
        // Reject termination request, return to ACTIVE status
        const updated = await prisma.learningSupportTarget.update({
          where: { id },
          data: {
            terminationStatus: "ACTIVE",
            outcome: null
          }
        })
        return NextResponse.json(updated)
      }
    }

    // 10. Action: saveEvaluation (Teacher adds weekly/monthly evaluations)
    if (action === "saveEvaluation") {
      const { id, targetId, periodType, periodName, trackingLevel, comment, updatedStatus } = body
      if (!targetId || !periodType || !periodName || !trackingLevel || !comment) {
        return NextResponse.json({ error: "Missing evaluation fields" }, { status: 400 })
      }

      if (id) {
        const updated = await prisma.learningSupportEvaluation.update({
          where: { id },
          data: { periodType, periodName, trackingLevel, comment, updatedStatus }
        })
        return NextResponse.json(updated)
      } else {
        // Also optionally update the target's current status if specified
        if (updatedStatus) {
          await prisma.learningSupportTarget.update({
            where: { id: targetId },
            data: { status: updatedStatus }
          })
        }

        const created = await prisma.learningSupportEvaluation.create({
          data: {
            targetId,
            evaluatorId: session.user.id,
            periodType,
            periodName,
            trackingLevel,
            comment,
            updatedStatus
          }
        })
        return NextResponse.json(created)
      }
    }

    // 11. Action: saveCommitment (Create or overwrite commitment by year)
    if (action === "saveCommitment") {
      const { studentId, content, status } = body
      if (!studentId || !content) {
        return NextResponse.json({ error: "Missing commitment fields" }, { status: 400 })
      }

      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        const updated = await prisma.studentLearningCommitment.update({
          where: { id: existing.id },
          data: { content, status: status || "ACTIVE", teacherId: session.user.id, teacherName: session.user.name || "Teacher" }
        })
        return NextResponse.json(updated)
      } else {
        const created = await prisma.studentLearningCommitment.create({
          data: {
            studentId,
            academicYearId,
            content,
            status: status || "ACTIVE",
            teacherId: session.user.id,
            teacherName: session.user.name || "Teacher"
          }
        })
        return NextResponse.json(created)
      }
    }

    // 12. Action: inheritCommitment (Inherit commitment from previous year)
    if (action === "inheritCommitment") {
      const { studentId } = body
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

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

      // Check if current commitment already exists
      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        return NextResponse.json({ error: "Cam kết cho năm học hiện tại đã tồn tại" }, { status: 400 })
      }

      const created = await prisma.studentLearningCommitment.create({
        data: {
          studentId,
          academicYearId,
          content: previousCommitment.content,
          status: "ACTIVE",
          teacherId: session.user.id,
          teacherName: session.user.name || "Teacher"
        }
      })

      return NextResponse.json(created)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function autoAssignTeachersForTarget(targetId: string, studentId: string, supportType: string, reason?: string, yearId?: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    })
    if (!student || !student.classId) return

    const teachersToAssign = new Set<string>()

    if (supportType === "ACADEMIC" || (reason && !reason.includes("Tâm lý"))) {
      const teachingAssigns = await prisma.teachingAssignment.findMany({
        where: { classId: student.classId }
      })
      teachingAssigns.forEach(ta => {
        if (ta.teacherId) teachersToAssign.add(ta.teacherId)
      })
    }

    if (student.class.homeroomTeacherId) {
      teachersToAssign.add(student.class.homeroomTeacherId)
    }

    for (const tid of Array.from(teachersToAssign)) {
      const existing = await prisma.learningSupportAssignment.findFirst({
        where: { targetId, teacherId: tid }
      })
      if (!existing) {
        await prisma.learningSupportAssignment.create({
          data: {
            targetId,
            teacherId: tid,
            academicYearId: yearId || student.class.academicYearId || ""
          }
        })
      }
    }
  } catch (e) {
    console.error("autoAssignTeachersForTarget error:", e)
  }
}
