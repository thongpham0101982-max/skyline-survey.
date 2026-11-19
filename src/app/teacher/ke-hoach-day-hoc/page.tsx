import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { TeachingPlanWorkspace } from "@/components/teaching-plan/TeachingPlanWorkspace"

export const dynamic = "force-dynamic"

export default async function TeacherTeachingPlanPage() {
  const session = await auth()
  if (!session) redirect("/login")
  return <TeachingPlanWorkspace />
}
