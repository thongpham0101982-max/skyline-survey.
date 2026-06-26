"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getAdminSession } from "@/lib/session"

export async function createUser(data: any) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    return { success: false, error: "Forbidden: Bạn không có quyền thực hiện hành động này." };
  }
  try {
    const passwordHash = await bcrypt.hash(data.password, 10);
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
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
          tx.userCampusAssignment.create({
            data: { userId: newUser.id, campusId: cid }
          })
        ));
      }

      if (data.roleCode === "TEACHER" || data.roleCode.includes("TEACHER")) {
        const defaultCampusId = data.campusIds && data.campusIds.length > 0 ? data.campusIds[0] : (await tx.campus.findFirst())?.id;
        if (defaultCampusId) {
          const existingTeacher = await tx.teacher.findUnique({ where: { teacherCode: data.employeeCode } });
          if (!existingTeacher) {
            await tx.teacher.create({
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
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (e: any) {
    console.error("Error in createUser action:", e);
    if (e.code === 'P2002') return { success: false, error: "Mã NV (Tài khoản) này đã tồn tại!" };
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi tạo tài khoản." };
  }
}

export async function updateUser(id: string, data: any) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    return { success: false, error: "Forbidden: Bạn không có quyền thực hiện hành động này." };
  }
  try {
    const updateData: any = {
      email: data.employeeCode,
      fullName: data.fullName,
      role: data.roleCode
    }
    if (data.password && data.password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: updateData
      });
      if (data.campusIds) {
        await tx.userCampusAssignment.deleteMany({ where: { userId: id } });
        if (data.campusIds.length > 0) {
          const uniqueCampusIds = Array.from(new Set(data.campusIds));
          await Promise.all(uniqueCampusIds.map((cid: any) => 
            tx.userCampusAssignment.create({
              data: { userId: id, campusId: cid }
            })
          ));
        }
      }

      const teacher = await tx.teacher.findFirst({ where: { userId: id } });
      if (teacher) {
        await tx.teacher.update({
          where: { id: teacher.id },
          data: {
            teacherName: data.fullName,
            teacherCode: data.employeeCode
          }
        });
      } else if (data.roleCode === "TEACHER" || data.roleCode.includes("TEACHER")) {
        const defaultCampusId = data.campusIds && data.campusIds.length > 0 ? data.campusIds[0] : (await tx.campus.findFirst())?.id;
        if (defaultCampusId) {
          const existingTeacher = await tx.teacher.findUnique({ where: { teacherCode: data.employeeCode } });
          if (!existingTeacher) {
            await tx.teacher.create({
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
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (e: any) {
    console.error("Error in updateUser action:", e);
    if (e.code === 'P2002') return { success: false, error: "Mã NV (Tài khoản) này đã bị trùng!" };
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi cập nhật tài khoản." };
  }
}

export async function deleteUser(id: string) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    return { success: false, error: "Forbidden: Bạn không có quyền thực hiện hành động này." };
  }
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    console.error("Error in deleteUser action:", e);
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi xóa tài khoản." };
  }
}

export async function deleteUsers(ids: string[]) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    return { success: false, error: "Forbidden: Bạn không có quyền thực hiện hành động này." };
  }
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
    console.error("Error in deleteUsers action:", e);
    if (e.code === 'P2003') {
        return { success: false, error: "Tài khoản đang có dữ liệu ràng buộc không thể xóa (đã xếp lớp, khảo sát, giao việc...). Hãy gỡ các dữ liệu này trước!" };
    }
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi xóa nhiều tài khoản." };
  }
}

export async function changeUserRoles(userIds: string[], targetRoleCode: string) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    return { success: false, error: "Forbidden: Bạn không có quyền thực hiện hành động này." };
  }
  try {
    // 1. Update the role in the User table for all selected user ids
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { role: targetRoleCode }
    });

    // 2. If the target role is TEACHER or GV_MN, ensure each user has a Teacher record
    if (targetRoleCode === "TEACHER" || targetRoleCode === "GV_MN") {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { teacher: true, campusAssignments: true }
      });

      const firstCampus = await prisma.campus.findFirst();
      const defaultCampusId = firstCampus?.id;

      for (const u of users) {
        if (!u.teacher) {
          const userCampusId = u.campusAssignments.length > 0 ? u.campusAssignments[0].campusId : defaultCampusId;
          if (userCampusId) {
            await prisma.teacher.create({
              data: {
                userId: u.id,
                teacherCode: u.email,
                teacherName: u.fullName,
                campusId: userCampusId,
                status: "ACTIVE"
              }
            });
          }
        }
      }
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (e: any) {
    console.error("Error in changeUserRoles action:", e);
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi thay đổi vai trò tài khoản." };
  }
}
