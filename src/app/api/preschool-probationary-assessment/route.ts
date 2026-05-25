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
        probationaryTeacher: true
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
      probationaryTeacher
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

    const dataToUpdate: any = {
      probationaryScoreText: probationaryScoreText !== undefined ? probationaryScoreText : undefined,
      probationaryResult: probationaryResult !== undefined ? probationaryResult : undefined,
      probationaryComment: probationaryComment !== undefined ? probationaryComment : undefined,
      probationaryPeriod: probationaryPeriod !== undefined ? probationaryPeriod : undefined,
      probationaryClass: probationaryClass !== undefined ? probationaryClass : undefined,
      probationaryTeacher: probationaryTeacher !== undefined ? probationaryTeacher : undefined
    }

    if (probationaryResult === "DAT") {
      dataToUpdate.admissionResult = "Đạt"
    } else if (probationaryResult === "CHUA_DAT") {
      dataToUpdate.admissionResult = "Không đạt"
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
