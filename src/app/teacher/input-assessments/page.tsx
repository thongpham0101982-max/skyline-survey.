import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeacherAssessmentsClient from "./client"

export default async function TeacherAssessmentsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }
  
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "Teacher" && session.user.role !== "Admin") {
    redirect("/")
  }

  return <TeacherAssessmentsClient user={session.user} />
}
