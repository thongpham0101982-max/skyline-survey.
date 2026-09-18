"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { z } from "zod"

async function checkAdminAuth() {
  const session = await auth()
  if (!session || !session.user) {
    return { error: "Unauthorized: Vui lòng đăng nhập" }
  }
  const role = ((session.user as any)?.role || "").toUpperCase()
  const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN"].includes(role)
  if (!isAllowed) {
    return { error: "Forbidden: Bạn không có quyền quản lý cơ sở" }
  }
  return { session }
}

const CampusInputSchema = z.object({
  code: z.string().trim().min(2, "Mã cơ sở phải có ít nhất 2 ký tự").max(30, "Mã cơ sở tối đa 30 ký tự"),
  name: z.string().trim().min(2, "Tên cơ sở phải có ít nhất 2 ký tự").max(100, "Tên cơ sở tối đa 100 ký tự"),
  address: z.string().trim().max(255).optional().nullable(),
  managerId: z.string().trim().optional().nullable()
})

export async function createCampus(code: string, name: string, address?: string, managerId?: string) {
  const authCheck = await checkAdminAuth()
  if (authCheck.error) return { success: false, error: authCheck.error }

  const parsed = CampusInputSchema.safeParse({ code, name, address, managerId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }
  }

  const cleanCode = parsed.data.code.toUpperCase()
  const cleanName = parsed.data.name

  try {
    const existing = await prisma.campus.findFirst({
      where: {
        OR: [
          { campusCode: cleanCode },
          { campusName: cleanName }
        ]
      }
    })
    if (existing) {
      if (existing.campusCode === cleanCode) {
        return { success: false, error: `Mã cơ sở "${cleanCode}" đã tồn tại.` }
      }
      return { success: false, error: `Tên cơ sở "${cleanName}" đã tồn tại.` }
    }

    await prisma.campus.create({
      data: {
        campusCode: cleanCode,
        campusName: cleanName,
        address: parsed.data.address || null,
        status: "ACTIVE",
        managerId: parsed.data.managerId || null
      }
    });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateCampus(id: string, code: string, name: string, address?: string, status?: string, managerId?: string) {
  const authCheck = await checkAdminAuth()
  if (authCheck.error) return { success: false, error: authCheck.error }

  if (!id) return { success: false, error: "Thiếu ID cơ sở" }

  const parsed = CampusInputSchema.safeParse({ code, name, address, managerId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }
  }

  const cleanCode = parsed.data.code.toUpperCase()
  const cleanName = parsed.data.name

  try {
    const duplicate = await prisma.campus.findFirst({
      where: {
        id: { not: id },
        OR: [
          { campusCode: cleanCode },
          { campusName: cleanName }
        ]
      }
    })
    if (duplicate) {
      if (duplicate.campusCode === cleanCode) {
        return { success: false, error: `Mã cơ sở "${cleanCode}" đã được sử dụng ở cơ sở khác.` }
      }
      return { success: false, error: `Tên cơ sở "${cleanName}" đã được sử dụng ở cơ sở khác.` }
    }

    await prisma.campus.update({
      where: { id },
      data: {
        campusCode: cleanCode,
        campusName: cleanName,
        address: parsed.data.address || null,
        status: status || "ACTIVE",
        managerId: parsed.data.managerId || null
      }
    });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCampus(id: string) {
  const authCheck = await checkAdminAuth()
  if (authCheck.error) return { success: false, error: authCheck.error }

  try {
    const classCount = await prisma.class.count({ where: { campusId: id } });
    const teacherCount = await prisma.teacher.count({ where: { campusId: id } });
    const studentCount = await prisma.student.count({ where: { campusId: id } });
    
    if (classCount > 0 || teacherCount > 0 || studentCount > 0) {
      return { success: false, error: "Không thể xóa cơ sở đang có dữ liệu liên quan (lớp học, giáo viên hoặc học sinh)!" };
    }

    await prisma.campus.delete({ where: { id } });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
