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

      // Query all active classes for this academic year to strictly resolve class & grade
      const allClasses = await prisma.class.findMany({
        where: { academicYearId, status: "ACTIVE" },
        include: { campus: true }
      })

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
        ...inputStudents.map(s => s.enrollmentCode),
        ...preschoolStudents.map(s => s.studentCode),
        ...preschoolStudents.map(s => s.enrollmentCode)
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
          },
          campus: true
        }
      })

      const cleanString = (str: string | null | undefined) => {
        if (!str) return ""
        return str.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "")
      }

      const parseCommittedSubjects = (note: string | null | undefined, resultStr?: string | null | undefined, className?: string, gradeStr?: string) => {
        const text = `${note || ""} ${resultStr || ""}`.trim()
        if (!text) return []
        
        let rawSubs: string[] = []
        const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i)
        if (match && match[1]) {
          rawSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        }

        const isPrimary = (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) ||
                          (gradeStr && /^(khối\s*)?[1-5]$/i.test(gradeStr))

        if (rawSubs.length === 0) {
          if (/Toán|Math/i.test(text)) rawSubs.push("Toán")
          if (/Tiếng Việt|TN-XH|Tự nhiên/i.test(text)) rawSubs.push("Tiếng Việt")
          else if (/Ngữ văn|Literature/i.test(text)) {
            rawSubs.push(isPrimary ? "Tiếng Việt" : "Ngữ Văn")
          } else if (/Văn/i.test(text)) {
            rawSubs.push(isPrimary ? "Tiếng Việt" : "Ngữ Văn")
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
          } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn" || lower.includes("văn")) {
            const correctSub = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
            if (!finalSubs.includes(correctSub)) finalSubs.push(correctSub)
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
          // Precise student matching: prioritize exact studentCode, and ensure grade alignment when matching by name
          let matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && is.studentCode && ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
            (ss.studentCode && is.enrollmentCode && ss.studentCode.trim().toLowerCase() === is.enrollmentCode.trim().toLowerCase())
          )

          if (!matchingStudent) {
            matchingStudent = systemStudents.find(ss => {
              if (cleanString(ss.studentName) === cleanString(is.fullName)) {
                if (!is.grade) return true
                const ssGrade = ss.class?.grade || ss.class?.className?.match(/^(\d+)/)?.[1]
                const isCleanGrade = is.grade.replace(/\D/g, "")
                if (!ssGrade || !isCleanGrade) return true
                return ssGrade.toString() === isCleanGrade.toString()
              }
              return false
            })
          }

          // Strictly resolve Class object from Quản lý lớp học (Class model)
          let resolvedClass = matchingStudent?.class || null

          if (!resolvedClass && is.enrollmentClass) {
            resolvedClass = is.enrollmentClass
          }

          if (!resolvedClass && is.enrollmentClassId) {
            resolvedClass = allClasses.find(c => c.id === is.enrollmentClassId || c.classCode === is.enrollmentClassId) || null
          }

          if (!resolvedClass && is.className && is.className !== "Chưa xếp lớp" && !is.className.toLowerCase().includes("chưa xếp")) {
            resolvedClass = allClasses.find(c => 
              c.className.toLowerCase() === is.className.toLowerCase() || 
              c.classCode.toLowerCase() === is.className.toLowerCase()
            ) || null
          }

          const resolvedClassName = resolvedClass ? resolvedClass.className : (is.className && is.className !== "Chưa xếp lớp" && !is.className.toLowerCase().includes("chưa xếp") ? is.className : "")

          // Extract standard Grade from Class model
          let resolvedGrade = ""
          if (resolvedClass) {
            if (resolvedClass.grade) {
              const cleanG = resolvedClass.grade.toString().trim()
              resolvedGrade = cleanG.startsWith("Khối") ? cleanG : `Khối ${cleanG}`
            } else if (resolvedClass.className.match(/^(\d+)/)) {
              resolvedGrade = `Khối ${resolvedClass.className.match(/^(\d+)/)[1]}`
            } else if (resolvedClass.level === "Mam non" || resolvedClass.className.toLowerCase().includes("mầm")) {
              resolvedGrade = "Mầm non"
            }
          }

          if (!resolvedGrade && resolvedClassName) {
            const match = resolvedClassName.match(/^(\d+)/)
            if (match) {
              resolvedGrade = `Khối ${match[1]}`
            } else if (resolvedClassName.toLowerCase().includes("mầm") || resolvedClassName.toLowerCase().includes("chồi") || resolvedClassName.toLowerCase().includes("lá")) {
              resolvedGrade = "Mầm non"
            }
          }

          const resolvedCampus = 
            resolvedClass?.campus?.campusName ||
            matchingStudent?.campus?.campusName ||
            is.registeredCampus ||
            is.admissionCampus ||
            ""

          // Resolve official Student Code according to Class/System
          const resolvedStudentCode = matchingStudent?.studentCode || is.enrollmentCode || is.studentCode || "-"

          const committedSubjects = parseCommittedSubjects(is.directorNote, is.admissionResult, resolvedClassName, resolvedGrade)

          return {
            id: is.id,
            studentCode: resolvedStudentCode,
            fullName: is.fullName,
            gender: is.gender,
            admissionResult: is.admissionResult,
            directorNote: is.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            grade: resolvedGrade,
            level: (function() {
              const num = parseInt((resolvedGrade || "").replace(/\D/g, ""), 10);
              if (num >= 1 && num <= 5) return "Tiểu học";
              if (num >= 6 && num <= 12) return "Trung học";
              if (resolvedGrade === "Mầm non" || (resolvedClassName || "").toLowerCase().includes("mầm")) return "Mầm non";
              return "Tiểu học";
            })(),
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
          let matchingStudent = systemStudents.find(ss => 
            (ss.studentCode && ps.studentCode && ss.studentCode.trim().toLowerCase() === ps.studentCode.trim().toLowerCase()) ||
            (ss.studentCode && ps.enrollmentCode && ss.studentCode.trim().toLowerCase() === ps.enrollmentCode.trim().toLowerCase())
          )

          if (!matchingStudent) {
            matchingStudent = systemStudents.find(ss => cleanString(ss.studentName) === cleanString(ps.fullName))
          }

          let resolvedClass = matchingStudent?.class || null

          if (!resolvedClass && ps.enrollmentClass) {
            resolvedClass = ps.enrollmentClass
          }

          if (!resolvedClass && ps.enrollmentClassId) {
            resolvedClass = allClasses.find(c => c.id === ps.enrollmentClassId || c.classCode === ps.enrollmentClassId) || null
          }

          const resolvedClassName = resolvedClass ? resolvedClass.className : ""

          let resolvedGrade = "Mầm non"
          if (resolvedClass) {
            if (resolvedClass.grade) {
              const cleanG = resolvedClass.grade.toString().trim()
              resolvedGrade = cleanG.startsWith("Khối") ? cleanG : `Khối ${cleanG}`
            } else if (resolvedClass.className.match(/^(\d+)/)) {
              resolvedGrade = `Khối ${resolvedClass.className.match(/^(\d+)/)[1]}`
            }
          }

          const resolvedCampus = 
            resolvedClass?.campus?.campusName ||
            matchingStudent?.campus?.campusName ||
            ps.admissionCampus ||
            ""

          const resolvedStudentCode = matchingStudent?.studentCode || ps.enrollmentCode || ps.studentCode || "-"

          const committedSubjects = parseCommittedSubjects(ps.directorNote, ps.admissionResult, resolvedClassName, resolvedGrade)

          return {
            id: ps.id,
            studentCode: resolvedStudentCode,
            fullName: ps.fullName,
            gender: ps.gender,
            admissionResult: ps.admissionResult,
            directorNote: ps.directorNote,
            systemStudentId: matchingStudent?.id || null,
            className: resolvedClassName,
            grade: resolvedGrade,
            level: "Mầm non",
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

      // Filter out any unassigned student records
      const filteredResult = result.filter(s => {
        const c = (s.className || "").trim().toLowerCase()
        return c !== "" && c !== "chưa xếp lớp" && !c.includes("chưa xếp") && c !== "null" && c !== "undefined"
      })

      return NextResponse.json(filteredResult)
    }

            // 4.7. Action: getCommitmentQLCMList
    if (action === "getCommitmentQLCMList") {
      const teachers = await prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          email: { not: null }
        },
        include: {
          campus: { select: { id: true, campusName: true, campusCode: true } },
          departmentRel: { select: { id: true, name: true, code: true } },
          departmentAssignments: {
            include: {
              department: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { teacherName: "asc" }
      })

      return NextResponse.json(teachers)
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



﻿    // Action: deleteEvaluation (Xóa bản ghi đánh giá định kỳ)
    if (action === "deleteEvaluation") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi đánh giá cần xóa" }, { status: 400 })

      const deleted = await prisma.learningSupportEvaluation.delete({
        where: { id }
      })
      return NextResponse.json({ success: true, deleted })
    }

    // 14. Action: terminateShortTermTarget (Kết thúc đề xuất hành động / hoàn thành theo dõi ngắn hạn)
    if (action === "terminateShortTermTarget") {
      const { id, outcome, notes } = body
      if (!id) return NextResponse.json({ error: "Thiếu ID học sinh cần kết thúc" }, { status: 400 })

      const updated = await prisma.learningSupportTarget.update({
        where: { id },
        data: {
          terminationStatus: "TERMINATED",
          status: "ĐÃ HOÀN THÀNH",
          endDate: new Date(),
          outcome: outcome || "Hoàn thành theo dõi ngắn hạn",
          notes: notes ? notes : undefined,
          terminationApprovedById: session.user.id,
          terminationApprovedAt: new Date()
        }
      })
      return NextResponse.json(updated)
    }

    // 15. Action: sendUrgentEmailToGVCN (Gửi email khẩn kết quả tuần/tháng đến GVCN kèm nội dung trao đổi GVCN & PHHS)
    if (action === "sendUrgentEmailToGVCN") {
      const { academicYearId, targetIds, periodName, periodType, urgencyNotes, phhsTopics, customMessage } = body
      if (!academicYearId) return NextResponse.json({ error: "Thiếu năm học" }, { status: 400 })

      const targets = await prisma.learningSupportTarget.findMany({
        where: {
          id: targetIds && targetIds.length > 0 ? { in: targetIds } : undefined,
          academicYearId
        },
        include: {
          student: {
            include: {
              class: {
                include: {
                  teachers: {
                    include: { teacher: { include: { user: true } } }
                  }
                }
              }
            }
          },
          evaluations: true,
          assignments: {
            include: {
              teacher: true,
              subject: true
            }
          }
        }
      })

      if (targets.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy học sinh phù hợp để gửi thông báo" }, { status: 400 })
      }

      // Group targets by Class / GVCN
      const classMap = new Map()

      for (const t of targets) {
        const cId = t.student?.classId || "UNKNOWN"
        const cName = t.student?.class?.className || "Lớp"
        
        let gvcnName = "Giáo viên Chủ nhiệm"
        let gvcnEmail = ""

        if (t.student?.class) {
          const homeroomTeacherId = t.student.class.homeroomTeacherId
          if (homeroomTeacherId) {
            const hTeacher = await prisma.teacher.findUnique({
              where: { id: homeroomTeacherId },
              include: { user: true }
            })
            if (hTeacher) {
              gvcnName = hTeacher.teacherName
              gvcnEmail = hTeacher.email || hTeacher.user?.email || ""
            }
          }

          if (!gvcnEmail && t.student.class.teachers?.length > 0) {
            const gvAssigned = t.student.class.teachers.find(ta => ta.roleInClass === "GVCN" || (ta.roleInClass && ta.roleInClass.includes("Chủ nhiệm"))) || t.student.class.teachers[0]
            if (gvAssigned?.teacher) {
              gvcnName = gvAssigned.teacher.teacherName
              gvcnEmail = gvAssigned.teacher.email || gvAssigned.teacher.user?.email || ""
            }
          }
        }

        if (!classMap.has(cId)) {
          classMap.set(cId, {
            classId: cId,
            className: cName,
            gvcnName,
            gvcnEmail,
            students: []
          })
        }

        const relevantEval = t.evaluations?.find(e => e.periodName === periodName) || t.evaluations?.[t.evaluations.length - 1]

        classMap.get(cId).students.push({
          targetId: t.id,
          studentName: t.student?.studentName,
          studentCode: t.student?.studentCode,
          supportType: t.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý",
          reason: t.reason || "Cần bồi dưỡng",
          trackingLevel: relevantEval?.trackingLevel || "Đang theo dõi",
          comment: relevantEval?.comment || "Chưa có nhận xét chi tiết",
          updatedStatus: relevantEval?.updatedStatus || t.status
        })
      }

      let sentCount = 0
      const results = []

      for (const [cId, group] of Array.from(classMap.entries())) {
        if (!group.gvcnEmail) {
          results.push({ class: group.className, gvcn: group.gvcnName, status: "SKIPPED_NO_EMAIL", message: "Không tìm thấy email GVCN" })
          continue
        }

        const studentRowsHtml = group.students.map((s, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 10px 8px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 10px 10px; font-weight: bold; color: #1e293b;">${s.studentName} <span style="font-size: 11px; color: #64748b; font-weight: normal;">(#${s.studentCode})</span></td>
            <td style="padding: 10px 10px; color: #003B3A; font-weight: 700;">${s.supportType} (${s.reason})</td>
            <td style="padding: 10px 10px; text-align: center;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">
                ${s.trackingLevel}
              </span>
            </td>
            <td style="padding: 10px 10px; font-size: 12px; color: #334155; line-height: 1.4;">${s.comment}</td>
          </tr>
        `).join("")

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 720px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
            <div style="background: linear-gradient(135deg, #881337 0%, #be123c 50%, #e11d48 100%); padding: 24px 30px; color: #ffffff;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #ffe4e6; margin-bottom: 4px;">
                ⚡ THÔNG BÁO KHẨN / PHỐI HỢP GVCN & PHHS • SKY-LINE EDUCATION
              </div>
              <h2 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">
                KẾT QUẢ ĐÁNH GIÁ & NỘI DUNG PHỐI HỢP (${periodName || "ĐỊNH KỲ"}) - LỚP ${group.className.toUpperCase()}
              </h2>
              <div style="font-size: 13px; color: #ffe4e6; margin-top: 5px;">
                Kính gửi Giáo viên Chủ nhiệm: <strong>${group.gvcnName}</strong>
              </div>
            </div>

            <div style="padding: 24px 30px; color: #334155; line-height: 1.6;">
              <p style="font-size: 14px; margin-top: 0;">
                Kính gửi Thầy/Cô <strong>${group.gvcnName}</strong> (GVCN Lớp ${group.className}),
              </p>
              <p style="font-size: 14px; color: #475569;">
                Dưới đây là kết quả đánh giá tiến trình học tập / rèn luyện tâm lý định kỳ <strong>${periodName || "trong kỳ"}</strong> đối với các học sinh thuộc diện theo dõi, bồi dưỡng và phụ đạo trong lớp do Thầy/Cô chủ nhiệm:
              </p>

              <div style="margin: 18px 0; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; text-align: left;">
                  <thead style="background-color: #f1f5f9; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">
                    <tr>
                      <th style="padding: 10px 8px; text-align: center; width: 36px;">STT</th>
                      <th style="padding: 10px 10px;">Học sinh</th>
                      <th style="padding: 10px 10px;">Môn / Diện theo dõi</th>
                      <th style="padding: 10px 10px; text-align: center;">Mức độ</th>
                      <th style="padding: 10px 10px;">Nhận xét chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${studentRowsHtml}
                  </tbody>
                </table>
              </div>

              ${(urgencyNotes || phhsTopics || customMessage) ? `
                <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-left: 5px solid #e11d48; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <div style="font-size: 13px; font-weight: 800; color: #9f1239; text-transform: uppercase; margin-bottom: 6px;">
                    📌 Nội dung cần GVCN phối hợp trao đổi với Phụ huynh học sinh (PHHS):
                  </div>
                  <div style="font-size: 13px; color: #881337; line-height: 1.6;">
                    ${urgencyNotes ? `<div><strong>Lưu ý khẩn:</strong> ${urgencyNotes.replace(/\n/g, '<br/>')}</div>` : ''}
                    ${phhsTopics ? `<div style="margin-top: 6px;"><strong>Nội dung trao đổi PHHS:</strong> ${phhsTopics.replace(/\n/g, '<br/>')}</div>` : ''}
                    ${customMessage ? `<div style="margin-top: 6px;"><strong>Ý kiến GVBM / Ban Chuyên môn:</strong> ${customMessage.replace(/\n/g, '<br/>')}</div>` : ''}
                  </div>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 25px 0 10px 0;">
                <a href="https://skyline-survey.vercel.app/teacher/ho-tro-hoc-tap" style="display: inline-block; background-color: #003B3A; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Mở Sổ theo dõi & Ghi nhận Ý kiến phản hồi ➜
                </a>
              </div>
            </div>

            <div style="background-color: #f8fafc; padding: 16px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
              Hệ thống Giáo dục Sky-Line • Sổ Theo dõi & Bồi dưỡng Phát triển Học sinh
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: group.gvcnEmail,
            subject: `[Sky-Line Bồi Dưỡng] Thông Báo Khẩn & Phối Hợp GVCN Lớp ${group.className} (${periodName || "Định kỳ"})`,
            html: emailHtml
          })
          sentCount++
          results.push({ class: group.className, gvcn: group.gvcnName, email: group.gvcnEmail, status: "SUCCESS" })
        } catch (mailErr) {
          results.push({ class: group.className, gvcn: group.gvcnName, email: group.gvcnEmail, status: "FAILED", error: mailErr.message })
        }
      }

      return NextResponse.json({
        success: true,
        sentCount,
        results
      })
    }

    // 16. Action: saveFeedbackGVCN_PHHS (Ghi nhận ý kiến GVCN, PHHS trong Sổ theo dõi Phát triển Học sinh)
    if (action === "saveFeedbackGVCN_PHHS") {
      const { studentId, targetId, academicYearId, feedbackGvcn, feedbackPhhs, followUpPlan, meetingDate } = body
      if (!studentId || !academicYearId) {
        return NextResponse.json({ error: "Thiếu thông tin học sinh hoặc năm học" }, { status: 400 })
      }

      const teacherObj = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      })
      const teacherId = teacherObj?.id || (await prisma.teacher.findFirst())?.id

      if (!teacherId) {
        return NextResponse.json({ error: "Không tìm thấy thông tin giáo viên thực hiện" }, { status: 400 })
      }

      const log = await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId,
          academicYearId,
          meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
          content: feedbackGvcn ? `Ý KIẾN GVCN: ${feedbackGvcn}` : "Trao đổi định kỳ",
          difficulties: feedbackPhhs ? `Ý KIẾN PHHS: ${feedbackPhhs}` : null,
          nextActions: followUpPlan || "Tiếp tục phối hợp theo dõi",
          notes: targetId ? `[TargetId: ${targetId}]` : null,
          status: "COMPLETED"
        }
      })

      return NextResponse.json({ success: true, log })
    }

    // 17. Action: getFeedbackLogs
    if (action === "getFeedbackLogs") {
      const { studentId, academicYearId } = body
      if (!studentId) return NextResponse.json({ error: "Thiếu studentId" }, { status: 400 })

      const logs = await prisma.academicConsultationLog.findMany({
        where: {
          studentId,
          academicYearId: academicYearId || undefined
        },
        include: {
          teacher: { select: { teacherName: true } }
        },
        orderBy: { meetingDate: "desc" }
      })

      return NextResponse.json(logs)
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

        // 13.5. Action: sendCommitmentEmailToQLCM
    if (action === "sendCommitmentEmailToQLCM") {
      const {
        campusName,
        recipients,
        customMessage,
        students,
        additionalCc
      } = body

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn ít nhất một người nhận (QLCM Cơ sở)" }, { status: 400 })
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

        let relevantStudents = students
        if (campusName && campusName !== "ALL" && campusName !== "Tất cả") {
          const campusFiltered = students.filter((s: any) => 
            !s.campusName || s.campusName.includes(campusName) || (campusName.includes("CS") && s.campusName?.includes(campusName))
          )
          if (campusFiltered.length > 0) relevantStudents = campusFiltered
        }

        const proposedCount = relevantStudents.filter((s: any) => s.isProposed).length
        const notProposedCount = relevantStudents.length - proposedCount

        const studentRowsHtml = relevantStudents.map((s: any, idx: number) => {
          const isEven = idx % 2 === 1
          const rowBg = isEven ? "#f8fafc" : "#ffffff"

          const subLower = (s.subject || "").toLowerCase()
          let subBg = "#f1f5f9", subColor = "#334155", subBorder = "#cbd5e1"
          if (subLower.includes("anh")) {
            subBg = "#eff6ff"; subColor = "#1d4ed8"; subBorder = "#bfdbfe";
          } else if (subLower.includes("toán")) {
            subBg = "#fffbeb"; subColor = "#b45309"; subBorder = "#fde68a";
          } else if (subLower.includes("việt") || subLower.includes("văn")) {
            subBg = "#ecfdf5"; subColor = "#047857"; subBorder = "#a7f3d0";
          } else if (subLower.includes("lý") || subLower.includes("tâm")) {
            subBg = "#faf5ff"; subColor = "#7e22ce"; subBorder = "#e9d5ff";
          }

          const cName = s.campusName || "Sky-Line"
          let campusColor = "#009085"
          if (cName.includes("CS1")) campusColor = "#0284c7"
          else if (cName.includes("CS2")) campusColor = "#059669"
          else if (cName.includes("CS3")) campusColor = "#d97706"
          else if (cName.includes("CS4") || cName.includes("CS5")) campusColor = "#7c3aed"

          return `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${rowBg};">
              <td style="padding: 12px 8px; text-align: center; color: #64748b; font-weight: 700; font-size: 12px;">${idx + 1}</td>
              <td style="padding: 12px 10px; font-weight: 700; color: #0f172a; font-size: 13px;">${s.fullName}</td>
              <td style="padding: 12px 10px; text-align: center; font-family: Consolas, Monaco, monospace; color: #475569; font-size: 12px; font-weight: 600;">${s.studentCode || "-"}</td>
              <td style="padding: 12px 8px; text-align: center; color: #003B3A; font-weight: 700; font-size: 11px;">${s.level || (parseInt((s.grade || "").replace(/\D/g, ""), 10) <= 5 ? "Tiểu học" : "Trung học")}</td>
              <td style="padding: 12px 8px; text-align: center; color: #475569; font-weight: 700; font-size: 12px;">${s.grade || (s.className?.match(/^(\d+)/) ? "Khối " + s.className.match(/^(\d+)/)[1] : "-")}</td>
              <td style="padding: 12px 10px; text-align: center; color: #003B3A; font-weight: 800; font-size: 12px;">${s.className || "-"}</td>
              <td style="padding: 12px 10px; text-align: center; color: ${campusColor}; font-weight: 800; font-size: 12px;">${cName}</td>
              <td style="padding: 12px 10px; text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: ${subBg}; color: ${subColor}; border: 1px solid ${subBorder}; font-weight: 800; font-size: 11px;">
                  ${s.subject || "Môn cam kết"}
                </span>
              </td>
              <td style="padding: 12px 12px; font-size: 12px; color: #334155;">
                ${s.scores ? `<div style="font-weight: 700; color: #003B3A; margin-bottom: 3px; font-size: 11px;">${s.scores}</div>` : ''}
                <div style="color: #64748b; font-size: 11px; line-height: 1.4;">${s.note || '<span style="color:#94a3b8; font-style:italic;">Không có ghi chú</span>'}</div>
              </td>
              <td style="padding: 12px 10px; text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; ${s.isProposed ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;'}">
                  ${s.isProposed ? 'Đã đề xuất' : 'Chưa đề xuất'}
                </span>
              </td>
            </tr>
          `
        }).join("")

        const targetCampusTitle = campusName && campusName !== "ALL" && campusName !== "Tất cả" ? `CƠ SỞ ${campusName.toUpperCase()}` : "TOÀN HỆ THỐNG"

        const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Danh sách Học sinh diện Cam kết - ${targetCampusTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f1f5f9; padding: 30px 12px;">
    <div style="max-width: 820px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 59, 58, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- HEADER -->
      <div style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); padding: 32px 30px; text-align: center; border-bottom: 4px solid #48BFE3;">
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 5px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
          <span style="color: #48BFE3 !important; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
            HỆ THỐNG GIÁO DỤC SKY-LINE • BAN KHẢO THÍ & ĐBCL
          </span>
        </div>
        <h1 style="margin: 0; color: #ffffff !important; font-size: 21px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.35;">
          DANH SÁCH HỌC SINH DIỆN CAM KẾT & THEO DÕI ĐẦU VÀO
        </h1>
        <div style="margin-top: 6px; color: #ffffff !important; font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">
          ${targetCampusTitle}
        </div>
        <div style="margin-top: 8px; color: #e6fffa !important; font-size: 13px; font-weight: 600;">
          Năm học: <strong>${yearName}</strong> • Quản trị Chất lượng Dạy & Học Cơ sở
        </div>
      </div>

      <!-- GREETINGS -->
      <div style="padding: 28px 32px 10px 32px; color: #334155;">
        <p style="font-size: 15px; margin: 0; font-weight: 700; color: #003B3A;">
          Kính gửi Quý Thầy/Cô <span style="color: #009085; font-weight: 800;">${rec.teacherName}</span> (Quản lý Chuyên môn Cơ sở / Ban Giám hiệu Cơ sở),
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 10px 0 0 0;">
          Ban Khảo thí & ĐBCL xin gửi danh sách tổng hợp học sinh thuộc diện <strong>Cam kết & Theo dõi khảo sát đầu vào</strong> tại Cơ sở do Thầy/Cô phụ trách. Kính đề nghị QLCM Cơ sở chỉ đạo Tổ chuyên môn và Giáo viên chủ nhiệm/bộ môn rà soát, theo dõi tiến độ và lập kế hoạch hỗ trợ kịp thời cho học sinh.
        </p>
      </div>

      ${customMessage ? `
        <!-- CUSTOM MESSAGE BOX -->
        <div style="padding: 0 32px 15px 32px;">
          <div style="background-color: #f0fdfa; border-left: 4px solid #009085; border-radius: 8px; padding: 14px 18px; border: 1px solid #ccfbf1; border-left-width: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
              📌 Lời nhắn & Lưu ý từ Ban Khảo thí / BGH:
            </div>
            <div style="font-size: 13px; color: #134e4a; line-height: 1.6;">
              ${customMessage.replace(/\n/g, '<br/>')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- STATS SUMMARY CARDS -->
      <div style="padding: 10px 32px 20px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tr>
            <td width="33%" style="padding-right: 10px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tổng lượt cam kết</div>
                <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin-top: 2px;">${relevantStudents.length}</div>
              </div>
            </td>
            <td width="33%" style="padding-right: 10px;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">Đã đề xuất hỗ trợ</div>
                <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 2px;">${proposedCount}</div>
              </div>
            </td>
            <td width="34%">
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 0.5px;">Chưa đề xuất</div>
                <div style="font-size: 22px; font-weight: 900; color: #e11d48; margin-top: 2px;">${notProposedCount}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- TABLE SECTION -->
      <div style="padding: 0 32px 25px 32px;">
        <div style="background-color: #003B3A; color: #ffffff; padding: 12px 16px; border-radius: 12px 12px 0 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;">
          <span>DANH SÁCH CHI TIẾT HỌC SINH (${relevantStudents.length} HỌC SINH)</span>
        </div>
        <div style="border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background-color: #004d40; background: linear-gradient(135deg, #003B3A 0%, #004d40 100%);">
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 36px; border-right: 1px solid rgba(255,255,255,0.15);">STT</th>
                <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.15);">Họ và tên</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 70px; border-right: 1px solid rgba(255,255,255,0.15);">Mã HS</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 75px; border-right: 1px solid rgba(255,255,255,0.15);">Bậc học</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 65px; border-right: 1px solid rgba(255,255,255,0.15);">Khối</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 85px; border-right: 1px solid rgba(255,255,255,0.15);">Lớp</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 60px; border-right: 1px solid rgba(255,255,255,0.15);">Cơ sở</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 105px; border-right: 1px solid rgba(255,255,255,0.15);">Môn cam kết</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.15);">Khảo sát & Ghi chú</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 95px;">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CTA BUTTON -->
      <div style="padding: 5px 32px 30px 32px; text-align: center;">
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
          Quý Thầy/Cô vui lòng truy cập Cổng Hỗ trợ học tập để theo dõi và chỉ đạo các tổ chuyên môn:
        </p>
        <a href="https://skyline-survey.vercel.app/admin/ktdbcl/support" style="display: inline-block; background-color: #009085; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 14px rgba(0, 59, 58, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
          Truy cập Hệ thống Hỗ trợ học tập ➜
        </a>
      </div>

      <!-- FOOTER -->
      <div style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0; font-weight: 700; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
          HỆ THỐNG GIÁO DỤC SKY-LINE
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
          Đây là email thông báo tự động từ Hệ thống Khảo sát & ĐBCL Sky-Line. Quý Thầy/Cô vui lòng không phản hồi trực tiếp email này.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
        `

        try {
          await sendEmail({
            to: rec.email,
            cc: additionalCc || undefined,
            subject: `[Sky-Line Survey] Danh sách Học sinh diện Cam kết & Theo dõi đầu vào - ${targetCampusTitle} (${yearName})`,
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

        // Determine relevant students: if subjectName is specified, filter by it; otherwise send all provided students
        let relevantStudents = students
        if (subjectName && subjectName !== "ALL" && subjectName !== "Tất cả") {
          const subFiltered = students.filter((s: any) => 
            !s.subject || s.subject === subjectName || (subjectName === "Tiếng Anh" && s.subject?.includes("Anh"))
          )
          if (subFiltered.length > 0) relevantStudents = subFiltered
        }

        const proposedCount = relevantStudents.filter((s: any) => s.isProposed).length
        const notProposedCount = relevantStudents.length - proposedCount

        const studentRowsHtml = relevantStudents.map((s: any, idx: number) => {
          const isEven = idx % 2 === 1
          const rowBg = isEven ? "#f8fafc" : "#ffffff"

          const subLower = (s.subject || "").toLowerCase()
          let subBg = "#f1f5f9", subColor = "#334155", subBorder = "#cbd5e1"
          if (subLower.includes("anh")) {
            subBg = "#eff6ff"; subColor = "#1d4ed8"; subBorder = "#bfdbfe";
          } else if (subLower.includes("toán")) {
            subBg = "#fffbeb"; subColor = "#b45309"; subBorder = "#fde68a";
          } else if (subLower.includes("việt") || subLower.includes("văn")) {
            subBg = "#ecfdf5"; subColor = "#047857"; subBorder = "#a7f3d0";
          } else if (subLower.includes("lý") || subLower.includes("tâm")) {
            subBg = "#faf5ff"; subColor = "#7e22ce"; subBorder = "#e9d5ff";
          }

          const cName = s.campusName || "Sky-Line"
          let campusColor = "#009085"
          if (cName.includes("CS1")) campusColor = "#0284c7"
          else if (cName.includes("CS2")) campusColor = "#059669"
          else if (cName.includes("CS3")) campusColor = "#d97706"
          else if (cName.includes("CS4") || cName.includes("CS5")) campusColor = "#7c3aed"

          return `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${rowBg};">
              <td style="padding: 12px 8px; text-align: center; color: #64748b; font-weight: 700; font-size: 12px;">${idx + 1}</td>
              <td style="padding: 12px 10px; font-weight: 700; color: #0f172a; font-size: 13px;">${s.fullName}</td>
              <td style="padding: 12px 10px; text-align: center; font-family: Consolas, Monaco, monospace; color: #475569; font-size: 12px; font-weight: 600;">${s.studentCode || "-"}</td>
              <td style="padding: 12px 8px; text-align: center; color: #003B3A; font-weight: 700; font-size: 11px;">${s.level || (parseInt((s.grade || "").replace(/\D/g, ""), 10) <= 5 ? "Tiểu học" : "Trung học")}</td>
              <td style="padding: 12px 8px; text-align: center; color: #475569; font-weight: 700; font-size: 12px;">${s.grade || (s.className?.match(/^(\d+)/) ? "Khối " + s.className.match(/^(\d+)/)[1] : "-")}</td>
              <td style="padding: 12px 10px; text-align: center; color: #003B3A; font-weight: 800; font-size: 12px;">${s.className || "-"}</td>
              <td style="padding: 12px 10px; text-align: center; color: ${campusColor}; font-weight: 800; font-size: 12px;">${cName}</td>
              <td style="padding: 12px 10px; text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: ${subBg}; color: ${subColor}; border: 1px solid ${subBorder}; font-weight: 800; font-size: 11px;">
                  ${s.subject || subjectName || "Môn cam kết"}
                </span>
              </td>
              <td style="padding: 12px 12px; font-size: 12px; color: #334155;">
                ${s.scores ? `<div style="font-weight: 700; color: #003B3A; margin-bottom: 3px; font-size: 11px;">${s.scores}</div>` : ''}
                <div style="color: #64748b; font-size: 11px; line-height: 1.4;">${s.note || '<span style="color:#94a3b8; font-style:italic;">Không có ghi chú</span>'}</div>
              </td>
              <td style="padding: 12px 10px; text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; ${s.isProposed ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;'}">
                  ${s.isProposed ? 'Đã đề xuất' : 'Chưa đề xuất'}
                </span>
              </td>
            </tr>
          `
        }).join("")

        const subTitle = subjectName && subjectName !== "ALL" && subjectName !== "Tất cả" ? `MÔN ${subjectName.toUpperCase()}` : "CÁC MÔN HỌC"

        const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Danh sách Học sinh diện Cam kết - ${subTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f1f5f9; padding: 30px 12px;">
    <div style="max-width: 820px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 59, 58, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- HEADER -->
      <div style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); padding: 32px 30px; text-align: center; border-bottom: 4px solid #48BFE3;">
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 5px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
          <span style="color: #48BFE3 !important; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
            HỆ THỐNG GIÁO DỤC SKY-LINE • BAN KHẢO THÍ & ĐBCL
          </span>
        </div>
        <h1 style="margin: 0; color: #ffffff !important; font-size: 21px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.35;">
          DANH SÁCH HỌC SINH DIỆN CAM KẾT & THEO DÕI ĐẦU VÀO
        </h1>
        <div style="margin-top: 6px; color: #ffffff !important; font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">
          ${subTitle}
        </div>
        <div style="margin-top: 8px; color: #e6fffa !important; font-size: 13px; font-weight: 600;">
          Năm học: <strong>${yearName}</strong> • Kế hoạch Bồi dưỡng & Phụ đạo Học sinh
        </div>
      </div>

      <!-- GREETINGS -->
      <div style="padding: 28px 32px 10px 32px; color: #334155;">
        <p style="font-size: 15px; margin: 0; font-weight: 700; color: #003B3A;">
          Kính gửi Thầy/Cô <span style="color: #009085; font-weight: 800;">${rec.teacherName}</span> (Tổ trưởng Chuyên môn / Giáo viên phụ trách),
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 10px 0 0 0;">
          Ban Khảo thí & ĐBCL xin gửi danh sách học sinh thuộc diện <strong>Cam kết & Theo dõi khảo sát đầu vào</strong> đối với môn học do Thầy/Cô phụ trách. Kính đề nghị Tổ chuyên môn phối hợp cùng Giáo viên bộ môn theo dõi sát sao, rà soát và lập kế hoạch phụ đạo/bồi dưỡng phù hợp.
        </p>
      </div>

      ${customMessage ? `
        <!-- CUSTOM MESSAGE BOX -->
        <div style="padding: 0 32px 15px 32px;">
          <div style="background-color: #f0fdfa; border-left: 4px solid #009085; border-radius: 8px; padding: 14px 18px; border: 1px solid #ccfbf1; border-left-width: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
              📌 Lời nhắn & Lưu ý từ Ban Khảo thí / BGH:
            </div>
            <div style="font-size: 13px; color: #134e4a; line-height: 1.6;">
              ${customMessage.replace(/\n/g, '<br/>')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- STATS SUMMARY CARDS -->
      <div style="padding: 10px 32px 20px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tr>
            <td width="33%" style="padding-right: 10px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tổng lượt cam kết</div>
                <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin-top: 2px;">${relevantStudents.length}</div>
              </div>
            </td>
            <td width="33%" style="padding-right: 10px;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">Đã đề xuất hỗ trợ</div>
                <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 2px;">${proposedCount}</div>
              </div>
            </td>
            <td width="34%">
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 12px 14px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 0.5px;">Chưa đề xuất</div>
                <div style="font-size: 22px; font-weight: 900; color: #e11d48; margin-top: 2px;">${notProposedCount}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- TABLE SECTION -->
      <div style="padding: 0 32px 25px 32px;">
        <div style="background-color: #003B3A; color: #ffffff; padding: 12px 16px; border-radius: 12px 12px 0 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;">
          <span>DANH SÁCH CHI TIẾT HỌC SINH (${relevantStudents.length} HỌC SINH)</span>
        </div>
        <div style="border: 1px solid #cbd5e1; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background-color: #004d40; background: linear-gradient(135deg, #003B3A 0%, #004d40 100%);">
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 36px; border-right: 1px solid rgba(255,255,255,0.15);">STT</th>
                <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.15);">Họ và tên</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 70px; border-right: 1px solid rgba(255,255,255,0.15);">Mã HS</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 75px; border-right: 1px solid rgba(255,255,255,0.15);">Bậc học</th>
                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 65px; border-right: 1px solid rgba(255,255,255,0.15);">Khối</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 85px; border-right: 1px solid rgba(255,255,255,0.15);">Lớp</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 60px; border-right: 1px solid rgba(255,255,255,0.15);">Cơ sở</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 105px; border-right: 1px solid rgba(255,255,255,0.15);">Môn cam kết</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.15);">Khảo sát & Ghi chú</th>
                <th style="padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff !important; text-transform: uppercase; width: 95px;">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CTA BUTTON -->
      <div style="padding: 5px 32px 30px 32px; text-align: center;">
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
          Thầy/Cô vui lòng truy cập Cổng Hỗ trợ học tập để cập nhật tình trạng đề xuất bồi dưỡng:
        </p>
        <a href="https://skyline-survey.vercel.app/admin/ktdbcl/support" style="display: inline-block; background-color: #009085; background: linear-gradient(135deg, #003B3A 0%, #009085 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 14px rgba(0, 59, 58, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
          Truy cập Hệ thống Hỗ trợ học tập ➜
        </a>
      </div>

      <!-- FOOTER -->
      <div style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0; font-weight: 700; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
          HỆ THỐNG GIÁO DỤC SKY-LINE
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
          Đây là email thông báo tự động từ Hệ thống Khảo sát & ĐBCL Sky-Line. Thầy/Cô vui lòng không phản hồi trực tiếp email này.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
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
