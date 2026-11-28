"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"
import { writeSecurityAuditLog } from "@/lib/security-guard"

async function assertFullAdminAccess() {
  const session = await getAdminSession()
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Chỉ Quản trị viên cấp cao mới có quyền thay đổi phân quyền hệ thống.")
  }
  return session
}

export async function createRole(code: string, name: string, desc: string) {
  try {
    const session = await assertFullAdminAccess()
    await prisma.role.create({ data: { code, name, description: desc } })
    await writeSecurityAuditLog({
      userId: session.userId,
      userEmail: session.role || "ADMIN",
      action: "CREATE_ROLE",
      targetTable: "Role",
      targetId: code,
      newValues: { code, name, description: desc }
    })
    revalidatePath("/admin/roles")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateRole(code: string, name: string, desc: string) {
  try {
    const session = await assertFullAdminAccess()
    await prisma.role.update({ where: { code }, data: { name, description: desc } })
    await writeSecurityAuditLog({
      userId: session.userId,
      userEmail: session.role || "ADMIN",
      action: "UPDATE_ROLE",
      targetTable: "Role",
      targetId: code,
      newValues: { code, name, description: desc }
    })
    revalidatePath("/admin/roles")
    return { success: true }
  } catch(e:any) {
    return { success: false, error: e.message }
  }
}

export async function savePermissions(roleCode: string, permissions: any[]) {
  try {
    const session = await assertFullAdminAccess()
    // Drop all old and set new to avoid duplicate keys
    await prisma.permission.deleteMany({ where: { roleCode } })

    // Also ensure roleCode variations (e.g. "BGH MN" vs "BGH_MN") are synced ONLY if the alternate role actually exists in the database
    const altRoleCode = roleCode.includes(" ") ? roleCode.replace(/\s+/g, "_") : roleCode.includes("_") ? roleCode.replace(/_/g, " ") : null;
    let altRoleExists = false;
    if (altRoleCode && altRoleCode !== roleCode) {
      const altRole = await prisma.role.findUnique({ where: { code: altRoleCode } });
      if (altRole) {
        altRoleExists = true;
        await prisma.permission.deleteMany({ where: { roleCode: altRoleCode } });
      }
    }

    if (permissions.length > 0) {
      // Defensive: Filter out any permissions without a valid module code before saving
      const validPermissions = permissions.filter(p => !!p.module);
      
      // Deduplicate and merge permissions by module to prevent duplicate key constraint violations
      const mergedPermissionsMap = new Map<string, any>();
      for (const p of validPermissions) {
        const existing = mergedPermissionsMap.get(p.module);
        if (existing) {
          existing.canRead = existing.canRead || !!p.canRead;
          existing.canCreate = existing.canCreate || !!p.canCreate;
          existing.canUpdate = existing.canUpdate || !!p.canUpdate;
          existing.canDelete = existing.canDelete || !!p.canDelete;
        } else {
          mergedPermissionsMap.set(p.module, {
            module: p.module,
            canRead: !!p.canRead,
            canCreate: !!p.canCreate,
            canUpdate: !!p.canUpdate,
            canDelete: !!p.canDelete
          });
        }
      }

      // Automatically sync parent module permissions if any submodule has permission
      const { APP_CATEGORIES } = require("@/config/modules");
      APP_CATEGORIES.forEach((cat: any) => {
        cat.modules.forEach((m: any) => {
          if (m.subModules && m.subModules.length > 0) {
            const subCodes = m.subModules.map((sm: any) => sm.code);
            const activeSubs = Array.from(mergedPermissionsMap.values()).filter((p: any) => subCodes.includes(p.module));
            const hasRead = activeSubs.some((p: any) => p.canRead);
            const hasCreate = activeSubs.some((p: any) => p.canCreate);
            const hasUpdate = activeSubs.some((p: any) => p.canUpdate);
            const hasDelete = activeSubs.some((p: any) => p.canDelete);

            if (hasRead || hasCreate || hasUpdate || hasDelete) {
              const parent = mergedPermissionsMap.get(m.code) || {
                module: m.code,
                canRead: false,
                canCreate: false,
                canUpdate: false,
                canDelete: false
              };
              if (hasRead) parent.canRead = true;
              if (hasCreate) parent.canCreate = true;
              if (hasUpdate) parent.canUpdate = true;
              if (hasDelete) parent.canDelete = true;
              mergedPermissionsMap.set(m.code, parent);
            }
          }
        });
      });

      await Promise.all(Array.from(mergedPermissionsMap.values()).map(p => prisma.permission.create({
        data: {
          roleCode,
          module: p.module,
          canRead: p.canRead,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete
        }
      })));

      // Sync to alternate role code only if it exists in the database
      if (altRoleExists && altRoleCode) {
        await Promise.all(Array.from(mergedPermissionsMap.values()).map(p => prisma.permission.create({
          data: {
            roleCode: altRoleCode,
            module: p.module,
            canRead: p.canRead,
            canCreate: p.canCreate,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete
          }
        })));
      }
    }
    await writeSecurityAuditLog({
      userId: session.userId,
      userEmail: session.role || "ADMIN",
      action: "UPDATE_ROLE_PERMISSIONS",
      targetTable: "Permission",
      targetId: roleCode,
      newValues: { roleCode, permissionCount: permissions.length }
    })
    revalidatePath("/admin/roles")
    revalidatePath("/admin/xet-duyet-ket-qua")
    revalidatePath("/admin", "layout")
    return { success: true }
  } catch (e:any) {
    return { success: false, error: e.message }
  }
}

export async function deleteRole(code: string) {
  try {
    const session = await assertFullAdminAccess()
    if (code === 'ADMIN' || code === 'TEACHER' || code === 'PARENT') {
       return { success: false, error: 'Không thể xóa nhóm quyền hệ thống này.' };
    }
    await prisma.role.delete({ where: { code } });
    await writeSecurityAuditLog({
      userId: session.userId,
      userEmail: session.role || "ADMIN",
      action: "DELETE_ROLE",
      targetTable: "Role",
      targetId: code
    });
    revalidatePath("/admin/roles");
    return { success: true };
  } catch(e:any) {
    return { success: false, error: e.message };
  }
}
