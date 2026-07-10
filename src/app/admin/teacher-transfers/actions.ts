"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/audit"

/**
 * Lấy dữ liệu cho màn hình kết chuyển nhân sự.
 * Trả về:
 *  - sourceTeachers: GV thuộc năm nguồn (có target record ở năm nguồn, hoặc tất cả GV ACTIVE)
 *  - transferredTeachers: GV đã có target record ở năm đích
 */
export async function getTeacherTransferDataAction(fromYearId: string, toYearId: string) {
  try {
    // Lấy tất cả GV kèm thông tin campus, department
    const allTeachers = await prisma.teacher.findMany({
      orderBy: { teacherName: "asc" },
      include: {
        campus: { select: { campusName: true, campusCode: true } },
        departmentRel: { select: { name: true } },
        mainSubjectRel: { select: { subjectName: true } },
        academicYearTargets: {
          where: { academicYearId: { in: [fromYearId, toYearId] } },
          select: { academicYearId: true }
        }
      }
    })

    const transferredSet = new Set(
      allTeachers
        .filter(t => t.academicYearTargets.some(y => y.academicYearId === toYearId))
        .map(t => t.id)
    )

    const map = (t: any) => ({
      id: t.id,
      teacherCode: t.teacherCode,
      teacherName: t.teacherName,
      campus: t.campus?.campusName || null,
      campusCode: t.campus?.campusCode || null,
      department: t.departmentRel?.name || null,
      mainSubject: t.mainSubjectRel?.subjectName || null,
      status: t.status,
      position: t.position || "GV",
    })

    return {
      sourceTeachers: allTeachers.filter(t => !transferredSet.has(t.id)).map(map),
      transferredTeachers: allTeachers.filter(t => transferredSet.has(t.id)).map(map),
    }
  } catch (e: any) {
    console.error("getTeacherTransferDataAction error:", e)
    return { sourceTeachers: [], transferredTeachers: [] }
  }
}

/**
 * Kết chuyển danh sách GV sang năm học đích:
 * 1. Tạo TeacherAcademicYearTarget cho năm đích (nếu chưa có)
 * 2. Đặt status = ACTIVE cho các GV được kết chuyển
 */
export async function transferTeachersToYearAction(teacherIds: string[], toYearId: string) {
  try {
    if (!teacherIds.length) return { success: false, error: "Chưa chọn giáo viên nào" }
    if (!toYearId) return { success: false, error: "Chưa chọn năm học đích" }

    const session = await auth()

    const uniqueTeacherIds = Array.from(new Set(teacherIds))

    // Lấy danh sách teachers đã có target trong năm đích
    const existingTargets = await prisma.teacherAcademicYearTarget.findMany({
      where: {
        teacherId: { in: uniqueTeacherIds },
        academicYearId: toYearId,
      },
      select: { teacherId: true }
    })
    const existingSet = new Set(existingTargets.map(t => t.teacherId))

    const toCreate = uniqueTeacherIds.filter(id => !existingSet.has(id))

    await prisma.$transaction(async (tx) => {
      // 1. Tạo target records cho năm mới
      if (toCreate.length > 0) {
        for (const teacherId of toCreate) {
          await tx.teacherAcademicYearTarget.create({
            data: {
              teacherId,
              academicYearId: toYearId,
              requiredObserved: 0,
              requiredTaught: 0,
              confirmed: false,
            }
          })
        }
      }

      // 2. Kích hoạt lại GV nếu đang INACTIVE
      await tx.teacher.updateMany({
        where: { id: { in: uniqueTeacherIds }, status: "INACTIVE" },
        data: { status: "ACTIVE" }
      })
    })

    await logActivity(
      (session?.user as any)?.id || "SYSTEM",
      (session?.user as any)?.email || "SYSTEM",
      "TRANSFER_TEACHERS_TO_YEAR",
      "Teacher",
      "BATCH",
      null,
      { teacherIds, toYearId, count: teacherIds.length }
    )

    revalidatePath("/admin/teacher-transfers")
    revalidatePath("/admin/teachers")
    return { success: true, transferred: teacherIds.length }
  } catch (e: any) {
    console.error("transferTeachersToYearAction error:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Xoá bỏ kết chuyển GV (xóa target record tại năm đích)
 */
export async function removeTeacherTransferAction(teacherIds: string[], toYearId: string) {
  try {
    if (!teacherIds.length) return { success: false, error: "Chưa chọn giáo viên nào" }
    if (!toYearId) return { success: false, error: "Chưa chọn năm học đích" }

    await prisma.teacherAcademicYearTarget.deleteMany({
      where: {
        teacherId: { in: teacherIds },
        academicYearId: toYearId,
      }
    })

    revalidatePath("/admin/teacher-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("removeTeacherTransferAction error:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Lấy danh sách năm học
 */
export async function getAcademicYearsAction() {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true, isOff: true }
    })
    return years
  } catch (e: any) {
    return []
  }
}
