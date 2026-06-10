import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeacherAssessmentsClient from "./client"
import { Suspense } from "react"

export default async function TeacherAssessmentsPage() {
  const session = await auth()
  
  if (!session || !session.user) {
    redirect("/login")
  }
  
  const role = ((session.user as any)?.role || "");
  if (role !== "TEACHER" && role !== "ADMIN" && role !== "Teacher" && role !== "Admin") {
    redirect("/")
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải...</div>}>
      <TeacherAssessmentsClient user={session.user} />
    </Suspense>
  )
}
