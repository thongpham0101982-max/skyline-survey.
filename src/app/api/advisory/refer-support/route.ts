import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401)

    const currentUserId = (session.user as any)?.id || ""
    const teacher = await prisma.teacher.findUnique({
      where: { userId: currentUserId }
    }).catch(() => null)

    const teacherId = teacher ? teacher.id : null

    const body = await req.json()
    const {
      studentId,
      academicYearId,
      supportType, // "ACADEMIC" hoặc "PSYCHOLOGICAL"
      reason,
      notes,
      subjectId,
      academicTopic
    } = body

    if (!studentId || !supportType || !reason) {
      return jsonResponse({ error: "Thiếu thông tin bắt buộc: studentId, supportType, reason" }, 400)
    }

    // Kiểm tra xem đã có ca hỗ trợ loại này chưa
    const existingTarget = await prisma.learningSupportTarget.findFirst({
      where: {
        studentId,
        supportType,
        academicYearId: academicYearId || undefined,
        terminationStatus: "ACTIVE"
      }
    })

    let target
    if (existingTarget) {
      // Cập nhật bổ sung ghi chú từ CVHT
      target = await prisma.learningSupportTarget.update({
        where: { id: existingTarget.id },
        data: {
          notes: existingTarget.notes ? `${existingTarget.notes}\n[CVHT cập nhật]: ${notes || reason}` : notes || reason,
          academicTopic: academicTopic || existingTarget.academicTopic
        }
      })
    } else {
      // Tạo mới ca hỗ trợ học tập
      target = await prisma.learningSupportTarget.create({
        data: {
          studentId,
          academicYearId: academicYearId || "",
          supportType,
          sourceType: "GVCN", // hoặc CVHT
          status: "ACTIVE",
          terminationStatus: "ACTIVE",
          reason,
          notes: notes ? `[CVHT chuyển ca]: ${notes}` : `[CVHT chuyển ca]: ${reason}`,
          createdById: teacherId,
          academicTopic: academicTopic || null
        }
      })
    }

    // Ghi nhận vào nhật ký kiểm toán (AuditLog)
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        userEmail: (session.user as any)?.email || "N/A",
        action: "REFER_LEARNING_SUPPORT",
        targetTable: "LearningSupportTarget",
        targetId: target.id,
        newValues: JSON.stringify({
          studentId,
          supportType,
          reason,
          createdById: teacherId
        })
      }
    }).catch(() => {})

    return jsonResponse({
      success: true,
      message: `Đã chuyển ca sang phân hệ Hỗ trợ ${supportType === "PSYCHOLOGICAL" ? "Tâm lý học đường" : "Học thuật"} thành công!`,
      targetId: target.id
    })
  } catch (error: any) {
    console.error("POST /api/advisory/refer-support error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
