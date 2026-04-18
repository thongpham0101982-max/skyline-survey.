"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createCampus(code: string, name: string, address?: string) {
  try {
    await prisma.campus.create({
      data: {
        campusCode: code,
        name: name,
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
        name: name,
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
    // Check if there are classes or teachers linked to this campus
    const classCount = await (prisma as any).class.count({ where: { campusId: id } });
    const teacherCount = await (prisma as any).teacher.count({ where: { campusId: id } });
    
    if (classCount > 0 || teacherCount > 0) {
      return { success: false, error: "Không thể xóa cơ sở đang có lớp học hoặc giáo viên!" };
    }

    await prisma.campus.delete({ where: { id } });
    revalidatePath("/admin/campuses");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
