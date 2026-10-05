import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const search = searchParams.get("search")?.trim().toLowerCase()
    const classId = searchParams.get("classId")

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        classes: true
      }
    })

    // Case 1: Specific Student Detail (360° Summary)
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          profile: true,
          homeroomFeedback: {
            take: 3,
            orderBy: { createdAt: "desc" }
          },
          studentGoalUnlocks: {
            take: 1,
            orderBy: { createdAt: "desc" }
          },
          learningSupportAssignments: {
            where: { target: { status: "ACTIVE" } },
            take: 1
          }
        }
      })

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      // Extract parents
      const profile = student.profile || {}
      const fatherPhone = (profile as any)?.fatherPhone || (profile as any)?.phone || ""
      const motherPhone = (profile as any)?.motherPhone || ""
      const primaryPhone = fatherPhone || motherPhone || (student as any)?.parentPhone || ""
      const parentName = (profile as any)?.fatherName || (profile as any)?.motherName || "Phụ huynh"

      // Check academic alerts
      const hasSupport = (student.learningSupportAssignments?.length || 0) > 0
      const hasPendingGoal = student.studentGoalUnlocks?.some(g => g.status === "PENDING")

      let alertStatus: "NORMAL" | "ATTENTION" | "URGENT" = "NORMAL"
      let alertReason = ""
      if (hasSupport) {
        alertStatus = "ATTENTION"
        alertReason = "Diện hỗ trợ học tập tăng cường"
      } else if (hasPendingGoal) {
        alertStatus = "ATTENTION"
        alertReason = "Chờ duyệt điều chỉnh mục tiêu"
      }

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          studentCode: student.studentCode,
          fullName: student.studentName,
          className: student.class?.className || (student as any).className || "",
          gender: student.gender || "Chưa rõ",
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "",
          parentName,
          fatherPhone,
          motherPhone,
          primaryPhone,
          alertStatus,
          alertReason,
          recentNotes: student.homeroomFeedback?.map(f => ({
            id: f.id,
            comment: f.comment,
            createdAt: f.createdAt.toLocaleDateString("vi-VN")
          })) || []
        }
      })
    }

    // Case 2: List Students for Class or Search
    let whereClause: any = {}
    if (classId) {
      whereClause.classId = classId
    } else if (teacher?.classes && teacher.classes.length > 0) {
      whereClause.classId = { in: teacher.classes.map(c => c.id) }
    }

    if (search) {
      whereClause.OR = [
        { studentName: { contains: search } },
        { studentCode: { contains: search } }
      ]
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        class: true,
        profile: true,
        learningSupportAssignments: {
          where: { target: { status: "ACTIVE" } }
        }
      },
      take: 40,
      orderBy: { studentName: "asc" }
    })

    const formattedList = students.map(s => {
      const profile = s.profile || {}
      const phone = (profile as any)?.fatherPhone || (profile as any)?.motherPhone || (profile as any)?.phone || (s as any)?.parentPhone || ""
      const parent = (profile as any)?.fatherName || (profile as any)?.motherName || "Phụ huynh"
      const hasSupport = (s.learningSupportAssignments?.length || 0) > 0

      return {
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.studentName,
        className: s.class?.className || (s as any).className || "",
        primaryPhone: phone,
        parentName: parent,
        hasAlert: hasSupport,
        alertText: hasSupport ? "Cần hỗ trợ học tập" : null
      }
    })

    return NextResponse.json({
      success: true,
      students: formattedList,
      total: formattedList.length
    })
  } catch (error) {
    console.error("[API PWA Students Summary GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
