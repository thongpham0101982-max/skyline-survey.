import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]

async function checkAuth() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return ""
  let str = String(val).trim()
  str = str.replace(/"/g, '""')
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str}"`
  }
  return str
}

const normName = (n: string) => n ? n.trim().toLowerCase().replace(/\s+/g, " ") : ""
const sameTime = (a: any, b: any) => {
  if (!a || !b) return false
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export async function GET(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action") || "getProfiles"
    const studentId = searchParams.get("studentId")
    const academicYearId = searchParams.get("academicYearId")
    const campusId = searchParams.get("campusId")
    const classId = searchParams.get("classId")
    const search = searchParams.get("search")

    // Build filters
    const where: any = {
      NOT: {
        studentCode: { startsWith: "2" }
      }
    }
    if (studentId) where.id = studentId
    if (academicYearId) where.academicYearId = academicYearId
    if (campusId) where.campusId = campusId
    if (classId) where.classId = classId
    if (search) {
      where.OR = [
        { studentName: { contains: search } },
        { studentCode: { contains: search } }
      ]
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where,
      include: {
        class: {
          include: {
            teachers: {
              include: {
                teacher: true
              }
            }
          }
        },
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
        termScores: {
          include: {
            subject: true
          }
        },
        termSummaries: true,
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

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

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
    const preschoolScoresMap = new Map<string, any[]>()
    preschoolScores.forEach((score: any) => {
      if (!preschoolScoresMap.has(score.studentId)) {
        preschoolScoresMap.set(score.studentId, [])
      }
      preschoolScoresMap.get(score.studentId)!.push(score)
    })

    // Fetch all activity participants for these students
    const studentIds = students.map((s: any) => s.id)
    const studentCodesArr = students.map((s: any) => s.studentCode).filter(Boolean)

    let allParticipants: any[] = []
    try {
      allParticipants = (studentIds.length > 0 || studentCodesArr.length > 0)
        ? await prisma.activityParticipant.findMany({
            where: {
              OR: [
                ...(studentIds.length > 0 ? [{ studentId: { in: studentIds } }] : []),
                ...(studentCodesArr.length > 0 ? [{ student: { studentCode: { in: studentCodesArr } } }] : [])
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
        : []

      if (allParticipants.length === 0) {
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
      }
    } catch (err) {
      console.error("Error fetching allParticipants in admin student-profiles:", err)
    }

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

    // Helper to process student record
    const processedStudents = students.map((s: any) => {
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

      // 3. GVCN Comment (Latest periodic comment)
      const latestGvcnCommentObj = s.highlightComments
        ?.filter((c: any) => c.category !== "ANNOUNCEMENT")
        ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())?.[0]
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
      let matchedSurvey: any = null
      let surveyType = ""
      
      matchedSurvey = k12Surveys.find((x: any) => x.studentCode === s.studentCode || x.enrollmentCode === s.studentCode)
      if (matchedSurvey) {
        surveyType = "K12"
      } else {
        matchedSurvey = preschoolSurveys.find((x: any) => x.studentCode === s.studentCode || x.enrollmentCode === s.studentCode)
        if (matchedSurvey) {
          surveyType = "PRESCHOOL"
        } else {
          matchedSurvey = k12Surveys.find((x: any) => normName(x.fullName) === normName(s.studentName) && sameTime(x.dateOfBirth, s.dateOfBirth))
          if (matchedSurvey) {
            surveyType = "K12"
          } else {
            matchedSurvey = preschoolSurveys.find((x: any) => normName(x.fullName) === normName(s.studentName) && sameTime(x.dateOfBirth, s.dateOfBirth))
            if (matchedSurvey) {
              surveyType = "PRESCHOOL"
            }
          }
        }
      }

      let admitted = "Không"
      let subjectNames = ""
      let mathScore = ""
      let literatureScore = ""
      let writtenEnglishScore = ""
      let oralEnglishScore = ""
      let directorNote = ""
      let devAssessment = ""
      let probationaryComment = ""

      if (matchedSurvey) {
        admitted = matchedSurvey.admissionResult || "Đã trúng tuyển"
        directorNote = matchedSurvey.directorNote || ""

        if (surveyType === "K12") {
          const scores = matchedSurvey.scores || []
          subjectNames = scores.map((sc: any) => sc.subject?.name).filter(Boolean).join("; ")
          
          let math = matchedSurvey.mathScore
          let lit = matchedSurvey.literatureScore
          let wEng = matchedSurvey.writtenEnglishScore
          let oEng = matchedSurvey.oralEnglishScore
          
          scores.forEach((sc: any) => {
            const sName = normName(sc.subject?.name)
            const scArr = sc.scores ? JSON.parse(sc.scores) : []
            const scVal = Array.isArray(scArr) ? scArr.find((v: any) => v !== null && v !== undefined) : null
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
          literatureScore = lit !== null && lit !== undefined ? String(lit) : ""
          writtenEnglishScore = wEng !== null && wEng !== undefined ? wEng : ""
          oralEnglishScore = oEng !== null && oEng !== undefined ? oEng : ""
        } else if (surveyType === "PRESCHOOL") {
          probationaryComment = matchedSurvey.probationaryComment || ""
          const scores = preschoolScoresMap.get(matchedSurvey.id) || []
          devAssessment = scores.map((sc: any) => `${sc.criteria?.area?.name} - ${sc.criteria?.name}: ${sc.result}`).join("; ")
          if (!devAssessment) {
            devAssessment = matchedSurvey.devAssessmentResult || ""
          }
        }
      }

      const gvcnAssignment = s.class?.teachers?.find((t: any) => 
        t.roleInClass?.toUpperCase() === "HOMEROOM" || 
        t.roleInClass?.toUpperCase() === "GVCN" || 
        t.teacherId === s.class?.homeroomTeacherId
      ) || s.class?.teachers?.[0];

      const homeroomTeacherName = gvcnAssignment?.teacher?.teacherName || gvcnAssignment?.teacher?.fullName || "Chưa phân công";

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
        
        // Exact structure expected by teacher tabs (profileData)
        student: s,
        termScores: s.termScores || [],
        termSummaries: s.termSummaries || [],
        commitment: s.learningCommitments?.[0] || null,
        orientation: s.careerOrientations?.[0] || null,
        achievements: s.achievements || [],
        projects: s.projectExperiences || [],
        experientialActivities: (() => {
          const studentP = allParticipants.filter((p: any) => {
            if (!p.student) return false
            return p.studentId === s.id || p.student.studentCode === s.studentCode || normName(p.student.studentName) === normName(s.studentName)
          })

          return studentP.map((p: any, idx: number) => {
            const roleCat = categories.find((c: any) => c.id === p.roleId || c.code === p.roleId)
            const evalCat = categories.find((c: any) => c.id === p.evalLevelId || c.code === p.evalLevelId)
            const groupCat = categories.find((c: any) => c.id === p.record?.catalog?.groupId || c.code === p.record?.catalog?.groupId)

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
              date: p.record?.date ? p.record.date.toISOString().split('T')[0] : ''
            }
          })
        })(),
        learningSupportTargets: s.learningSupportTargets || [],
        highlightComments: s.highlightComments || [],
        entranceSurvey: matchedSurvey ? {
          ...matchedSurvey,
          type: surveyType,
          scores: surveyType === "K12" ? (matchedSurvey.scores || []).map((sc: any) => ({
            subjectName: sc.subject?.name,
            scores: sc.scores ? JSON.parse(sc.scores) : {},
            comments: sc.comments ? JSON.parse(sc.comments) : {}
          })) : (preschoolScoresMap.get(matchedSurvey.id) || []).map((s: any) => ({
            areaName: s.criteria?.area?.name,
            criterionName: s.criteria?.name,
            result: s.result,
            note: s.note
          }))
        } : null,
        transfers: s.studentTransfers || []
      }
    })

    if (action === "exportCsv") {
      const headers = [
        "Năm học",
        "Cơ sở",
        "Mã lớp",
        "Tên lớp",
        "Mã học sinh",
        "Họ và tên",
        "Giới tính",
        "Ngày sinh",
        "Trạng thái",
        "Định hướng nghề nghiệp",
        "GVCN nhận xét định kỳ",
        "Nội dung cam kết học tập / Kết quả học tập",
        "Trạng thái cam kết / kết quả",
        "Diện nhận hỗ trợ học tập/tâm lý",
        "GV phụ trách hỗ trợ",
        "Trúng tuyển khảo sát đầu vào?",
        "Môn khảo sát K12",
        "Toán đầu vào",
        "Văn đầu vào",
        "Anh viết đầu vào",
        "Anh nói đầu vào",
        "Ý kiến tuyển sinh / Cam kết đầu vào",
        "Đánh giá phát triển mầm non (preschool)",
        "Nhận xét học thử mầm non"
      ]

      const rows = [headers.join(",")]
      processedStudents.forEach((s: any) => {
        const rowData = [
          s.yearName,
          s.campusName,
          s.classCode,
          s.className,
          s.studentCode,
          s.studentName,
          s.gender,
          s.dob,
          s.status,
          s.orientation?.result || "",
          s.highlightComments?.filter((c: any) => c.category !== "ANNOUNCEMENT")?.[0]?.comment || "",
          s.commitment?.content || "",
          s.commitment ? (s.commitment.status === "COMPLETED" ? "Hoàn thành" : s.commitment.status === "VIOLATED" ? "Vi phạm" : "Đang thực hiện") : "",
          s.learningSupportTargets?.[0] ? `${s.learningSupportTargets[0].reason} (${s.learningSupportTargets[0].supportType === "ACADEMIC" ? "Học thuật" : "Tâm lý"})` : "",
          s.learningSupportTargets?.[0]?.assignments?.[0]?.teacher?.teacherName || "",
          s.entranceSurvey ? s.entranceSurvey.admissionResult || "Đã trúng tuyển" : "Không",
          s.entranceSurvey?.type === "K12" ? (s.entranceSurvey.scores || []).map((sc: any) => sc.subjectName).filter(Boolean).join("; ") : "",
          s.entranceSurvey?.mathScore || "",
          s.entranceSurvey?.literatureScore || "",
          s.entranceSurvey?.writtenEnglishScore || "",
          s.entranceSurvey?.oralEnglishScore || "",
          s.entranceSurvey?.directorNote || "",
          s.entranceSurvey?.devAssessmentResult || "",
          s.entranceSurvey?.probationaryComment || ""
        ].map(escapeCSV)
        rows.push(rowData.join(","))
      })

      const csvContent = "\ufeff" + rows.join("\n")
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="student_profiles.csv"'
        }
      })
    }

    return NextResponse.json({
      success: true,
      count: processedStudents.length,
      data: processedStudents
    })
  } catch (error: any) {
    console.error("Error in student-profiles API:", error)
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 })
  }
}
