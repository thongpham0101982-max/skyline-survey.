// @ts-nocheck
import { prisma } from "@/lib/db"
import { APP_CATEGORIES, ALL_APP_MODULES } from "@/config/modules"

/**
 * Normalizes role code variations (e.g. "BGH MN", "BGH_MN", "bgh mn", "ns", "NS")
 */
export function getRoleVariants(roleCode: string): string[] {
  const norm = (roleCode || "").trim()
  if (!norm) return []
  return Array.from(new Set([
    norm,
    norm.toUpperCase(),
    norm.toLowerCase(),
    norm.replace(/\s+/g, "_"),
    norm.replace(/_/g, " "),
    norm.toUpperCase().replace(/\s+/g, "_"),
    norm.toUpperCase().replace(/_/g, " ")
  ]))
}

/**
 * Retrieves all permission records for a given role code
 */
export async function getRolePermissions(roleCode: string): Promise<any[]> {
  const upper = (roleCode || "").toUpperCase().trim()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return ALL_APP_MODULES.map((m: any) => ({
      roleCode,
      module: m.code,
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true
    }))
  }

  const variants = getRoleVariants(roleCode)
  const pAny = prisma as any
  if (!pAny || !pAny.permission) return []

  try {
    return await pAny.permission.findMany({
      where: { roleCode: { in: variants } }
    })
  } catch (err) {
    console.error("Error fetching permissions for role:", roleCode, err)
    return []
  }
}

/**
 * Returns all module codes that this role is allowed to read.
 * Automatically marks parent module code as readable if any of its submodules are readable.
 */
export async function getRoleReadableModules(roleCode: string): Promise<string[]> {
  const upper = (roleCode || "").toUpperCase().trim()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return ALL_APP_MODULES.map((m: any) => m.code)
  }

  const permissions = await getRolePermissions(roleCode)
  const readableModules = new Set<string>(
    permissions.filter((p: any) => p.canRead).map((p: any) => p.module)
  )

  // Automatically grant parent module if any submodule is readable
  APP_CATEGORIES.forEach((cat: any) => {
    cat.modules.forEach((m: any) => {
      if (m.subModules && m.subModules.length > 0) {
        const hasReadableSub = m.subModules.some((sub: any) => readableModules.has(sub.code))
        if (hasReadableSub) {
          readableModules.add(m.code)
        }
      }
    })
  })

  return Array.from(readableModules)
}

/**
 * Determines the first permitted route (landing page) for a given role.
 * Scans APP_CATEGORIES in order to locate the first module or submodule with canRead permission.
 */
export async function getDefaultRouteForRole(roleCode: string): Promise<string | null> {
  const upper = (roleCode || "").toUpperCase().trim()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return "/admin"
  }
  if (["TEACHER", "GV_MN", "GVNN", "GV", "GIAO_VIEN"].includes(upper)) {
    return "/teacher"
  }

  const readable = await getRoleReadableModules(roleCode)
  if (!readable || readable.length === 0) {
    return null
  }

  // Scan through categories in order
  for (const cat of APP_CATEGORIES) {
    for (const m of cat.modules) {
      if (m.requiresAdmin && upper !== "ADMIN" && upper !== "SUPER_ADMIN") continue

      if (m.subModules && m.subModules.length > 0) {
        for (const sm of m.subModules) {
          if (readable.includes(sm.code)) {
            return sm.href || m.href
          }
        }
      }

      if (readable.includes(m.code)) {
        return m.href
      }
    }
  }

  return null
}

/**
 * Checks if a role has the specified permission for one or more modules.
 */
export async function hasModulePermission(
  roleCode: string,
  modules: string | string[],
  action: "canRead" | "canCreate" | "canUpdate" | "canDelete" = "canRead"
): Promise<boolean> {
  const upper = (roleCode || "").toUpperCase().trim()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return true
  }

  const moduleList = Array.isArray(modules) ? modules : [modules]
  const variants = getRoleVariants(roleCode)
  const pAny = prisma as any

  if (!pAny || !pAny.permission) return false

  try {
    const count = await pAny.permission.count({
      where: {
        roleCode: { in: variants },
        module: { in: moduleList },
        [action]: true
      }
    })

    if (count > 0) return true

    // Check if checking for a submodule and parent has read permission, or vice versa
    const readable = await getRoleReadableModules(roleCode)
    if (action === "canRead") {
      return moduleList.some(mod => readable.includes(mod))
    }
    return false
  } catch (err) {
    console.error("Error checking module permission:", roleCode, modules, err)
    return false
  }
}
