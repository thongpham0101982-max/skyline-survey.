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
      await prisma.permission.createMany({
        data: permissions.map(p => ({
          roleCode,
          module: p.module,
          canRead: p.canRead,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete
        }))
      })
    }
    revalidatePath("/admin/roles")
    return { success: true }
  } catch (e:any) {
    return { success: false, error: e.message }
  }
}
