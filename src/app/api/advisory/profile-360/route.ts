import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { buildStudentSpecialSubjectsPortfolio } from "@/lib/specialSubjectsPortfolio"

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

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const student: any = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            campus: true,
            academicYear: true
          }
        },
        campus: true,
        academicYear: true,
        parents: { include: { parent: true } },
        goals: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { actions: true },
          orderBy: { createdAt: "desc" }
        },
        goalTrackings: {
          orderBy: { createdAt: "desc" }
        },
        termEvaluations: {
          orderBy: { createdAt: "desc" }
        },
        consultationLogs: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { teacher: { select: { teacherName: true } } },
          orderBy: { meetingDate: "desc" }
        },
        reflections: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        helpRequests: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        advisoryStatuses: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
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
        careerOrientations: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { updatedAt: "desc" }
        },
        learningCommitments: {
          where: academicYearId ? { academicYearId } : undefined
        },
        highlightComments: { orderBy: { createdAt: "desc" } },
        projectExperiences: { orderBy: { createdAt: "desc" } },
        termScores: { include: { subject: true } },
        termSummaries: { orderBy: { semester: "asc" } },
        subjectGradeEntries: {
          include: { subject: true },
          orderBy: { createdAt: "desc" }
        },
        competencySummaries: {
          include: { subject: true }
        },
        specialGradeEntries: {
          include: {
            assignment: {
              include: {
                subject: true,
                teacher: { select: { teacherName: true } }
              }
            },
            lesson: {
              select: {
                periodIndex: true,
                lessonName: true,
                topic: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        learningSupportTargets: {
          include: {
            academicYear: true,
            evaluations: { orderBy: { createdAt: "desc" } },
            assignments: { include: { teacher: true, subject: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Kiểm tra phân quyền truy cập hồ sơ học sinh (Chống IDOR)
    const userRole = (session?.user as any)?.role || ""
    const currentUserId = (session?.user as any)?.id || ""
    const allowedCampusIds = (session?.user as any)?.campusIds || []
    const isFullAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KTDBCL"].includes(userRole)

    let canAccess = isFullAdmin

    if (!canAccess && ["GDCS", "GD_CS", "GIAO_VU_CS", "GIAO_VU"].includes(userRole)) {
      if (allowedCampusIds.length === 0 || allowedCampusIds.includes(student.campusId)) {
        canAccess = true
      }
    }

    if (!canAccess && userRole === "PARENT") {
      const isMyChild = await prisma.parentStudentLink.findFirst({
        where: {
          parent: { userId: currentUserId },
          OR: [
            { studentId: student.id },
            ...(student.studentCode ? [{ student: { studentCode: student.studentCode } }] : [])
          ]
        }
      })
      if (isMyChild) canAccess = true
    }

    if (!canAccess && (userRole === "TEACHER" || userRole === "GV_MN")) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: currentUserId } })
      if (teacher) {
        const hrIds = (student.class?.homeroomTeacherId || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
        const isHomeroom = hrIds.includes(teacher.id) || hrIds.includes(teacher.userId || "")
        const isClassTeacher = await prisma.teacherClassAssignment.findFirst({
          where: { teacherId: teacher.id, classId: student.classId }
        })
        const isSubjectTeacher = await prisma.teachingAssignment.findFirst({
          where: { teacherId: teacher.id, classId: student.classId }
        })
        const isSupport = await prisma.learningSupportAssignment.findFirst({
          where: { teacherId: teacher.id, target: { studentId: student.id } }
        })
        if (isHomeroom || isClassTeacher || isSubjectTeacher || isSupport) {
          canAccess = true
        }
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: "Bạn không có quyền xem hồ sơ của học sinh này." }, { status: 403 })
    }

    // 1. Resolve GVCN (Giáo viên chủ nhiệm lớp) từ hồ sơ lớp của học sinh
    let resolvedHomeroomTeacherName = "Chưa phân công"
    let resolvedHomeroomTeacherInfo: { id?: string; teacherName: string; email?: string | null; phone?: string | null } | null = null
    try {
      const resolveFromRawIds = async (rawIdStr?: string | null) => {
        if (!rawIdStr) return null
        const candidateIds = rawIdStr.split(",").map(s => s.trim()).filter(Boolean)
        if (candidateIds.length === 0) return null
        const teachers = await prisma.teacher.findMany({
          where: {
            OR: [
              { id: { in: candidateIds } },
              { userId: { in: candidateIds } },
              { teacherCode: { in: candidateIds } }
            ]
          },
          select: { id: true, teacherName: true, email: true, phone: true }
        })
        if (teachers.length > 0) {
          return {
            id: teachers[0].id,
            teacherName: teachers.map(t => t.teacherName).filter(Boolean).join(", "),
            email: teachers[0].email,
            phone: teachers[0].phone
          }
        }
        return null
      }

      if (student.class?.homeroomTeacherId) {
        resolvedHomeroomTeacherInfo = await resolveFromRawIds(student.class.homeroomTeacherId)
      }

      if (!resolvedHomeroomTeacherInfo && student.classId) {
        const tca = await prisma.teacherClassAssignment.findFirst({
          where: {
            classId: student.classId,
            OR: [
              { roleInClass: "HOMEROOM" },
              { roleInClass: "GVCN" },
              { roleInClass: { contains: "chủ nhiệm" } },
              { roleInClass: { contains: "HOMEROOM" } }
            ]
          },
          include: {
            teacher: { select: { id: true, teacherName: true, email: true, phone: true } }
          }
        })
        if (tca?.teacher?.teacherName) {
          resolvedHomeroomTeacherInfo = {
            id: tca.teacher.id,
            teacherName: tca.teacher.teacherName,
            email: tca.teacher.email,
            phone: tca.teacher.phone
          }
        }
      }

      if (!resolvedHomeroomTeacherInfo && student.class?.className) {
        const hrCls = await prisma.teacher.findFirst({
          where: {
            OR: [
              { homeroomClass: student.class.className },
              { homeroomClass: { contains: student.class.className } }
            ]
          },
          select: { id: true, teacherName: true, email: true, phone: true }
        })
        if (hrCls?.teacherName) {
          resolvedHomeroomTeacherInfo = hrCls
        }
      }

      if (!resolvedHomeroomTeacherInfo && student.class?.className) {
        const siblingClass = await prisma.class.findFirst({
          where: {
            className: student.class.className,
            homeroomTeacherId: { not: null }
          },
          select: { homeroomTeacherId: true }
        })
        if (siblingClass?.homeroomTeacherId) {
          resolvedHomeroomTeacherInfo = await resolveFromRawIds(siblingClass.homeroomTeacherId)
        }
      }

      if (resolvedHomeroomTeacherInfo?.teacherName) {
        resolvedHomeroomTeacherName = resolvedHomeroomTeacherInfo.teacherName
      }
    } catch (e) {
      console.error("Error resolving homeroom teacher in profile-360:", e)
    }

    student.homeroomTeacherName = resolvedHomeroomTeacherName
    student.homeroomTeacher = resolvedHomeroomTeacherInfo

    // 2. Đồng bộ dữ liệu xuyên suốt các bản ghi có cùng studentCode (giống hệt Hồ sơ Học sinh của GVCN)
    let allStudentIdsForCode: string[] = [student.id]
    if (student.studentCode) {
      try {
        const crossRecords = await prisma.student.findMany({
          where: { studentCode: student.studentCode },
          include: {
            goals: {
              include: { actions: true },
              orderBy: { createdAt: "desc" }
            },
            goalTrackings: {
              orderBy: { createdAt: "desc" }
            },
            termEvaluations: {
              orderBy: { createdAt: "desc" }
            },
            termScores: {
              include: { subject: true }
            },
            termSummaries: {
              orderBy: { semester: "asc" }
            },
            subjectGradeEntries: {
              include: { subject: true },
              orderBy: { createdAt: "desc" }
            },
            competencySummaries: {
              include: { subject: true }
            },
            specialGradeEntries: {
              include: {
                assignment: {
                  include: {
                    subject: true,
                    teacher: { select: { teacherName: true } }
                  }
                },
                lesson: {
                  select: {
                    periodIndex: true,
                    lessonName: true,
                    topic: { select: { name: true } }
                  }
                }
              },
              orderBy: { createdAt: "desc" }
            },
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
            highlightComments: {
              orderBy: { createdAt: "desc" }
            },
            careerOrientations: {
              orderBy: { updatedAt: "desc" }
            },
            learningCommitments: true,
            projectExperiences: {
              orderBy: { createdAt: "desc" }
            },
            consultationLogs: {
              include: { teacher: { select: { teacherName: true } } },
              orderBy: { meetingDate: "desc" }
            },
            reflections: {
              orderBy: { createdAt: "desc" }
            },
            helpRequests: {
              orderBy: { createdAt: "desc" }
            },
            learningSupportTargets: {
              include: {
                academicYear: true,
                evaluations: { orderBy: { createdAt: "desc" } },
                assignments: { include: { teacher: true, subject: true } }
              },
              orderBy: { createdAt: "desc" }
            }
          }
        })

        allStudentIdsForCode = Array.from(new Set([student.id, ...crossRecords.map((cr: any) => cr.id)]))

        const allGoals: any[] = [...(student.goals || [])]
        const allGt: any[] = [...(student.goalTrackings || [])]
        const allTe: any[] = [...(student.termEvaluations || [])]
        const allTs: any[] = [...(student.termScores || [])]
        const allTsum: any[] = [...(student.termSummaries || [])]
        const allSubGe: any[] = [...(student.subjectGradeEntries || [])]
        const allCompSum: any[] = [...(student.competencySummaries || [])]
        const allSge: any[] = [...(student.specialGradeEntries || [])]
        const allAch: any[] = [...(student.achievements || [])]
        const allHc: any[] = [...(student.highlightComments || [])]
        const allCo: any[] = [...(student.careerOrientations || [])]
        const allLc: any[] = [...(student.learningCommitments || [])]
        const allPe: any[] = [...(student.projectExperiences || [])]
        const allCl: any[] = [...(student.consultationLogs || [])]
        const allRef: any[] = [...(student.reflections || [])]
        const allHr: any[] = [...(student.helpRequests || [])]
        const allLst: any[] = [...(student.learningSupportTargets || [])]

        for (const cr of crossRecords) {
          ;(cr.goals || []).forEach((g: any) => {
            if (!allGoals.some((ex: any) => ex.id === g.id || (ex.category === g.category && ex.targetText === g.targetText))) {
              allGoals.push(g)
            }
          })
          ;(cr.goalTrackings || []).forEach((gt: any) => {
            if (!allGt.some((ex: any) => ex.id === gt.id)) allGt.push(gt)
          })
          ;(cr.termEvaluations || []).forEach((te: any) => {
            if (!allTe.some((ex: any) => ex.id === te.id || ex.term === te.term)) allTe.push(te)
          })
          ;((cr as any).termScores || []).forEach((ts: any) => {
            if (ts.score !== null || ts.evaluationGrade !== null) {
              const k = `${ts.subjectId || ts.subject?.subjectName}_${ts.semester}`
              if (!allTs.some((ex: any) => `${ex.subjectId || ex.subject?.subjectName}_${ex.semester}` === k)) {
                allTs.push(ts)
              }
            }
          })
          ;((cr as any).termSummaries || []).forEach((sm: any) => {
            if (sm.gpa !== null || sm.academicRating || sm.conductRating || sm.reward || sm.notes) {
              if (!allTsum.some((ex: any) => ex.semester === sm.semester)) {
                allTsum.push(sm)
              }
            }
          })
          ;((cr as any).subjectGradeEntries || []).forEach((ge: any) => {
            if (ge.compositeScore !== null) {
              const k = `${ge.subjectId || ge.subject?.subjectName}_${ge.evaluationPeriod}`
              if (!allSubGe.some((ex: any) => `${ex.subjectId || ex.subject?.subjectName}_${ex.evaluationPeriod}` === k)) {
                allSubGe.push(ge)
              }
            }
          })
          ;((cr as any).competencySummaries || []).forEach((cs: any) => {
            if (!allCompSum.some((ex: any) => ex.id === cs.id || (ex.subjectId === cs.subjectId && ex.assessmentPeriod === cs.assessmentPeriod))) {
              allCompSum.push(cs)
            }
          })
          ;((cr as any).specialGradeEntries || []).forEach((sge: any) => {
            if (!allSge.some((ex: any) => ex.id === sge.id || (ex.lessonId && ex.lessonId === sge.lessonId))) {
              allSge.push(sge)
            }
          })
          ;((cr as any).achievements || []).forEach((a: any) => {
            if (!allAch.some((ex: any) => ex.id === a.id || ex.achievementId === a.achievementId)) {
              allAch.push(a)
            }
          })
          ;((cr as any).highlightComments || []).forEach((hc: any) => {
            if (!allHc.some((ex: any) => ex.id === hc.id)) allHc.push(hc)
          })
          ;((cr as any).careerOrientations || []).forEach((co: any) => {
            if (!allCo.some((ex: any) => ex.id === co.id)) allCo.push(co)
          })
          ;((cr as any).learningCommitments || []).forEach((lc: any) => {
            if (!allLc.some((ex: any) => ex.id === lc.id)) allLc.push(lc)
          })
          ;((cr as any).projectExperiences || []).forEach((pe: any) => {
            if (!allPe.some((ex: any) => ex.id === pe.id)) allPe.push(pe)
          })
          ;((cr as any).consultationLogs || []).forEach((cl: any) => {
            if (!allCl.some((ex: any) => ex.id === cl.id)) allCl.push(cl)
          })
          ;((cr as any).reflections || []).forEach((r: any) => {
            if (!allRef.some((ex: any) => ex.id === r.id)) allRef.push(r)
          })
          ;((cr as any).helpRequests || []).forEach((hr: any) => {
            if (!allHr.some((ex: any) => ex.id === hr.id)) allHr.push(hr)
          })
          ;((cr as any).learningSupportTargets || []).forEach((lst: any) => {
            if (!allLst.some((ex: any) => ex.id === lst.id)) allLst.push(lst)
          })
        }

        student.goals = allGoals
        student.goalTrackings = allGt
        student.termEvaluations = allTe
        student.termScores = allTs
        student.termSummaries = allTsum
        student.subjectGradeEntries = allSubGe
        student.competencySummaries = allCompSum
        student.specialGradeEntries = allSge
        student.achievements = allAch
        student.highlightComments = allHc
        student.careerOrientations = allCo
        student.learningCommitments = allLc
        student.projectExperiences = allPe
        student.consultationLogs = allCl
        student.reflections = allRef
        student.helpRequests = allHr
        student.learningSupportTargets = allLst

        const vneduRec = await prisma.studentCodeMapping.findFirst({
          where: { databaseCode: student.studentCode },
          select: { markFileCode: true }
        }).catch(() => null)
        if (vneduRec?.markFileCode) {
          student.vneduCode = vneduRec.markFileCode
        }
      } catch (crErr) {
        console.error("Error aggregating cross-record student data in profile-360:", crErr)
      }
    }

    // 3. Khảo sát đầu vào (Entrance Survey - K12 & Preschool)
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
            scores: { include: { subject: true } },
            period: true,
            batch: true
          },
          orderBy: { createdAt: "desc" }
        })
      }

      if (!generalSurvey && student?.dateOfBirth) {
        const cleanStudentName = (student?.studentName || "").trim().toLowerCase().replace(/\s+/g, " ")
        const allPossible = await prisma.inputAssessmentStudent.findMany({
          where: { dateOfBirth: student.dateOfBirth },
          include: {
            scores: { include: { subject: true } },
            period: true,
            batch: true
          }
        })
        generalSurvey =
          allPossible.find(
            x => (x?.fullName || "").trim().toLowerCase().replace(/\s+/g, " ") === cleanStudentName
          ) || null
      }

      if (generalSurvey) {
        let mathScore = generalSurvey.mathScore
        let literatureScore = generalSurvey.literatureScore
        let writtenEnglishScore = generalSurvey.writtenEnglishScore
        let oralEnglishScore = generalSurvey.oralEnglishScore

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
              } else if (
                sName.includes("tiếng việt") ||
                sName.includes("ngữ văn") ||
                sCode.includes("lit") ||
                sCode.includes("nva") ||
                sCode.includes("van")
              ) {
                if (literatureScore == null) literatureScore = finalVal
              } else if (
                sName.includes("tiếng anh") ||
                sCode.includes("eng") ||
                sCode.includes("tav") ||
                sCode.includes("esl")
              ) {
                if (sName.includes("viết") || sName.includes("written") || sCode.includes("vt") || sCode === "tav") {
                  if (writtenEnglishScore == null) writtenEnglishScore = finalVal
                } else if (
                  sName.includes("vấn đáp") ||
                  sName.includes("nói") ||
                  sName.includes("oral") ||
                  sCode.includes("vd") ||
                  sCode === "tavd"
                ) {
                  if (oralEnglishScore == null) oralEnglishScore = finalVal
                }
              }
            }
          })
        }

        const wNum = parseFloat(String(writtenEnglishScore))
        const oNum = parseFloat(String(oralEnglishScore))
        const totalEnglishScore =
          !isNaN(wNum) || !isNaN(oNum) ? (isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum) : null

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
      } else if ((prisma as any).preschoolInputAssessmentStudent) {
        let preschoolSurvey: any = null
        if (student?.studentCode) {
          preschoolSurvey = await (prisma as any).preschoolInputAssessmentStudent.findFirst({
            where: {
              OR: [
                { studentCode: student.studentCode },
                { enrollmentCode: student.studentCode }
              ]
            },
            include: { period: true, batch: true }
          })
        }
        if (!preschoolSurvey && student?.dateOfBirth) {
          const cleanStudentName = (student?.studentName || "").trim().toLowerCase().replace(/\s+/g, " ")
          const allPossiblePre = await (prisma as any).preschoolInputAssessmentStudent.findMany({
            where: { dateOfBirth: student.dateOfBirth },
            include: { period: true, batch: true }
          })
          preschoolSurvey =
            allPossiblePre.find(
              (x: any) => (x?.fullName || "").trim().toLowerCase().replace(/\s+/g, " ") === cleanStudentName
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
      console.error("Error fetching entrance survey in profile-360:", err)
    }

    // 4. Kết quả Khảo thí Quốc tế & Chứng chỉ
    const intlExamResults = await prisma.intlExamResult.findMany({
      where: {
        OR: [
          { studentId: { in: allStudentIdsForCode } },
          ...(student.studentCode ? [{ studentCodeSnapshot: student.studentCode }] : [])
        ],
        sittingStatus: "COMPLETED"
      },
      include: {
        skillResults: true,
        certificate: true
      },
      orderBy: [{ academicYearText: "desc" }, { updatedAt: "desc" }]
    }).catch(() => [])

    const mappedIntlAchievements = intlExamResults.map((r: any) => {
      const scoreLabel =
        r.yleTotalShields !== null && r.yleTotalShields !== undefined
          ? `${r.yleTotalShields}/15 Khiên (${r.yleResultCode || ""})`
          : r.camOverallScale
          ? `Scale ${r.camOverallScale} • ${r.camOfficialGrade || ""} (${r.camCefrLevel || ""})`
          : r.ieltsOverallBand
          ? `Band ${r.ieltsOverallBand}`
          : "Hoàn thành"
      const skillDetail = (r.skillResults || [])
        .map((sk: any) => `${sk.componentCode}: ${sk.numericScore}`)
        .join(" | ")
      return {
        id: `intl-${r.id}`,
        studentId: student.id,
        isInternationalExam: true,
        achievement: {
          id: r.id,
          title: `Chứng chỉ Quốc tế ${r.examType}: ${scoreLabel}`,
          name: `Chứng chỉ Quốc tế ${r.examType}: ${scoreLabel}`,
          category: `Khảo thí Quốc tế (${r.academicYearText})${skillDetail ? ` • ${skillDetail}` : ""}`,
          level: "CAP_QUOC_TE"
        }
      }
    })

    // 5. Hoạt động trải nghiệm (HĐTN)
    const studentParticipants = await prisma.activityParticipant.findMany({
      where: {
        OR: [
          { studentId: { in: allStudentIdsForCode } },
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
        }
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    let categories: any[] = []
    try {
      categories = await prisma.activityCategory.findMany()
    } catch {}

    const roleDict: Record<string, string> = {
      TGIA: "Tham gia",
      TV: "Thành viên",
      NT: "Nhóm trưởng",
      PNT: "Phó nhóm trưởng",
      BTC: "Ban tổ chức"
    }

    const strandDict: Record<string, string> = {
      BAN_THAN: "Hướng vào bản thân",
      XA_HOI: "Hướng đến xã hội",
      TU_NHIEN: "Hướng đến tự nhiên",
      HUONG_NGHIEP: "Hướng nghiệp"
    }

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
    }

    const experientialActivities = (studentParticipants || []).map((p, idx) => {
      let pNote: any = {}
      try {
        if (p?.note && typeof p.note === "string" && p.note.startsWith("{")) {
          pNote = JSON.parse(p.note)
        } else if (p?.note && typeof p.note === "object") {
          pNote = p.note
        }
      } catch {}

      let recMeta: any = {}
      try {
        if (p?.record?.locationId && typeof p.record.locationId === "string" && p.record.locationId.startsWith("{")) {
          recMeta = JSON.parse(p.record.locationId)
        }
      } catch {}

      const roleCat = categories.find(c => c?.id === p?.roleId || c?.code === p?.roleId)
      const evalCat = categories.find(c => c?.id === p?.evalLevelId || c?.code === p?.evalLevelId)
      const groupCat = categories.find(c => c?.id === p?.record?.catalog?.groupId || c?.code === p?.record?.catalog?.groupId)

      let resolvedRole = "Thành viên"
      if (Array.isArray(pNote.roles) && pNote.roles.length > 0) {
        resolvedRole = pNote.roles.join(", ")
      } else {
        resolvedRole = roleCat?.name || (p?.roleId ? roleDict[p.roleId] || p.roleId : "Thành viên")
      }

      let resolvedEval = "Đang tham gia"
      if (pNote.finalResult) {
        resolvedEval = evalResultDict[pNote.finalResult] || pNote.finalResult
      } else if (p?.evalLevelId) {
        resolvedEval = evalCat?.name || evalResultDict[p.evalLevelId] || p.evalLevelId
      }

      const resolvedGroup =
        (recMeta.strand && strandDict[recMeta.strand]) ||
        recMeta.activityTypeName ||
        groupCat?.name ||
        p?.record?.catalog?.group?.name ||
        "Hoạt động trải nghiệm"

      const resolvedName = p?.record?.name || recMeta.activityName || p?.record?.catalog?.name || "Hoạt động trải nghiệm"

      let catalogMeta: any = {}
      try {
        if (p?.record?.catalog?.description && p.record.catalog.description.startsWith("{")) {
          catalogMeta = JSON.parse(p.record.catalog.description)
        }
      } catch {}

      const themeName = recMeta.themeName || catalogMeta.themeName || ""
      const integratedSubjects = recMeta.integratedSubjects || catalogMeta.integratedSubjects || recMeta.subjectName || ""
      const educationalContent = recMeta.educationalContent || catalogMeta.educationalContent || recMeta.description || ""
      const deliverables = recMeta.deliverables || catalogMeta.deliverables || ""

      return {
        id: p.id,
        stt: idx + 1,
        activityId: p.recordId || p.record?.id,
        activityName: (resolvedName || "").trim(),
        themeName: (themeName || "").trim(),
        integratedSubjects: (integratedSubjects || "").trim(),
        educationalContent: (educationalContent || "").trim(),
        deliverables: (deliverables || "").trim(),
        groupName: (resolvedGroup || "").trim(),
        strand: recMeta.strand || undefined,
        role: (resolvedRole || "").trim(),
        evalLevel: (resolvedEval || "").trim(),
        score: pNote.calculatedPercent !== null && pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : undefined,
        attendance: pNote.attendance || "PRESENT",
        remarks: [...(pNote.remarksQuick || []), pNote.remarksCustom].filter(Boolean).join("; ") || undefined,
        date: safeDateToISO(p?.record?.date)
      }
    })

    // 6. Các môn đặc thù Sky-Line (Special Subjects Portfolio)
    const specialSubjectsPortfolio = await (async () => {
      const lessonsBySubjectAndGrade = new Map<string, any[]>()
      try {
        const allSpecLessons = await (prisma as any).specialLesson.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ grade: "asc" }, { periodIndex: "asc" }],
          select: {
            id: true,
            grade: true,
            periodIndex: true,
            lessonName: true,
            topic: { select: { name: true, code: true } },
            version: {
              select: {
                curriculum: {
                  select: {
                    subject: { select: { code: true, name: true } }
                  }
                }
              }
            }
          }
        })
        for (const l of allSpecLessons || []) {
          const subCode = (l.version?.curriculum?.subject?.code || "").toUpperCase()
          if (!subCode || !l.grade) continue
          const key = `${subCode}_${l.grade}`
          if (!lessonsBySubjectAndGrade.has(key)) lessonsBySubjectAndGrade.set(key, [])
          const arr = lessonsBySubjectAndGrade.get(key)!
          if (!arr.some((x: any) => x.periodIndex === l.periodIndex)) {
            arr.push(l)
          }
        }
      } catch {}
      return buildStudentSpecialSubjectsPortfolio({
        student,
        lessonsBySubjectAndGrade,
        homeroomTeacherName: resolvedHomeroomTeacherName
      })
    })()

    // 7. Thông tin chuyển lớp / trường
    const transfers = await prisma.studentTransfer.findMany({
      where: { studentId: { in: allStudentIdsForCode } },
      orderBy: { transferDate: "desc" }
    }).catch(() => [])

    const currentStatusColor = student.advisoryStatuses?.[0]?.statusColor || "GREEN"
    const currentStatusReason = student.advisoryStatuses?.[0]?.reasonDetail || "Ổn định"
    const primaryOrientation = student.careerOrientations?.[0] || null
    const primaryCommitment = student.learningCommitments?.[0] || null

    return NextResponse.json({
      student,
      homeroomTeacherName: resolvedHomeroomTeacherName,
      homeroomTeacher: resolvedHomeroomTeacherInfo,
      currentStatusColor,
      currentStatusReason,
      goals: student.goals || [],
      goalTrackings: student.goalTrackings || [],
      termEvaluations: student.termEvaluations || [],
      inputAssessment: entranceSurvey,
      entranceSurvey,
      experientialActivities,
      consultationLogs: student.consultationLogs || [],
      reflections: student.reflections || [],
      helpRequests: student.helpRequests || [],
      achievements: [...mappedIntlAchievements, ...(student.achievements || [])],
      intlExamResults,
      orientation: primaryOrientation,
      careerOrientation: primaryOrientation,
      commitment: primaryCommitment,
      learningCommitment: primaryCommitment,
      highlightComments: student.highlightComments || [],
      projects: student.projectExperiences || [],
      projectExperiences: student.projectExperiences || [],
      termScores: student.termScores || [],
      termSummaries: student.termSummaries || [],
      subjectGradeEntries: student.subjectGradeEntries || [],
      competencySummaries: student.competencySummaries || [],
      specialGradeEntries: student.specialGradeEntries || [],
      specialSubjectsPortfolio,
      transfers,
      learningSupportTargets: student.learningSupportTargets || []
    })
  } catch (error: any) {
    console.error("GET /api/advisory/profile-360 error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
