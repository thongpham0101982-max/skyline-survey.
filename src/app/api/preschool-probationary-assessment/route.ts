import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 })
    }

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        grade: true,
        admissionCampus: true,
        probationaryScoreText: true,
        probationaryResult: true,
        probationaryComment: true,
        probationaryPeriod: true,
        probationaryClass: true,
        probationaryTeacher: true,
        probationaryBghStatus: true,
        probationaryBghComment: true,
        probationaryBghUser: true,
        probationaryBghDate: true,
        probationaryBghLog: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error: any) {
    console.error("Preschool probationary assessment GET error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const {
      studentId,
      probationaryScoreText,
      probationaryResult,
      probationaryComment,
      probationaryPeriod,
      probationaryClass,
      probationaryTeacher,
      probationaryBghStatus,
      probationaryBghComment
    } = body

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 })
    }

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const currentUser = session?.user as any
    const userRole = (currentUser?.role || "").toUpperCase()
    const isGlobalAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "BGH MN" || userRole === "BGH_MN"

    // Fetch user campus assignments to check for campus-bound rules
    const userAssignments = await prisma.userCampusAssignment.findMany({
      where: { userId: currentUser?.id || "" },
      include: { campus: true }
    })

    const hasCampusMatch = userAssignments.length === 0 || userAssignments.some(ca => 
      ca.campus.campusName === student.admissionCampus || 
      ca.campus.campusCode === student.admissionCampus
    )

    const canApproveBGH = isGlobalAdmin && hasCampusMatch

    const dataToUpdate: any = {
      probationaryScoreText: probationaryScoreText !== undefined ? probationaryScoreText : undefined,
      probationaryResult: probationaryResult !== undefined ? probationaryResult : undefined,
      probationaryComment: probationaryComment !== undefined ? probationaryComment : undefined,
      probationaryPeriod: probationaryPeriod !== undefined ? probationaryPeriod : undefined,
      probationaryClass: probationaryClass !== undefined ? probationaryClass : undefined,
      probationaryTeacher: probationaryTeacher !== undefined ? probationaryTeacher : undefined
    }

    if (canApproveBGH) {
      if (probationaryBghStatus !== undefined) {
        dataToUpdate.probationaryBghStatus = probationaryBghStatus
        if (probationaryBghStatus) {
          dataToUpdate.probationaryBghUser = currentUser?.name || currentUser?.email || "BGH"
          dataToUpdate.probationaryBghDate = new Date()

          // Append to log history
          const logEntry = {
            user: currentUser?.name || currentUser?.email || "BGH",
            status: probationaryBghStatus,
            comment: probationaryBghComment || "",
            date: new Date().toISOString()
          }
          let currentLog = []
          if (student.probationaryBghLog) {
            try {
              currentLog = JSON.parse(student.probationaryBghLog)
            } catch (e) {}
          }
          currentLog.push(logEntry)
          dataToUpdate.probationaryBghLog = JSON.stringify(currentLog)
        } else {
          dataToUpdate.probationaryBghUser = null;
          dataToUpdate.probationaryBghDate = null;
        }
      }
      if (probationaryBghComment !== undefined) {
        dataToUpdate.probationaryBghComment = probationaryBghComment
      }
    }

    // Recalculate final admissionResult
    const finalBghStatus = probationaryBghStatus !== undefined && canApproveBGH ? probationaryBghStatus : student.probationaryBghStatus;
    if (finalBghStatus === "DAT") {
      dataToUpdate.admissionResult = "Đạt - Sau học thử"
    } else if (finalBghStatus === "KHONG_DAT") {
      dataToUpdate.admissionResult = "Không đạt"
    } else if (finalBghStatus === "Y_KIEN_KHAC") {
      dataToUpdate.admissionResult = "Ý kiến khác"
    } else {
      // Fallback to teacher result if no BGH status set
      const finalTeacherResult = probationaryResult !== undefined ? probationaryResult : student.probationaryResult;
      if (finalTeacherResult === "DAT") {
        dataToUpdate.admissionResult = "Đạt - Sau học thử"
      } else if (finalTeacherResult === "CHUA_DAT") {
        dataToUpdate.admissionResult = "Không đạt"
      }
    }

    const updated = await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id: studentId },
      data: dataToUpdate
    })

    return NextResponse.json({ success: true, studentId: updated.id })
  } catch (error: any) {
    console.error("Preschool probationary assessment POST error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
