export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getRoleReadableModules, getDefaultRouteForRole } from "@/lib/permissions"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let roleCode = (session.user as any)?.role || "PARENT"
    if (session.user.id) {
      const { prisma } = await import("@/lib/db")
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      }).catch(() => null)
      if (dbUser?.role) {
        roleCode = dbUser.role
      }
    }

    const readableModules = await getRoleReadableModules(roleCode)
    const defaultRoute = await getDefaultRouteForRole(roleCode)

    return NextResponse.json({
      role: roleCode,
      readableModules,
      defaultRoute
    })
  } catch (e: any) {
    console.error("Error in /api/user-permissions:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
