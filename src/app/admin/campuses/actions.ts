"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createCampus(code: string, name: string, address?: string) {
  try {
    await prisma.campus.create({
      data: {
        campusCode: code,
        campusName: name,
        address: address,
        status: "ACTIVE"
      }
    });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateCampus(id: string, code: string, name: string, address?: string, status?: string) {
  try {
    await prisma.campus.update({
      where: { id },
      data: {
        campusCode: code,
        campusName: name,
        address: address,
        status: status || "ACTIVE"
      }
    });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCampus(id: string) {
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
