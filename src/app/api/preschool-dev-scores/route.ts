import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getSurveyFormAgeGroup } from "@/lib/preschool"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const periodId = searchParams.get("periodId")
    const batchId = searchParams.get("batchId")

    // Mode 1: Get all scores for a specific student
    if (studentId) {
      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId },
        include: { criteria: { include: { area: true } } }
      })
      return NextResponse.json(scores)
    }

    // Mode 2: Get summary for all students in a period
    if (periodId) {
      const where: any = { periodId }
      if (batchId && batchId !== "all" && batchId !== "null") {
        where.OR = [
          { batchId: batchId },
          { batchId: null }
        ];
      } else if (batchId === "null") {
        where.batchId = null;
      }

            const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where,
        select: { 
          id: true, 
          studentCode: true, 
          fullName: true, 
          grade: true, 
          gender: true, 
          dateOfBirth: true, 
          admissionCampus: true, 
          batchId: true, 
          periodId: true,
          devProfessionalComment: true, 
          devPsychologyComment: true, 
          devImportantNote: true, 
          devAssessmentResult: true, 
          admissionResult: true,
          bghApprovalStatus: true,
          bghApprovalComment: true,
          gdcsApprovalStatus: true,
          gdcsApprovalComment: true,
          probationaryResult: true,
          probationaryClass: true,
          batch: {
            select: {
              startDate: true,
              endDate: true
            }
          }
        }
      })

      const studentIds = students.map((s: any) => s.id)
      
      // Fetch all scores for all students in this period
      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId: { in: studentIds } },
        include: { criteria: { include: { area: true } } }
      })

      // Count scores per student
      const scoreCounts = await (prisma as any).preschoolDevScore.groupBy({
        by: ["studentId"],
        where: { studentId: { in: studentIds } },
        _count: { id: true }
      })

      const scoreMap: Record<string, number> = {}
      for (const sc of scoreCounts) {
        scoreMap[sc.studentId] = sc._count.id
      }

      // Get total criteria count per ageGroup
      const criteriaCounts = await (prisma as any).preschoolDevCriteria.groupBy({
        by: ["ageGroup"],
        where: { status: "ACTIVE" },
        _count: { id: true }
      })
      const criteriaMap: Record<string, number> = {}
      for (const cc of criteriaCounts) {
        criteriaMap[cc.ageGroup] = cc._count.id
      }

      // Map scores by studentId
      const studentScoresMap: Record<string, any[]> = {}
      for (const sc of scores) {
        if (!studentScoresMap[sc.studentId]) {
          studentScoresMap[sc.studentId] = []
        }
        studentScoresMap[sc.studentId].push(sc)
      }

      const result = students.map((s: any) => {
        const studentScoresList = studentScoresMap[s.id] || []
        
        const theChatScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "THE_CHAT")
        const nhanThucScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "NHAN_THUC")
        const ngonNguScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "NGON_NGU")
        const tinhCamXhTmScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "TINH_CAM_XH_TM")

        const formatSummary = (arr: any[]) => {
          if (arr.length === 0) return "Chưa đánh giá"
          return arr.map(sc => {
            const critName = sc.criteria?.name || ""
            const resLabel = sc.result === "DAT" ? "Đạt" : sc.result === "KHONG_DAT" ? "Không đạt" : "Chưa thể hiện"
            let noteText = ""
            if (sc.note) {
              if (sc.note.includes("|")) {
                const parts = sc.note.split("|")
                const metric = parts[0]?.trim()
                const obs = parts[1]?.trim()
                noteText = metric && obs ? `(${metric} - ${obs})` : metric ? `(${metric})` : `(${obs})`
              } else {
                noteText = `(${sc.note})`
              }
            }
            return `${critName}: ${resLabel} ${noteText}`.trim()
          }).join("; ")
        }

        const teacherComment = [
          s.devProfessionalComment ? `Chuyên môn: ${s.devProfessionalComment}` : "",
          s.devPsychologyComment ? `Tâm lý: ${s.devPsychologyComment}` : "",
          s.devImportantNote ? `Lưu ý: ${s.devImportantNote}` : ""
        ].filter(Boolean).join(". ")

        let generalResult = "";
        const hasApproval = !!(s.bghApprovalStatus || s.gdcsApprovalStatus);
        if (hasApproval) {
          generalResult = s.admissionResult || "Chưa duyệt";
        } else {
          if (s.devAssessmentResult === "DAT") generalResult = "Đạt"
          else if (s.devAssessmentResult === "KHONG_DAT") generalResult = "Không đạt"
          else if (s.devAssessmentResult === "HOC_THU") generalResult = "Học thử"
          else generalResult = s.admissionResult || "Chưa duyệt";
        }

        const firstScore = studentScoresList[0];
        const surveyDate = firstScore ? firstScore.createdAt : new Date();
        const sAgeGroup = getSurveyFormAgeGroup(s.grade, surveyDate);
        return {
          ...s,
                    scoredCount: scoreMap[s.id] || 0,
          totalCriteria: criteriaMap[sAgeGroup] || 0,
          theChatSummary: formatSummary(theChatScores),
          nhanThucSummary: formatSummary(nhanThucScores),
          ngonNguSummary: formatSummary(ngonNguScores),
          tinhCamXhTmSummary: formatSummary(tinhCamXhTmScores),
          scores: studentScoresList.map((sc) => ({
            id: sc.id,
            criteriaId: sc.criteriaId,
            result: sc.result,
            note: sc.note,
            criteria: sc.criteria ? {
              id: sc.criteria.id,
              code: sc.criteria.code,
              name: sc.criteria.name,
              ageGroup: sc.criteria.ageGroup,
              area: sc.criteria.area ? {
                id: sc.criteria.area.id,
                code: sc.criteria.area.code,
                name: sc.criteria.area.name
              } : null
            } : null
          })),
          teacherComment,
          generalResult
        }
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Need studentId or periodId" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const currentUser = session?.user as any
    const userRole = (currentUser?.role || "").toUpperCase()
    const isGlobalAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "BGH MN" || userRole === "BGH_MN"

    const body = await req.json()
    const { studentId, scores, devProfessionalComment, devPsychologyComment, devImportantNote, devAssessmentResult, bghApprovalStatus, bghApprovalComment, gdcsApprovalStatus, gdcsApprovalComment } = body

    if (!studentId || !Array.isArray(scores)) {
      return NextResponse.json({ error: "Cần studentId và mảng scores" }, { status: 400 })
    }

    // Upsert each score
    const results = []
    for (const s of scores) {
      if (!s.criteriaId || !s.result) continue
      const upserted = await (prisma as any).preschoolDevScore.upsert({
        where: {
          studentId_criteriaId: { studentId, criteriaId: s.criteriaId }
        },
        create: {
          studentId,
          criteriaId: s.criteriaId,
          result: s.result,
          note: s.note || null,
          assessorId: s.assessorId || null
        },
        update: {
          result: s.result,
          note: s.note || null,
          assessorId: s.assessorId || null
        }
      })
      results.push(upserted)
    }

    // Fetch student's current record to verify and safeguard permissions
    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId }
    })
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 })
    }

    // Fetch user campus assignments to check for campus-bound rules
    const userAssignments = await prisma.userCampusAssignment.findMany({
      where: { userId: currentUser?.id || "" },
      include: { campus: true }
    });

    const hasCampusMatch = userAssignments.length === 0 || userAssignments.some(ca => 
      ca.campus.campusName === student.admissionCampus || 
      ca.campus.campusCode === student.admissionCampus
    );

    // BGH check: role must be ADMIN or KT_DBCL, AND must have campus match (if assigned to specific campuses)
    const canApproveBGH = isGlobalAdmin && hasCampusMatch;

    // GDCS check: role must be ADMIN or GDCS roles, AND must have campus match (if assigned to specific campuses)
    const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    const canApproveGDCS = isGlobalAdmin ? hasCampusMatch : (isGDCSUser && hasCampusMatch);

    // Determine final values with safety protection (if unauthorized, preserve database values)
    const updatedBghStatus = bghApprovalStatus !== undefined 
      ? (canApproveBGH ? bghApprovalStatus : student.bghApprovalStatus) 
      : undefined;
    const updatedBghComment = bghApprovalComment !== undefined 
      ? (canApproveBGH ? bghApprovalComment : student.bghApprovalComment) 
      : undefined;

    const updatedGdcsStatus = gdcsApprovalStatus !== undefined 
      ? (canApproveGDCS ? gdcsApprovalStatus : student.gdcsApprovalStatus) 
      : undefined;
    const updatedGdcsComment = gdcsApprovalComment !== undefined 
      ? (canApproveGDCS ? gdcsApprovalComment : student.gdcsApprovalComment) 
      : undefined;

    // Recalculate final admissionResult
    const finalBgh = updatedBghStatus !== undefined ? updatedBghStatus : student.bghApprovalStatus;
    const finalGdcs = updatedGdcsStatus !== undefined ? updatedGdcsStatus : student.gdcsApprovalStatus;

    let finalAdmissionResult = undefined;
    const hasBghOrGdcsStatus = (finalBgh !== undefined && finalBgh !== null && finalBgh !== "") || 
                               (finalGdcs !== undefined && finalGdcs !== null && finalGdcs !== "");

    if (hasBghOrGdcsStatus) {
      const bgh = finalBgh || "";
      const gdcs = finalGdcs || "";
      const isApproved = (s: string) => s === "DAT" || s === "DAT_MIEN_HOC_THU" || s === "DAT_HOC_THU";

      if (isApproved(bgh) && isApproved(gdcs)) {
        if (bgh === "DAT_MIEN_HOC_THU" || gdcs === "DAT_MIEN_HOC_THU") {
          finalAdmissionResult = "Đạt - Miễn Học Thử";
        } else if (bgh === "DAT_HOC_THU" || gdcs === "DAT_HOC_THU") {
          finalAdmissionResult = "Đạt - Học Thử";
        } else {
          finalAdmissionResult = "Đạt";
        }
      } else if (bgh === "KHONG_DAT" || gdcs === "KHONG_DAT") {
        finalAdmissionResult = "Không đạt";
      } else if (bgh === "Y_KIEN_KHAC" || gdcs === "Y_KIEN_KHAC") {
        finalAdmissionResult = "Ý kiến khác";
      } else {
        finalAdmissionResult = "Chưa duyệt";
      }
    } else {
      const finalDevResult = devAssessmentResult !== undefined ? devAssessmentResult : student.devAssessmentResult;
      if (finalDevResult === "DAT") {
        finalAdmissionResult = "Đạt"
      } else if (finalDevResult === "KHONG_DAT") {
        finalAdmissionResult = "Không đạt"
      } else if (finalDevResult === "HOC_THU") {
        finalAdmissionResult = "Học thử"
      } else {
        finalAdmissionResult = ""
      }
    }

    // Save general comments and approvals to student record
    await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id: studentId },
      data: {
        devProfessionalComment: devProfessionalComment !== undefined ? devProfessionalComment : undefined,
        devPsychologyComment: devPsychologyComment !== undefined ? devPsychologyComment : undefined,
        devImportantNote: devImportantNote !== undefined ? devImportantNote : undefined,
        devAssessmentResult: devAssessmentResult !== undefined ? devAssessmentResult : undefined,
        admissionResult: finalAdmissionResult,
        bghApprovalStatus: updatedBghStatus,
        bghApprovalComment: updatedBghComment,
        gdcsApprovalStatus: updatedGdcsStatus,
        gdcsApprovalComment: updatedGdcsComment,
      }
    })
    return NextResponse.json({ success: true, count: results.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    
    if (studentId) {
      await (prisma as any).preschoolDevScore.deleteMany({ where: { studentId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Need studentId" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
