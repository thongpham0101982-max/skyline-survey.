// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const classId = searchParams.get("classId")
    const subjectId = searchParams.get("subjectId")

    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      })
      targetYearId = activeYear?.id || ""
    }

    const locks = await prisma.gradebookLock.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod
      }
    })

    const periodLock = locks.find(l => l.classId === "ALL" && l.subjectId === "ALL" && Boolean(l.isLocked))
    const isPeriodLocked = Boolean(periodLock)

    let isItemLocked = false
    let currentLock = null

    if (classId && subjectId) {
      const itemLock = locks.find(l => l.classId === classId && l.subjectId === subjectId && Boolean(l.isLocked))
      if (itemLock || isPeriodLocked) {
        isItemLocked = true
        currentLock = itemLock || periodLock
      }
    }

    return NextResponse.json({
      success: true,
      evaluationPeriod,
      academicYearId: targetYearId,
      isPeriodLocked,
      isItemLocked,
      currentLock,
      locks
    })
  } catch (error: any) {
    console.error("Lỗi lấy trạng thái khóa sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userName = (session?.user as any)?.name || (session?.user as any)?.fullName || "Quản trị viên Khảo thí"
    
    const body = await request.json()
    const {
      academicYearId,
      evaluationPeriod = "KSĐN",
      classId = "ALL",
      subjectId = "ALL",
      isLocked = true,
      lockReason = "",
      batchItems = null // Array<{ classId: string; subjectId: string }>
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin năm học" }, { status: 400 })
    }

    const now = new Date()

    // Case 1: Batch locking/unlocking multiple class-subject pairs
    if (batchItems && Array.isArray(batchItems) && batchItems.length > 0) {
      const results = []
      for (const item of batchItems) {
        if (!item.classId || !item.subjectId) continue

        const record = await prisma.gradebookLock.upsert({
          where: {
            academicYearId_evaluationPeriod_classId_subjectId: {
              academicYearId,
              evaluationPeriod,
              classId: item.classId,
              subjectId: item.subjectId
            }
          },
          update: {
            isLocked: Boolean(isLocked),
            lockedBy: userName,
            lockedAt: isLocked ? now : null,
            lockReason: lockReason || (isLocked ? "Khóa sổ theo đợt" : "Mở khóa sổ")
          },
          create: {
            academicYearId,
            evaluationPeriod,
            classId: item.classId,
            subjectId: item.subjectId,
            isLocked: Boolean(isLocked),
            lockedBy: userName,
            lockedAt: isLocked ? now : null,
            lockReason: lockReason || (isLocked ? "Khóa sổ theo đợt" : "Mở khóa sổ")
          }
        })
        results.push(record)
      }

      return NextResponse.json({
        success: true,
        count: results.length,
        isLocked: Boolean(isLocked),
        message: isLocked
          ? `Đã khóa sổ ${results.length} phân công thành công!`
          : `Đã mở khóa sổ ${results.length} phân công thành công!`
      })
    }

    // Case 2: Single item or entire period lock
    const record = await prisma.gradebookLock.upsert({
      where: {
        academicYearId_evaluationPeriod_classId_subjectId: {
          academicYearId,
          evaluationPeriod,
          classId,
          subjectId
        }
      },
      update: {
        isLocked: Boolean(isLocked),
        lockedBy: userName,
        lockedAt: isLocked ? now : null,
        lockReason: lockReason || (isLocked ? "Khóa sổ điểm" : "Mở khóa sổ điểm")
      },
      create: {
        academicYearId,
        evaluationPeriod,
        classId,
        subjectId,
        isLocked: Boolean(isLocked),
        lockedBy: userName,
        lockedAt: isLocked ? now : null,
        lockReason: lockReason || (isLocked ? "Khóa sổ điểm" : "Mở khóa sổ điểm")
      }
    })

    return NextResponse.json({
      success: true,
      record,
      isLocked: Boolean(isLocked),
      message: isLocked
        ? (classId === "ALL" ? "Đã khóa sổ toàn bộ kỳ khảo sát!" : "Đã khóa sổ điểm môn học này!")
        : (classId === "ALL" ? "Đã mở khóa sổ toàn bộ kỳ khảo sát!" : "Đã mở khóa sổ điểm môn học này!")
    })

  } catch (error: any) {
    console.error("Lỗi cập nhật khóa sổ điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
