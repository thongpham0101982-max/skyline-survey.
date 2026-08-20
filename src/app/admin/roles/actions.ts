"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createRole(code: string, name: string, desc: string) {
  try {
    await prisma.role.create({ data: { code, name, description: desc } })
    revalidatePath("/admin/roles")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateRole(code: string, name: string, desc: string) {
  try {
    await prisma.role.update({ where: { code }, data: { name, description: desc } })
    revalidatePath("/admin/roles")
    return { success: true }
  } catch(e:any) {
    return { success: false, error: e.message }
  }
}

export async function savePermissions(roleCode: string, permissions: any[]) {
  try {
    // Drop all old and set new to avoid duplicate keys
    await prisma.permission.deleteMany({ where: { roleCode } })
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

      // Also ensure roleCode variations (e.g. "BGH MN" vs "BGH_MN") are synced if roleCode has spaces/underscores
      const altRoleCode = roleCode.includes(" ") ? roleCode.replace(/\s+/g, "_") : roleCode.includes("_") ? roleCode.replace(/_/g, " ") : null;
      if (altRoleCode && altRoleCode !== roleCode) {
        await prisma.permission.deleteMany({ where: { roleCode: altRoleCode } });
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
    if (code === 'ADMIN' || code === 'TEACHER' || code === 'PARENT') {
       return { success: false, error: 'Không thể xóa nhóm quyền hệ thống này.' };
    }
    await prisma.role.delete({ where: { code } });
    revalidatePath("/admin/roles");
    return { success: true };
  } catch(e:any) {
    return { success: false, error: e.message };
  }
}
