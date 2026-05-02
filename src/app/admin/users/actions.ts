"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function createUser(data: any) {
  try {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: data.employeeCode,
        fullName: data.fullName,
        passwordHash,
        role: data.roleCode,
        status: "ACTIVE"
      }
    });
    if (data.campusIds && data.campusIds.length > 0) {
      const uniqueCampusIds = Array.from(new Set(data.campusIds));
      await Promise.all(uniqueCampusIds.map((cid: any) => 
        prisma.userCampusAssignment.create({
          data: { userId: newUser.id, campusId: cid }
        })
      ));
    }

    if (data.roleCode === "TEACHER" || data.roleCode.includes("TEACHER")) {
      const defaultCampusId = data.campusIds && data.campusIds.length > 0 ? data.campusIds[0] : (await prisma.campus.findFirst())?.id;
      if (defaultCampusId) {
        const existingTeacher = await prisma.teacher.findUnique({ where: { teacherCode: data.employeeCode } });
        if (!existingTeacher) {
          await prisma.teacher.create({
            data: {
              userId: newUser.id,
              teacherCode: data.employeeCode,
              teacherName: data.fullName,
              campusId: defaultCampusId,
              status: "ACTIVE"
            }
          });
        }
      }
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/teachers");
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
    if (data.campusIds) {
      await prisma.userCampusAssignment.deleteMany({ where: { userId: id } });
      if (data.campusIds.length > 0) {
        const uniqueCampusIds = Array.from(new Set(data.campusIds));
        await Promise.all(uniqueCampusIds.map((cid: any) => 
          prisma.userCampusAssignment.create({
            data: { userId: id, campusId: cid }
          })
        ));
      }
    }

    const teacher = await prisma.teacher.findFirst({ where: { userId: id } });
    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          teacherName: data.fullName,
          teacherCode: data.employeeCode
        }
      });
    } else if (data.roleCode === "TEACHER" || data.roleCode.includes("TEACHER")) {
      const defaultCampusId = data.campusIds && data.campusIds.length > 0 ? data.campusIds[0] : (await prisma.campus.findFirst())?.id;
      if (defaultCampusId) {
        const existingTeacher = await prisma.teacher.findUnique({ where: { teacherCode: data.employeeCode } });
        if (!existingTeacher) {
          await prisma.teacher.create({
            data: {
              userId: id,
              teacherCode: data.employeeCode,
              teacherName: data.fullName,
              campusId: defaultCampusId,
              status: "ACTIVE"
            }
          });
        }
      }
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/teachers");
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
