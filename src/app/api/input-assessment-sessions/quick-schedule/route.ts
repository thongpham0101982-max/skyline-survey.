import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as any
    const body = await req.json()

    const {
      // Existing student or new student info
      studentId,
      studentData,

      // Session & Batch info
      existingSessionId,
      sessionName: customSessionName,
      sessionDate,
      startTime = "08:00",
      endTime = "10:30",
      room = "Phòng Khảo sát",
      campusId,
      academicYearId,
      periodId,
      batchId,
      autoCreateBatch = true,
      notes,
      examinerUserIds = []
    } = body

    // Resolve Campus object first so we NEVER store raw CUID in registeredCampus / admissionCampus
    const allCampuses = await (prisma as any).campus.findMany({
      select: { id: true, campusCode: true, campusName: true }
    })
    const resolveCampusName = (val?: string | null) => {
      if (!val) return null
      const found = allCampuses.find(
        (c: any) => c.id === val || c.campusCode === val || c.campusName === val
      )
      return found ? (found.campusName || found.campusCode) : val
    }
    const resolveCampusCode = (val?: string | null) => {
      if (!val) return "CS1"
      const found = allCampuses.find(
        (c: any) => c.id === val || c.campusCode === val || c.campusName === val
      )
      return found ? (found.campusCode || found.campusName) : val
    }

    const effectiveCampusObj =
      allCampuses.find((c: any) => c.id === campusId || c.campusName === campusId || c.campusCode === campusId) ||
      allCampuses[0]
    const effectiveCampusId = effectiveCampusObj?.id || campusId
    const effectiveCampusName =
      resolveCampusName(studentData?.registeredCampus) ||
      effectiveCampusObj?.campusName ||
      effectiveCampusObj?.campusCode ||
      "CS1"
    const effectiveCampusCode =
      effectiveCampusObj?.campusCode || effectiveCampusObj?.campusName || "CS1"

    // Resolve Period (prefer passed periodId, otherwise find "Khảo sát lẻ" period in academicYearId)
    let effectivePeriodId = periodId
    let periodObj: any = null
    if (effectivePeriodId) {
      periodObj = await (prisma as any).inputAssessmentPeriod.findUnique({
        where: { id: effectivePeriodId },
        include: { batches: { select: { id: true, batchNumber: true, name: true } } }
      })
    }
    if (!periodObj && academicYearId) {
      const periodsInYear = await (prisma as any).inputAssessmentPeriod.findMany({
        where: { academicYearId },
        include: { batches: { select: { id: true, batchNumber: true, name: true } } }
      })
      periodObj =
        periodsInYear.find((p: any) => {
          const n = (p.name || "").toLowerCase().normalize("NFC")
          const c = (p.code || "").toUpperCase()
          return n.includes("khảo sát lẻ") || n.includes("khao sat le") || c.includes("KSL")
        }) || periodsInYear[0] || null
      if (periodObj) effectivePeriodId = periodObj.id
    }

    // Resolve or Auto-create Batch under the Period so student & session immediately show in Đợt khảo sát & Phân công GV
    let effectiveBatchId = batchId && batchId !== "AUTO_CREATE" && batchId !== "none" ? batchId : null
    let createdBatch: any = null

    const dateObj = sessionDate ? new Date(sessionDate) : new Date()
    const dd = String(dateObj.getDate()).padStart(2, "0")
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0")
    const yyyy = dateObj.getFullYear()
    const dateFullFormatted = `${dd}/${mm}/${yyyy}`
    const dateShortFormatted = `${dd}/${mm}`

    // Determine student display label for batch/session naming
    let studentDisplayName = studentData?.fullName?.trim() || ""
    let studentGrade = studentData?.grade || ""
    let studentEduSystem = studentData?.surveyFormType || ""

    if (studentId && !studentDisplayName) {
      const existingSt = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        select: { fullName: true, grade: true, surveyFormType: true }
      })
      if (existingSt) {
        studentDisplayName = existingSt.fullName || ""
        studentGrade = existingSt.grade || ""
        studentEduSystem = existingSt.surveyFormType || ""
      }
    }

    if (!effectiveBatchId && autoCreateBatch && batchId !== "none" && effectivePeriodId && periodObj) {
      const existingBatches = periodObj.batches || []
      const nums = existingBatches
        .map((b: any) => Number(b.batchNumber))
        .filter((n: number) => !isNaN(n) && n > 0)
      const nextBatchNumber = nums.length > 0 ? Math.max(...nums) + 1 : 1

      const pNameNorm = (periodObj.name || "").toLowerCase().normalize("NFC")
      const periodCode =
        pNameNorm.includes("khảo sát lẻ") || pNameNorm.includes("khao sat le")
          ? "KSL"
          : periodObj.code || "KSL"

      const gradeSysSuffix =
        studentGrade || studentEduSystem
          ? `_${studentGrade || ""}${studentEduSystem || ""}`
          : ""
      const labelPart = studentDisplayName
        ? `${studentDisplayName}${gradeSysSuffix}`
        : customSessionName || notes || "Khảo sát lẻ"

      const scientificBatchName = `${effectiveCampusCode} _ ${periodCode} _ Đợt ${nextBatchNumber} _ KSĐV _ ${labelPart} _ ${dateFullFormatted}`

      createdBatch = await (prisma as any).inputAssessmentBatch.create({
        data: {
          periodId: effectivePeriodId,
          batchNumber: nextBatchNumber,
          name: scientificBatchName,
          startDate: dateObj,
          endDate: dateObj,
          campusId: effectiveCampusId || null,
          assignedUserId: examinerUserIds?.[0] || user?.id || null,
          status: "ACTIVE"
        }
      })
      effectiveBatchId = createdBatch.id
    }

    let targetStudentId = studentId

    // 1. If new student needs to be created
    if (!targetStudentId && studentData) {
      if (!studentData.fullName || !effectivePeriodId) {
        return NextResponse.json(
          { error: "Vui lòng cung cấp Họ tên học sinh và Kỳ khảo sát." },
          { status: 400 }
        )
      }

      let finalStudentCode = (studentData.studentCode || "").trim()
      if (!finalStudentCode) {
        const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
          select: { studentCode: true }
        })
        const nums = allStudents
          .map((s: any) => {
            const match = String(s.studentCode || "").match(/\d+$/)
            return match ? parseInt(match[0], 10) : 0
          })
          .filter((n: number) => !isNaN(n))
        const maxNum = nums.length > 0 ? Math.max(...nums) : 0
        finalStudentCode = "HS" + (maxNum + 1).toString().padStart(3, "0")
      }

      const newStudent = await (prisma as any).inputAssessmentStudent.create({
        data: {
          studentCode: finalStudentCode,
          fullName: studentData.fullName.trim(),
          dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
          gender: studentData.gender || "Nam",
          grade: studentData.grade || "1",
          surveyFormType: studentData.surveyFormType || "HNS",
          surveySystem: studentData.surveySystem || "Offline",
          admissionCriteria: studentData.admissionCriteria || "Khảo sát",
          admissionCampus: effectiveCampusName,
          registeredCampus: effectiveCampusName,
          periodId: effectivePeriodId,
          batchId: effectiveBatchId,
          targetType: studentData.targetType || "Nội tỉnh",
          oldSchoolName: studentData.oldSchoolName || null,
          oldSchoolType: studentData.oldSchoolType || null,
          cityName: studentData.cityName || "Thành phố Đà Nẵng",
          kqgdTieuHoc: studentData.kqgdTieuHoc || null,
          kqHocTap: studentData.kqHocTap || null,
          kqRenLuyen: studentData.kqRenLuyen || null,
          hoSoCtQuocTe: studentData.hoSoCtQuocTe || null,
          createdAt: new Date()
        }
      })
      targetStudentId = newStudent.id
    } else if (targetStudentId && (effectiveBatchId || effectivePeriodId)) {
      // Update existing student's batch/period if scheduled into a new KSL batch
      const updatePayload: any = {}
      if (effectivePeriodId) updatePayload.periodId = effectivePeriodId
      if (effectiveBatchId) updatePayload.batchId = effectiveBatchId
      if (Object.keys(updatePayload).length > 0) {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: targetStudentId },
          data: updatePayload
        })
      }
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: "Không tìm thấy học sinh để xếp lịch." }, { status: 400 })
    }

    // 2. Either link to existing session or create an ad-hoc session
    let targetSessionId = existingSessionId

    if (!targetSessionId) {
      if (!sessionDate || !effectiveCampusId || !academicYearId) {
        return NextResponse.json(
          { error: "Thiếu ngày khảo sát, cơ sở hoặc năm học để tạo phiên mới." },
          { status: 400 }
        )
      }

      const dateCode = dateObj.toISOString().slice(0, 10).replace(/-/g, "")
      const randSuffix = Math.floor(100 + Math.random() * 900)
      const sessionCode = `KS-${dateCode}-${randSuffix}`
      const cPrefix = effectiveCampusCode ? `[${effectiveCampusCode}] ` : ""
      const gradeBadge = studentGrade ? ` - Khối ${studentGrade}${studentEduSystem ? ` (${studentEduSystem})` : ""}` : ""
      const finalSessionName =
        customSessionName?.trim() ||
        `${cPrefix}Khảo sát lẻ - ${studentDisplayName || "Học sinh"}${gradeBadge} (${dateShortFormatted})`

      const createdSession = await (prisma as any).inputAssessmentSession.create({
        data: {
          sessionCode,
          name: finalSessionName,
          sessionDate: dateObj,
          startTime,
          endTime,
          room,
          campusId: effectiveCampusId,
          academicYearId,
          periodId: effectivePeriodId || null,
          batchId: effectiveBatchId || null,
          maxCapacity: 5,
          sessionType: "LE",
          status: "SCHEDULED",
          notes: notes || "Khảo sát lẻ",
          createdById: user?.id || null,
          examiners: {
            create: examinerUserIds.map((uId: string) => ({
              userId: uId,
              role: "EXAMINER"
            }))
          }
        }
      })
      targetSessionId = createdSession.id
    }

    // 3. Link student to session
    const studentSession = await (prisma as any).inputAssessmentStudentSession.upsert({
      where: {
        sessionId_studentId: {
          sessionId: targetSessionId,
          studentId: targetStudentId
        }
      },
      create: {
        sessionId: targetSessionId,
        studentId: targetStudentId,
        status: "ASSIGNED",
        note: notes || null
      },
      update: {
        note: notes || undefined
      }
    })

    const fullSession = await (prisma as any).inputAssessmentSession.findUnique({
      where: { id: targetSessionId },
      include: {
        campus: true,
        academicYear: true,
        period: true,
        batch: true,
        examiners: { include: { user: true } },
        studentSessions: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Đã tạo hồ sơ & xếp lịch Khảo sát lẻ thành công!",
      session: fullSession,
      batch: createdBatch,
      periodId: effectivePeriodId,
      batchId: effectiveBatchId,
      studentId: targetStudentId,
      studentSession
    })
  } catch (error: any) {
    console.error("POST /api/input-assessment-sessions/quick-schedule error:", error)
    return NextResponse.json({ error: error.message || "Lỗi xếp lịch nhanh." }, { status: 500 })
  }
}
