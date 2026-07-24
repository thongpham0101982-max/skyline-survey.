import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

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
        where: { classId },
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

      const parseCommittedSubjects = (note: string) => {
        if (!note) return []
        const match = note.match(/Môn cam kết:\s*\[([^\]]+)\]/i)
        if (match && match[1]) {
          return match[1].split(",").map((s: string) => s.trim())
        }
        return []
      }

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
          entranceCommitmentSubjects: assessment ? parseCommittedSubjects(assessment.directorNote || "") : []
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
        where: { classId },
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

      const parseCommittedSubjects = (note: string) => {
        if (!note) return []
        const match = note.match(/Môn cam kết:\s*\[([^\]]+)\]/i)
        if (match && match[1]) {
          return match[1].split(",").map((s: string) => s.trim())
        }
        return []
      }

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

          const committedSubjects = parseCommittedSubjects(assessment.directorNote || "")
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
          classId: { in: classIds }
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

      const parseCommittedSubjects = (note: string) => {
        if (!note) return []
        const match = note.match(/Môn cam kết:\s*\[([^\]]+)\]/i)
        if (match && match[1]) {
          return match[1].split(",").map((s: string) => s.trim())
        }
        return []
      }

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

          const committedSubjects = parseCommittedSubjects(assessment.directorNote || "")
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

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          campus: true,
          academicYear: true
        }
      })
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

      // Fetch achievements
      const achievements = await prisma.studentAchievement.findMany({
        where: { studentId },
        include: { achievement: true }
      })

      // Fetch career orientation
      const orientation = await prisma.studentCareerOrientation.findUnique({
        where: { studentId }
      })

      // Fetch projects
      const projects = await prisma.studentProjectExperience.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      })

      // Fetch experiential activities
      const activityParticipants = await prisma.activityParticipant.findMany({
        where: {
          OR: [
            { studentId },
            { student: { studentCode: student.studentCode } }
          ]
        },
        include: {
          record: {
            include: {
              catalog: {
                include: { group: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      const categories = await prisma.activityCategory.findMany();

      const roleDict: Record<string, string> = {
        TGIA: "Tham gia",
        TV: "Thành viên",
        NT: "Nhóm trưởng",
        PNT: "Phó nhóm trưởng",
        BTC: "Ban tổ chức"
      };

      const evalDict: Record<string, string> = {
        XS: "Xuất sắc",
        TO: "Tốt",
        DA: "Đạt",
        KDA: "Chưa đạt",
        EXCELLENT: "Xuất sắc",
        GOOD: "Tốt",
        SATISFACTORY: "Đạt"
      };

      const experientialActivities = activityParticipants.map((p, idx) => {
        const roleCat = categories.find(c => c.id === p.roleId || c.code === p.roleId);
        const evalCat = categories.find(c => c.id === p.evalLevelId || c.code === p.evalLevelId);
        const groupCat = categories.find(c => c.id === p.record?.catalog?.groupId || c.code === p.record?.catalog?.groupId);

        const resolvedRole = roleCat?.name || roleDict[p.roleId] || p.roleId || "Tham gia";
        const resolvedEval = evalCat?.name || evalDict[p.evalLevelId] || p.evalLevelId || "Đạt";

        return {
          id: p.id,
          stt: idx + 1,
          activityName: p.record?.name || p.record?.catalog?.name || "Hoạt động trải nghiệm",
          groupName: groupCat?.name || p.record?.catalog?.group?.name || "Chưa phân loại",
          role: resolvedRole,
          evalLevel: resolvedEval,
          date: p.record?.date ? p.record.date.toISOString().split('T')[0] : ''
        };
      });

      // Fetch commitment
      const commitment = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, ...(academicYearId ? { academicYearId } : {}) }
      })

      // Fetch learning support targets & evaluations across ALL years by studentCode
      const learningSupportTargets = await prisma.learningSupportTarget.findMany({
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

      // Fetch highlight comments
      const highlightComments = await prisma.studentHighlightComment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      })

      // Fetch entrance survey (if any) matching studentCode or enrollmentCode or name/dateOfBirth
      let entranceSurvey: any = null
      
      let generalSurvey = await prisma.inputAssessmentStudent.findFirst({
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

      if (!generalSurvey) {
        // Fallback matching by name and DOB
        const allPossible = await prisma.inputAssessmentStudent.findMany({
          where: {
            dateOfBirth: student.dateOfBirth || undefined
          },
          include: {
            scores: {
              include: { subject: true }
            },
            period: true,
            batch: true
          }
        });
        
        generalSurvey = allPossible.find(x => 
          x.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === student.studentName.trim().toLowerCase().replace(/\s+/g, ' ')
        ) || null;
      }

      if (generalSurvey) {
        entranceSurvey = {
          ...generalSurvey,
          type: "K12",
          scores: generalSurvey.scores.map(s => ({
            subjectName: s.subject.name,
            scores: s.scores ? JSON.parse(s.scores) : {},
            comments: s.comments ? JSON.parse(s.comments) : {}
          }))
        }
      } else {
        let preschoolSurvey = await (prisma as any).preschoolInputAssessmentStudent.findFirst({
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
        
        if (!preschoolSurvey) {
          // Fallback matching by name and DOB in preschool
          const allPossiblePre = await (prisma as any).preschoolInputAssessmentStudent.findMany({
            where: {
              dateOfBirth: student.dateOfBirth || undefined
            },
            include: {
              period: true,
              batch: true
            }
          });
          
          preschoolSurvey = allPossiblePre.find((x: any) => 
            x.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === student.studentName.trim().toLowerCase().replace(/\s+/g, ' ')
          ) || null;
        }
        
        if (preschoolSurvey) {
          // Fetch preschool scores
          const pScores = await (prisma as any).preschoolDevScore.findMany({
            where: { studentId: preschoolSurvey.id },
            include: { criteria: { include: { area: true } } }
          })

          entranceSurvey = {
            ...preschoolSurvey,
            type: "PRESCHOOL",
            scores: pScores.map((s: any) => ({
              areaName: s.criteria.area.name,
              criterionName: s.criteria.name,
              result: s.result,
              note: s.note
            }))
          }
        }
      }

      // Fetch transfer info
      const transfers = await prisma.studentTransfer.findMany({
        where: { studentId },
        orderBy: { transferDate: "desc" }
      })

      return NextResponse.json({
        student,
        achievements,
        orientation,
        projects,
        commitment,
        highlightComments,
        entranceSurvey,
        transfers,
        learningSupportTargets
      })
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
              achievement: true
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

      const localNormName = (n) => n ? n.trim().toLowerCase().replace(/\s+/g, " ") : ""
      const localSameTime = (a, b) => {
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
        const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : ""
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
              const scArr = sc.scores ? JSON.parse(sc.scores) : []
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
          learningSupportTargets: s.learningSupportTargets || [],
          highlightComments: s.highlightComments || [],
          entranceSurvey: matchedSurvey ? {
            ...matchedSurvey,
            type: surveyType,
            scores: surveyType === "K12" ? (matchedSurvey.scores || []).map((sc) => ({
              subjectName: sc.subject?.name,
              scores: sc.scores ? JSON.parse(sc.scores) : {},
              comments: sc.comments ? JSON.parse(sc.comments) : {}
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
        return NextResponse.json({ error: "KhĂ´ng tĂ¬m tháº¥y cam káº¿t nÄƒm há»c cÅ© Ä‘á»ƒ káº¿ thá»«a" }, { status: 404 })
      }

      const existing = await prisma.studentLearningCommitment.findFirst({
        where: { studentId, academicYearId }
      })

      if (existing) {
        return NextResponse.json({ error: "Cam káº¿t cho nÄƒm há»c hiá»‡n táº¡i Ä‘Ă£ tá»“n táº¡i" }, { status: 400 })
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
