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
          parents: {
            include: {
              parent: {
                include: { user: true }
              }
            }
          },
          highlightComments: {
            take: 3,
            orderBy: { createdAt: "desc" }
          },
          goalUnlocks: {
            take: 1,
            orderBy: { createdAt: "desc" }
          },
          learningSupportTargets: {
            where: { status: "ACTIVE" },
            take: 1
          }
        }
      })

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      // Extract parents
      const firstParent = student.parents?.[0]?.parent?.user
      const fatherPhone = firstParent?.phone || (student as any)?.parentPhone || ""
      const motherPhone = ""
      const primaryPhone = fatherPhone || (student as any)?.parentPhone || ""
      const parentName = firstParent?.name || "Phụ huynh"

      // Check academic alerts
      const hasSupport = (student.learningSupportTargets?.length || 0) > 0
      const hasPendingGoal = student.goalUnlocks?.some(g => g.status === "PENDING")

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
          recentNotes: student.highlightComments?.map(f => ({
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
        parents: {
          include: {
            parent: {
              include: { user: true }
            }
          }
        },
        learningSupportTargets: {
          where: { status: "ACTIVE" }
        }
      },
      take: 40,
      orderBy: { studentName: "asc" }
    })

    const formattedList = students.map(s => {
      const firstParent = s.parents?.[0]?.parent?.user
      const phone = firstParent?.phone || (s as any)?.parentPhone || ""
      const parent = firstParent?.name || "Phụ huynh"
      const hasSupport = (s.learningSupportTargets?.length || 0) > 0

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
