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
  } else if (upperRole === "PARENT") {
    redirect("/parent")
  } else if (upperRole === "ADMIN" || upperRole === "SUPER_ADMIN") {
    redirect("/admin")
  } else {
    // Check if user is a teacher without any admin permissions
    try {
      const { prisma } = require("@/lib/db")
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
      if (teacher) {
        const readable = await getRoleReadableModules(role)
        if (readable.length === 0) {
          redirect("/teacher")
        }
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

    if (["TEACHER", "GV_MN"].includes(upperRole)) {
      redirect("/teacher")
    }

    redirect("/admin")
  }
}
