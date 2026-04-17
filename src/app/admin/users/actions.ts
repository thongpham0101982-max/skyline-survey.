"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function createUser(data: any) {
  try {
    const passwordHash = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: {
        email: data.employeeCode,
        fullName: data.fullName,
        passwordHash,
        role: data.roleCode,
        status: "ACTIVE"
      }
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: "Mã NV (Tài khoản) này đã tồn tại!" };
    return { success: false, error: e.message };
  }
}

export async function updateUser(id: string, data: any) {
  try {
    const updateData: any = {
      email: data.employeeCode,
      fullName: data.fullName,
      role: data.roleCode
    }
    if (data.password && data.password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    await prisma.user.update({
      where: { id },
      data: updateData
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: "Mã NV (Tài khoản) này đã bị trùng!" };
    return { success: false, error: e.message };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteUsers(ids: string[]) {
  try {
    // Clear nullable references first to help with cascade
    await prisma.workTask.updateMany({
      where: { assignedToUserId: { in: ids } },
      data: { assignedToUserId: null }
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    if (e.code === 'P2003') {
        return { success: false, error: "Tài khoản đang có dữ liệu ràng buộc không thể xóa (đã xếp lớp, khảo sát, giao việc...). Hãy gỡ các dữ liệu này trước!" };
    }
    return { success: false, error: e.message };
  }
}
