import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeacherAssessmentsClient from "./client"

export default async function TeacherAssessmentsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }
  
  const role = session.user.role;
  const isAuthorizedRole = role === "TEACHER" || role === "GV_MN" || role === "ADMIN" || role === "Teacher" || role === "Admin";
  
  if (!isAuthorizedRole) {
    try {
      const { prisma } = require("@/lib/db");
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
      if (!teacher) {
        redirect("/");
      }
    } catch (e) {
      redirect("/");
    }
  }

  return <TeacherAssessmentsClient user={session.user} />
}
