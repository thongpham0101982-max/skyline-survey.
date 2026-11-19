import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function TeachingPlanRedirectPage() {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }
  const role = String((session.user as any)?.role || "").toUpperCase().trim()
  if (role === "TEACHER") {
    redirect("/teacher/ke-hoach-day-hoc")
  }
  redirect("/admin/ke-hoach-day-hoc")
}
