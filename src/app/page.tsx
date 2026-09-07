export const dynamic = "force-dynamic"
export const revalidate = 0
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDefaultRouteForRole, getRoleReadableModules } from "@/lib/permissions"

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  let role = (session.user as any)?.role || "PARENT"
  try {
    const { prisma } = require("@/lib/db")
    if (session.user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })
      if (dbUser?.role) {
        role = dbUser.role
      }
    }
  } catch (e) {}

  const upperRole = role.toUpperCase().trim()
  
  if (upperRole === "STUDENT") {
    redirect("/hocsinh/hs-khaosat/danh-sach")
  } else if (["TEACHER", "GV_MN", "GVNN", "GV", "GIAO_VIEN"].includes(upperRole)) {
    redirect("/teacher")
  } else if (upperRole === "PARENT") {
    redirect("/parent")
  } else if (upperRole === "ADMIN" || upperRole === "SUPER_ADMIN") {
    redirect("/admin")
  } else {
    // Check if user has a teacher profile and is not a management role
    try {
      const { prisma } = require("@/lib/db")
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
      const adminRoles = ["ADMIN", "NS", "GDCS", "GĐCS", "BGH_MN", "BGH MN", "GIAO_VU", "ĐBCL", "KHAO_THI", "CTHS", "TVAN"]
      if (teacher && !adminRoles.includes(upperRole)) {
        redirect("/teacher")
      }
    } catch (e: any) {
      if (e?.digest?.includes("NEXT_REDIRECT")) throw e
      console.error("Teacher check in Home:", e)
    }

    // Determine default landing page based on database permissions
    const defaultRoute = await getDefaultRouteForRole(role)
    if (defaultRoute) {
      redirect(defaultRoute)
    }

    redirect("/admin")
  }
}
