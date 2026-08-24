import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

export const dynamic = "force-dynamic"

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
        let rawSubs: string[] = []
        if (match && match[1]) {
          rawSubs = match[1].split(/[,;]/).map((s: any) => s.trim()).filter(Boolean)
        } else {
          if (/Anh|English/i.test(note)) rawSubs.push("Tiếng Anh")
          if (/Toán|Math/i.test(note)) rawSubs.push("Toán")
          if (/Tiếng Việt/i.test(note)) rawSubs.push("Tiếng Việt")
          if (/Ngữ văn|Văn/i.test(note)) rawSubs.push("Ngữ Văn")
          if (/Tâm lý|Psychology/i.test(note)) rawSubs.push("Tâm lý")
        }
        const finalSubs: string[] = []
        rawSubs.forEach((s) => {
          const clean = s.trim().replace(/^môn\s+/i, "")
          const lower = clean.toLowerCase()
          if (lower.includes("anh") || lower.includes("english") || lower.includes("esl")) {
            if (!finalSubs.includes("Tiếng Anh")) finalSubs.push("Tiếng Anh")
          } else if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
            if (!finalSubs.includes("Toán")) finalSubs.push("Toán")
          } else if (lower.includes("tiếng việt") || lower.includes("tieng viet")) {
            if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt")
          } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn") {
            if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn")
          } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology")) {
            if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý")
          } else {
            if (!finalSubs.includes(clean)) finalSubs.push(clean)
          }
        })
        return finalSubs
      }

      const cleanString = (str: any) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
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

      const cleanString = (str: string | null | undefined) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

            const parseCommittedSubjects = (note: string | null | undefined, resultStr?: string | null | undefined, className?: string) => {
        const text = `${note || ""} ${resultStr || ""}`.trim()
        if (!text) return []
        
        let rawSubs: string[] = []
        const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i)
        if (match && match[1]) {
          rawSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        }

        if (rawSubs.length === 0) {
          if (/Toán|Math/i.test(text)) rawSubs.push("Toán")
          if (/Tiếng Việt|TN-XH|Tự nhiên/i.test(text)) rawSubs.push("Tiếng Việt")
          else if (/Ngữ văn|Literature/i.test(text)) rawSubs.push("Ngữ Văn")
          else if (/Văn/i.test(text)) {
            if (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) rawSubs.push("Tiếng Việt")
            else rawSubs.push("Ngữ Văn")
          }
          if (/Anh|English|ESL/i.test(text)) {
            rawSubs.push("Tiếng Anh")
          }
          if (/Tâm lý|Psychology/i.test(text)) rawSubs.push("Tâm lý")
        }

        const finalSubs: string[] = []
        rawSubs.forEach((s) => {
          const clean = s.trim().replace(/^môn\s+/i, "")
          const lower = clean.toLowerCase()
          if (lower.includes("anh") || lower.includes("english") || lower.includes("esl")) {
            if (!finalSubs.includes("Tiếng Anh")) finalSubs.push("Tiếng Anh")
          } else if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
            if (!finalSubs.includes("Toán")) finalSubs.push("Toán")
          } else if (lower.includes("tiếng việt") || lower.includes("tieng viet") || lower === "tv") {
            if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt")
          } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature")) {
            if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn")
          } else if (lower === "văn" || lower.includes("văn")) {
            if (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) {
              if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt")
            } else {
              if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn")
            }
          } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology")) {
            if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý")
          } else {
            if (!finalSubs.includes(clean)) finalSubs.push(clean)
          }
        })

        return finalSubs
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

          return {
            id: is.id,
            studentCode: is.studentCode,
            fullName: is.fullName,
            gender: is.gender,
            admissionResult: is.admissionResult,
            directorNote: is.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            campusName: resolvedCampus,
            committedSubjects,
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
            mathScore: null,
            literatureScore: null,
            writtenEnglishScore: null,
            oralEnglishScore: null,
            psychologyScore: null
          }
        })
      ]

      return NextResponse.json(result)
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

    // 4.6. Action: getCommitmentTTCMList
    if (action === "getCommitmentTTCMList") {
      const teachers = await prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { position: { in: ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM", "BGH", "GDCS"] } },
            { departmentAssignments: { some: { position: { in: ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"] } } } }
          ]
        },
        include: {
          campus: { select: { id: true, campusName: true, campusCode: true } },
          departmentRel: { select: { id: true, name: true, code: true, blockCM: true } },
          mainSubjectRel: { select: { id: true, subjectName: true, subjectCode: true } },
          departmentAssignments: {
            include: {
              department: { select: { id: true, name: true, code: true, blockCM: true } }
            }
          }
        },
        orderBy: { teacherName: "asc" }
      })

      let ttcmList = teachers
      if (ttcmList.length === 0) {
        ttcmList = await prisma.teacher.findMany({
          where: { status: "ACTIVE" },
          include: {
            campus: { select: { id: true, campusName: true, campusCode: true } },
            departmentRel: { select: { id: true, name: true, code: true, blockCM: true } },
            mainSubjectRel: { select: { id: true, subjectName: true, subjectCode: true } },
            departmentAssignments: {
              include: {
                department: { select: { id: true, name: true, code: true, blockCM: true } }
              }
            }
          },
          orderBy: { teacherName: "asc" },
          take: 60
        })
      }

      return NextResponse.json(ttcmList)
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
        return NextResponse.json(updated)
      } else {
        const created = await prisma.learningSupportOutcomeConfig.create({
          data: { supportType, code, outcomeLabel, description, academicYearId }
        })
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

    // 13. Action: sendMonthlyReminder
    if (action === "sendMonthlyReminder") {
      const { monthName, targetTeacherId, customMessage, deadlineDate } = body
      if (!monthName || !academicYearId) {
        return NextResponse.json({ error: "Thiếu thông tin tháng cần nhắc hoặc năm học" }, { status: 400 })
      }

      const yearObj = await prisma.academicYear.findUnique({
        where: { id: academicYearId }
      })
      const yearName = yearObj?.name || yearObj?.year || "2026-2027"

      // Fetch active learning support targets
      const targets = await prisma.learningSupportTarget.findMany({
        where: {
          academicYearId,
          status: { notIn: ["ĐÃ KẾT THÚC", "TERMINATED"] },
          terminationStatus: { notIn: ["TERMINATED"] }
        },
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              class: { select: { className: true } }
            }
          },
          assignments: {
            include: {
              teacher: {
                include: { user: { select: { email: true } } }
              },
              subject: { select: { subjectName: true } }
            }
          },
          createdBy: {
            include: { user: { select: { email: true } } }
          },
          evaluations: true
        }
      })

      // Identify pending evaluations for monthName
      const teacherMap = new Map<string, {
        teacherId: string;
        teacherName: string;
        email: string;
        pendingStudents: Array<{
          studentName: string;
          studentCode: string;
          className: string;
          subject: string;
          category: string;
        }>;
      }>()

      targets.forEach((t) => {
        const hasEval = (t.evaluations || []).some(
          (e: any) => e.periodName === monthName || (e.periodName && e.periodName.toLowerCase() === monthName.toLowerCase())
        )
        if (hasEval) return // Already evaluated in this month

        const isCommitment = t.sourceType === "ADMISSION" || (t.notes && t.notes.includes("Cam kết Khảo sát đầu vào"))
        const category = isCommitment ? "Cam kết đầu vào (CKĐV)" : "Bổ sung theo dõi (BSTD)"
        const subject = t.reason || (t.supportType === "ACADEMIC" ? "Văn hóa" : "Tâm lý")

        // Find teachers responsible
        const teachersToNotify: Array<{ id: string; name: string; email: string }> = []

        if (t.assignments && t.assignments.length > 0) {
          t.assignments.forEach((a: any) => {
            if (a.teacher) {
              const email = a.teacher.email || a.teacher.user?.email
              if (email) {
                teachersToNotify.push({
                  id: a.teacher.id,
                  name: a.teacher.teacherName || "Giáo viên",
                  email
                })
              }
            }
          })
        }

        if (teachersToNotify.length === 0 && t.createdBy) {
          const email = t.createdBy.email || t.createdBy.user?.email
          if (email) {
            teachersToNotify.push({
              id: t.createdBy.id,
              name: t.createdBy.teacherName || "Giáo viên",
              email
            })
          }
        }

        teachersToNotify.forEach(tch => {
          if (targetTeacherId && targetTeacherId !== "ALL" && tch.id !== targetTeacherId) {
            return
          }

          if (!teacherMap.has(tch.id)) {
            teacherMap.set(tch.id, {
              teacherId: tch.id,
              teacherName: tch.name,
              email: tch.email,
              pendingStudents: []
            })
          }

          const entry = teacherMap.get(tch.id)!
          if (!entry.pendingStudents.some(s => s.studentCode === t.student?.studentCode && s.subject === subject)) {
            entry.pendingStudents.push({
              studentName: t.student?.studentName || "N/A",
              studentCode: t.student?.studentCode || "N/A",
              className: t.student?.class?.className || "N/A",
              subject,
              category
            })
          }
        })
      })

      const recipientList = Array.from(teacherMap.values())
      if (recipientList.length === 0) {
        return NextResponse.json({
          success: true,
          message: `Tất cả giáo viên đã hoàn thành đánh giá cho ${monthName}`,
          sentCount: 0,
          recipients: []
        })
      }

      let sentSuccessCount = 0
      const results: any[] = []

      for (const rec of recipientList) {
        const studentRowsHtml = rec.pendingStudents.map((s, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 10px 12px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">${s.studentName}</td>
            <td style="padding: 10px 12px; color: #475569;">${s.studentCode}</td>
            <td style="padding: 10px 12px; color: #003B3A; font-weight: bold;">${s.className}</td>
            <td style="padding: 10px 12px; color: #009085; font-weight: bold;">${s.subject}</td>
            <td style="padding: 10px 12px; font-size: 11px; color: #475569;">${s.category}</td>
          </tr>
        `).join("")

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 680px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #003B3A 0%, #009085 100%); padding: 24px 30px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #48BFE3; margin-bottom: 4px;">
                Hệ thống Giáo dục Sky-Line • Ban Khảo thí & ĐBCL
              </div>
              <h2 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.3;">
                NHẮC LỊCH ĐÁNH GIÁ ĐỊNH KỲ ${monthName.toUpperCase()}
              </h2>
              <div style="font-size: 13px; color: #e6fffa; margin-top: 4px;">
                Năm học: ${yearName} • Phân hệ Phụ đạo & Bồi dưỡng Học sinh
              </div>
            </div>

            <!-- Body -->
            <div style="padding: 28px 30px; color: #334155; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">
                Kính gửi Thầy/Cô <strong>${rec.teacherName}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569;">
                Ban Khảo thí & ĐBCL xin gửi thông báo nhắc lịch thực hiện đánh giá định kỳ <strong>${monthName}</strong> đối với các học sinh đang trong diện theo dõi, phụ đạo và bồi dưỡng do Thầy/Cô phụ trách.
              </p>

              ${customMessage ? `
                <div style="background-color: #f0fdfa; border-left: 4px solid #009085; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #003B3A;">
                  <strong>Ghi chú từ Ban Khảo thí / Người gửi:</strong><br/>
                  ${customMessage.replace(/\n/g, '<br/>')}
                </div>
              ` : ''}

              ${deadlineDate ? `
                <p style="font-size: 13px; font-weight: bold; color: #b91c1c; margin: 12px 0;">
                  ⏰ Hạn chót hoàn thành đánh giá: ${deadlineDate}
                </p>
              ` : ''}

              <!-- Table -->
              <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #003B3A; border-bottom: 1px solid #e2e8f0;">
                  Danh sách học sinh cần ghi nhận kết quả đánh giá ${monthName} (${rec.pendingStudents.length} học sinh)
                </div>
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="background-color: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #64748b;">
                      <th style="padding: 8px 12px; width: 30px; text-align: center;">TT</th>
                      <th style="padding: 8px 12px;">Họ và tên</th>
                      <th style="padding: 8px 12px;">Mã HS</th>
                      <th style="padding: 8px 12px;">Lớp</th>
                      <th style="padding: 8px 12px;">Môn / Nội dung</th>
                      <th style="padding: 8px 12px;">Đối tượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${studentRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="https://skyline-survey.vercel.app/teacher/ho-tro-hoc-tap" style="display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 10px rgba(0,59,58,0.25);">
                  Truy cập Sổ theo dõi & Ghi nhận Đánh giá ➜
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                (Hoặc truy cập: <em>https://skyline-survey.vercel.app/teacher/ho-tro-hoc-tap</em>)
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              Đây là email tự động từ Hệ thống Khảo sát & ĐBCL Sky-Line. Quý Thầy/Cô vui lòng không phản hồi trực tiếp email này.
            </div>
          </div>
        `

        try {
          await sendEmail({
            to: rec.email,
            subject: `[Sky-Line Survey] Nhắc lịch đánh giá định kỳ ${monthName} - Phụ đạo, bồi dưỡng Học sinh`,
            html: emailHtml
          })
          sentSuccessCount++
          results.push({ teacher: rec.teacherName, email: rec.email, status: "SUCCESS", count: rec.pendingStudents.length })
        } catch (mailErr: any) {
          console.error(`Failed to send reminder email to ${rec.email}:`, mailErr)
          results.push({ teacher: rec.teacherName, email: rec.email, status: "FAILED", error: mailErr.message })
        }
      }

      return NextResponse.json({
        success: true,
        sentCount: sentSuccessCount,
        totalRecipients: recipientList.length,
        results
      })
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

    // 13. Action: sendCommitmentEmailToTTCM
    if (action === "sendCommitmentEmailToTTCM") {
      const {
        subjectName,
        recipients,
        customMessage,
        students,
        additionalCc
      } = body

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn ít nhất một người nhận (TTCM)" }, { status: 400 })
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        return NextResponse.json({ error: "Không có danh sách học sinh cam kết để gửi" }, { status: 400 })
      }

      const year = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { name: true }
      })
      const yearName = year?.name || "2024-2025"

      let sentSuccessCount = 0
      const results: any[] = []

      for (const rec of recipients) {
        if (!rec.email || !rec.email.includes("@")) {
          results.push({ teacher: rec.teacherName, email: rec.email, status: "FAILED", error: "Email không hợp lệ" })
          continue
        }

        const relevantStudents = (rec.subjectName && rec.subjectName !== "ALL" && rec.subjectName !== "Tất cả")
          ? students.filter((s: any) => !s.subject || s.subject === rec.subjectName || (rec.subjectName === "Tiếng Anh" && s.subject?.includes("Anh")))
          : students

        if (relevantStudents.length === 0) {
          results.push({ teacher: rec.teacherName, email: rec.email, status: "SKIPPED", count: 0, reason: "Không có học sinh phù hợp môn" })
          continue
        }

        const studentRowsHtml = relevantStudents.map((s: any, idx: number) => `
          <tr style="border-bottom: 1px solid #f1f5f9; ${idx % 2 === 1 ? 'background-color: #fafbfc;' : ''}">
            <td style="padding: 10px 12px; text-align: center; color: #64748b; font-weight: bold; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 10px 12px; font-weight: bold; color: #1e293b; font-size: 12px;">${s.fullName}</td>
            <td style="padding: 10px 12px; font-family: monospace; color: #475569; font-size: 11px;">${s.studentCode || "-"}</td>
            <td style="padding: 10px 12px; color: #003B3A; font-weight: bold; font-size: 12px;">${s.className || "Chưa xếp lớp"}</td>
            <td style="padding: 10px 12px; color: #009085; font-weight: bold; font-size: 11px;">${s.campusName || "Sky-Line"}</td>
            <td style="padding: 10px 12px;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 11px;">
                ${s.subject || subjectName || "Môn cam kết"}
              </span>
            </td>
            <td style="padding: 10px 12px; font-size: 11px; color: #334155;">
              ${s.scores ? `<div style="font-weight: 600; margin-bottom: 2px;">${s.scores}</div>` : ''}
              <div style="color: #64748b; font-style: italic; font-size: 10px; max-width: 260px;">${s.note || "Không có ghi chú"}</div>
            </td>
            <td style="padding: 10px 12px; text-align: center;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; ${s.isProposed ? 'background-color: #dcfce7; color: #15803d;' : 'background-color: #ffe4e6; color: #be123c;'}">
                ${s.isProposed ? 'Đã đề xuất' : 'Chưa đề xuất'}
              </span>
            </td>
          </tr>
        `).join("")

        const subTitle = rec.subjectName && rec.subjectName !== "ALL" ? `MÔN ${rec.subjectName.toUpperCase()}` : (subjectName && subjectName !== "ALL" ? `MÔN ${subjectName.toUpperCase()}` : "CÁC MÔN HỌC")

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 720px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #003B3A 0%, #009085 100%); padding: 26px 32px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #48BFE3; margin-bottom: 6px;">
                Hệ thống Giáo dục Sky-Line • Ban Khảo thí & ĐBCL
              </div>
              <h2 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35;">
                DANH SÁCH HỌC SINH DIỆN CAM KẾT & THEO DÕI ĐẦU VÀO - ${subTitle}
              </h2>
              <div style="font-size: 13px; color: #e6fffa; margin-top: 5px;">
                Năm học: <strong>${yearName}</strong> • Kế hoạch Khảo sát & Phụ đạo Học sinh
              </div>
            </div>

            <!-- Body -->
            <div style="padding: 28px 32px; color: #334155; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">
                Kính gửi Thầy/Cô <strong>${rec.teacherName}</strong> (Tổ trưởng Chuyên môn),
              </p>
              <p style="font-size: 14px; color: #475569;">
                Ban Khảo thí & ĐBCL xin gửi danh sách học sinh thuộc diện <strong>Cam kết & Theo dõi khảo sát đầu vào</strong> đối với môn phụ trách. Kính đề nghị Tổ chuyên môn phối hợp cùng Giáo viên bộ môn theo dõi, rà soát và lập kế hoạch phụ đạo/bồi dưỡng phù hợp.
              </p>

              ${customMessage ? `
                <div style="background-color: #f0fdfa; border-left: 4px solid #009085; padding: 14px 18px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #003B3A;">
                  <strong>Ghi chú & Lời nhắn từ Ban Khảo thí / BGH:</strong><br/>
                  ${customMessage.replace(/\n/g, '<br/>')}
                </div>
              ` : ''}

              <!-- Table -->
              <div style="margin: 22px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #003B3A; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                  <span>Danh sách học sinh (${relevantStudents.length} học sinh)</span>
                </div>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                    <thead>
                      <tr style="background-color: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #64748b;">
                        <th style="padding: 9px 12px; width: 30px; text-align: center;">TT</th>
                        <th style="padding: 9px 12px;">Họ và tên</th>
                        <th style="padding: 9px 12px;">Mã HS</th>
                        <th style="padding: 9px 12px;">Lớp</th>
                        <th style="padding: 9px 12px;">Cơ sở</th>
                        <th style="padding: 9px 12px;">Môn cam kết</th>
                        <th style="padding: 9px 12px;">Khảo sát & Ghi chú</th>
                        <th style="padding: 9px 12px; text-align: center;">Tình trạng</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${studentRowsHtml}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="https://skyline-survey.vercel.app/admin/ktdbcl/support" style="display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(0,59,58,0.25);">
                  Truy cập Hệ thống Hỗ trợ học tập ➜
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              Đây là email thông báo tự động từ Hệ thống Khảo sát & ĐBCL Sky-Line. Quý Thầy/Cô vui lòng không phản hồi trực tiếp email này.
            </div>
          </div>
        `

        try {
          await sendEmail({
            to: rec.email,
            cc: additionalCc || undefined,
            subject: `[Sky-Line Survey] Danh sách Học sinh diện Cam kết & Theo dõi đầu vào - ${subTitle} (${yearName})`,
            html: emailHtml
          })
          sentSuccessCount++
          results.push({ teacher: rec.teacherName, email: rec.email, status: "SUCCESS", count: relevantStudents.length })
        } catch (mailErr: any) {
          console.error(`Failed to send commitment email to ${rec.email}:`, mailErr)
          results.push({ teacher: rec.teacherName, email: rec.email, status: "FAILED", error: mailErr.message })
        }
      }

      return NextResponse.json({
        success: true,
        sentCount: sentSuccessCount,
        totalRecipients: recipients.length,
        results
      })
    }


    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
